import { AuthenticationStrategy, ExternalAuthenticationService, Injector, RequestContext, User } from '@vendure/core';
import { GoogleAuthService } from './google-auth.service';

export interface GoogleAuthenticationData {
    token: string;
}

const { parse } = require('graphql') as { parse: (source: string) => unknown };

export class GoogleAuthenticationStrategy implements AuthenticationStrategy<GoogleAuthenticationData> {
    readonly name = 'google';

    private googleAuthService!: GoogleAuthService;
    private externalAuthenticationService!: ExternalAuthenticationService;

    async init(injector: Injector): Promise<void> {
        this.googleAuthService = injector.get(GoogleAuthService);
        this.externalAuthenticationService = injector.get(ExternalAuthenticationService);
    }

    defineInputType(): any {
        return parse(`
            input GoogleAuthInput {
                token: String!
            }
        `);
    }

    async authenticate(ctx: RequestContext, data: GoogleAuthenticationData): Promise<User | false | string> {
        if (!this.googleAuthService.isEnabled()) {
            return 'Google OAuth no está configurado.';
        }

        if (!data?.token?.trim()) {
            return 'Falta el token de Google.';
        }

        try {
            const profile = await this.googleAuthService.verifyIdToken(data.token.trim());
            const existingUser = await this.externalAuthenticationService.findCustomerUser(
                ctx,
                this.name,
                profile.sub,
            );

            if (existingUser) {
                return existingUser;
            }

            return this.externalAuthenticationService.createCustomerAndUser(ctx, {
                strategy: this.name,
                externalIdentifier: profile.sub,
                verified: profile.emailVerified,
                emailAddress: profile.email,
                firstName: profile.firstName,
                lastName: profile.lastName,
            });
        } catch (error) {
            return error instanceof Error ? error.message : 'No se pudo autenticar con Google.';
        }
    }
}
