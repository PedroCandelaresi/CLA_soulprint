import { randomBytes } from 'crypto';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
    Allow,
    ConfigService,
    Customer,
    Ctx,
    CustomerService,
    NativeAuthenticationMethod,
    Permission,
    PluginCommonModule,
    RequestContext,
    SessionService,
    TransactionalConnection,
    User,
    UserService,
    UserInputError,
    VendurePlugin,
} from '@vendure/core';
import { gql } from 'graphql-tag';

function normalizeEmailAddress(emailAddress: string): string {
    return emailAddress.trim().toLowerCase();
}

function createTemporaryPassword(): string {
    return `Mx!${randomBytes(18).toString('hex')}9a`;
}

@Resolver()
class CustomerAdminResolver {
    constructor(
        private readonly configService: ConfigService,
        private readonly connection: TransactionalConnection,
        private readonly customerService: CustomerService,
        private readonly sessionService: SessionService,
        private readonly userService: UserService,
    ) {}

    @Mutation()
    @Allow(Permission.UpdateCustomer)
    async adminSetCustomerPassword(
        @Ctx() ctx: RequestContext,
        @Args('customerId') customerId: string,
        @Args('password') password: string,
        @Args('invalidateExistingSessions') invalidateExistingSessions: boolean = true,
    ): Promise<{ success: true }> {
        const customer = await this.customerService.findOne(ctx, customerId, ['user', 'user.authenticationMethods']);
        if (!customer) {
            throw new UserInputError('No encontramos el cliente indicado.');
        }

        const normalizedEmail = normalizeEmailAddress(customer.emailAddress || '');
        if (!normalizedEmail) {
            throw new UserInputError('El cliente no tiene un email válido para asociar el acceso.');
        }

        const validationResult = await this.configService.authOptions.passwordValidationStrategy.validate(
            ctx,
            password,
        );
        if (validationResult !== true) {
            throw new UserInputError(
                typeof validationResult === 'string'
                    ? validationResult
                    : 'La contraseña no cumple con las reglas configuradas.',
            );
        }

        let user = customer.user;
        if (!user) {
            const createdUser = await this.userService.createCustomerUser(ctx, normalizedEmail, password);
            if (!('id' in createdUser)) {
                throw new UserInputError(
                    ('validationErrorMessage' in createdUser && createdUser.validationErrorMessage) ||
                        'No se pudo crear el acceso del cliente.',
                );
            }

            user = createdUser;
            customer.user = user;
            await this.connection.getRepository(ctx, Customer).save(customer, { reload: false });
        }

        let nativeAuthMethod = user.getNativeAuthenticationMethod(false);
        if (!nativeAuthMethod) {
            const nativeAuthUser = await this.userService.addNativeAuthenticationMethod(
                ctx,
                user,
                normalizedEmail,
                password,
            );
            if (!('id' in nativeAuthUser)) {
                throw new UserInputError(
                    ('validationErrorMessage' in nativeAuthUser && nativeAuthUser.validationErrorMessage) ||
                        'No se pudo agregar la autenticación nativa.',
                );
            }

            user = nativeAuthUser;
            nativeAuthMethod = user.getNativeAuthenticationMethod(false);
        }

        if (!nativeAuthMethod) {
            nativeAuthMethod = new NativeAuthenticationMethod();
            nativeAuthMethod.identifier = normalizedEmail;
            nativeAuthMethod.user = user;
        }

        nativeAuthMethod.passwordHash =
            await this.configService.authOptions.passwordHashingStrategy.hash(password);
        nativeAuthMethod.identifier = normalizedEmail;
        nativeAuthMethod.verificationToken = null;
        nativeAuthMethod.passwordResetToken = null;
        nativeAuthMethod.identifierChangeToken = null;
        nativeAuthMethod.pendingIdentifier = null;
        user.verified = true;
        user.identifier = normalizedEmail;

        await this.connection.getRepository(ctx, NativeAuthenticationMethod).save(nativeAuthMethod, { reload: false });
        await this.connection.getRepository(ctx, User).save(user, { reload: false });

        if (invalidateExistingSessions) {
            await this.sessionService.deleteSessionsByUser(ctx, user);
        }

        return { success: true };
    }
}

@Resolver()
class CustomerShopResolver {
    constructor(
        private readonly configService: ConfigService,
        private readonly customerService: CustomerService,
        private readonly userService: UserService,
    ) {}

    @Mutation()
    @Allow(Permission.Public)
    async recoverCustomerAccess(
        @Ctx() ctx: RequestContext,
        @Args('emailAddress') emailAddress: string,
    ): Promise<{ success: true }> {
        const normalizedEmail = normalizeEmailAddress(emailAddress);
        if (!normalizedEmail) {
            return { success: true };
        }

        const existingUser = await this.userService.getUserByEmailAddress(ctx, normalizedEmail, 'customer');
        if (existingUser) {
            if (existingUser.verified) {
                await this.customerService.requestPasswordReset(ctx, normalizedEmail);
            } else {
                await this.customerService.refreshVerificationToken(ctx, normalizedEmail);
            }

            return { success: true };
        }

        const customers = await this.customerService.findAll(ctx, {
            filter: { emailAddress: { eq: normalizedEmail } },
            take: 1,
        });
        const customer = customers.items[0];

        if (!customer) {
            return { success: true };
        }

        const requireVerification = this.configService.authOptions.requireVerification;
        const registerResult = await this.customerService.registerCustomerAccount(ctx, {
            emailAddress: normalizedEmail,
            title: customer.title || undefined,
            firstName: customer.firstName || undefined,
            lastName: customer.lastName || undefined,
            phoneNumber: customer.phoneNumber || undefined,
            ...(requireVerification ? {} : { password: createTemporaryPassword() }),
        });

        if (!('success' in registerResult) || registerResult.success !== true) {
            throw registerResult;
        }

        if (!requireVerification) {
            await this.customerService.requestPasswordReset(ctx, normalizedEmail);
        }

        return { success: true };
    }
}

@VendurePlugin({
    imports: [PluginCommonModule],
    adminApiExtensions: {
        schema: gql`
            extend type Mutation {
                adminSetCustomerPassword(
                    customerId: ID!
                    password: String!
                    invalidateExistingSessions: Boolean = true
                ): Success!
            }
        `,
        resolvers: [CustomerAdminResolver],
    },
    shopApiExtensions: {
        schema: gql`
            extend type Mutation {
                recoverCustomerAccess(emailAddress: String!): Success!
            }
        `,
        resolvers: [CustomerShopResolver],
    },
})
export class CustomerAccessPlugin {}
