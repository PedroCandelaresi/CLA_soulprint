import { Injectable } from '@nestjs/common';
import { DeletionResponse, DeletionResult } from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import {
    Asset,
    ListQueryBuilder,
    ListQueryOptions,
    RequestContext,
    TransactionalConnection,
    UserInputError,
} from '@vendure/core';
import { Badge } from './badge.entity';
import { BadgeTemplateService } from './badge-template.service';

export interface CreateBadgeInput {
    name: string;
    code: string;
    enabled?: boolean | null;
    priority?: number | null;
    backgroundColor?: string | null;
    textColor?: string | null;
    expiresAt?: Date | null;
    featuredAssetId?: ID | null;
    templateId?: ID | null;
    templateParams?: string | null;
}

export interface UpdateBadgeInput {
    id: ID;
    name?: string | null;
    code?: string | null;
    enabled?: boolean | null;
    priority?: number | null;
    backgroundColor?: string | null;
    textColor?: string | null;
    expiresAt?: Date | null;
    featuredAssetId?: ID | null;
    templateId?: ID | null;
    templateParams?: string | null;
}

@Injectable()
export class BadgeService {
    constructor(
        private readonly connection: TransactionalConnection,
        private readonly listQueryBuilder: ListQueryBuilder,
        private readonly badgeTemplateService: BadgeTemplateService,
    ) {}

    async findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<Badge>,
    ): Promise<PaginatedList<Badge>> {
        const qb = this.listQueryBuilder.build(Badge, options, {
            ctx,
            relations: ['featuredAsset'],
        });

        if (!options?.sort) {
            qb.addOrderBy('badge.priority', 'ASC').addOrderBy('badge.createdAt', 'DESC');
        }

        const [items, totalItems] = await qb.getManyAndCount();
        return { items, totalItems };
    }

    findOne(ctx: RequestContext, id: ID): Promise<Badge | null> {
        return this.connection.getRepository(ctx, Badge).findOne({
            where: { id },
            relations: ['featuredAsset'],
        });
    }

    async create(ctx: RequestContext, input: CreateBadgeInput): Promise<Badge> {
        const repo = this.connection.getRepository(ctx, Badge);
        const badge = new Badge({
            name: requireNonEmptyString(input.name, 'name'),
            code: requireNonEmptyString(input.code, 'code'),
            enabled: input.enabled ?? true,
            priority: input.priority ?? 0,
            backgroundColor: normalizeNullableString(input.backgroundColor) ?? null,
            textColor: normalizeNullableString(input.textColor) ?? null,
            expiresAt: input.expiresAt ?? null,
        });

        await this.assertCodeAvailable(ctx, badge.code);

        const featuredAsset = await this.resolveFeaturedAsset(ctx, input.featuredAssetId);
        if (featuredAsset !== undefined) {
            badge.featuredAsset = featuredAsset;
            badge.featuredAssetId = featuredAsset?.id ?? null;
        }

        if (input.templateId !== undefined) {
            badge.templateId = input.templateId ?? null;
            badge.templateParams = input.templateParams ?? null;
            badge.renderedSvg = await this.renderBadgeSvg(ctx, badge.templateId, badge.templateParams);
        }

        return repo.save(badge);
    }

    async update(ctx: RequestContext, input: UpdateBadgeInput): Promise<Badge> {
        const repo = this.connection.getRepository(ctx, Badge);
        const badge = await this.connection.getEntityOrThrow(ctx, Badge, input.id, {
            relations: ['featuredAsset'],
        });

        if (hasOwn(input, 'name')) {
            badge.name = requireNonEmptyString(input.name, 'name');
        }

        if (hasOwn(input, 'code')) {
            const code = requireNonEmptyString(input.code, 'code');
            await this.assertCodeAvailable(ctx, code, badge.id);
            badge.code = code;
        }

        if (hasOwn(input, 'enabled')) {
            if (typeof input.enabled !== 'boolean') {
                throw new UserInputError('El campo "enabled" debe ser booleano.');
            }
            badge.enabled = input.enabled;
        }

        if (hasOwn(input, 'priority')) {
            if (typeof input.priority !== 'number') {
                throw new UserInputError('El campo "priority" debe ser numérico.');
            }
            badge.priority = input.priority;
        }

        if (hasOwn(input, 'backgroundColor')) {
            badge.backgroundColor = normalizeNullableString(input.backgroundColor) ?? null;
        }

        if (hasOwn(input, 'textColor')) {
            badge.textColor = normalizeNullableString(input.textColor) ?? null;
        }

        if (hasOwn(input, 'expiresAt')) {
            badge.expiresAt = input.expiresAt ?? null;
        }

        if (hasOwn(input, 'featuredAssetId')) {
            const featuredAsset = await this.resolveFeaturedAsset(ctx, input.featuredAssetId);
            badge.featuredAsset = featuredAsset ?? null;
            badge.featuredAssetId = featuredAsset?.id ?? null;
        }

        const templateChanged = hasOwn(input, 'templateId') || hasOwn(input, 'templateParams');
        if (templateChanged) {
            if (hasOwn(input, 'templateId')) {
                badge.templateId = input.templateId ?? null;
            }
            if (hasOwn(input, 'templateParams')) {
                badge.templateParams = input.templateParams ?? null;
            }
            badge.renderedSvg = await this.renderBadgeSvg(ctx, badge.templateId, badge.templateParams);
        }

        return repo.save(badge);
    }

    async delete(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const repo = this.connection.getRepository(ctx, Badge);
        const badge = await repo.findOne({ where: { id } });

        if (!badge) {
            return {
                result: DeletionResult.NOT_DELETED,
                message: 'No encontramos el badge indicado.',
            };
        }

        await repo.remove(badge);

        return {
            result: DeletionResult.DELETED,
        };
    }

    private async assertCodeAvailable(
        ctx: RequestContext,
        code: string,
        currentBadgeId?: ID,
    ): Promise<void> {
        const existing = await this.connection.getRepository(ctx, Badge).findOne({
            where: { code },
        });

        if (existing && String(existing.id) !== String(currentBadgeId ?? '')) {
            throw new UserInputError('Ya existe un badge con ese código.');
        }
    }

    private async renderBadgeSvg(
        ctx: RequestContext,
        templateId: ID | null,
        templateParams: string | null,
    ): Promise<string | null> {
        if (!templateId) {
            return null;
        }
        const template = await this.badgeTemplateService.findOne(ctx, templateId);
        if (!template) {
            return null;
        }
        return this.badgeTemplateService.renderSvg(template.svgTemplate, template.defaultParams, templateParams);
    }

    private async resolveFeaturedAsset(
        ctx: RequestContext,
        featuredAssetId?: ID | null,
    ): Promise<Asset | null | undefined> {
        if (featuredAssetId === undefined) {
            return undefined;
        }

        if (featuredAssetId === null) {
            return null;
        }

        return this.connection.getEntityOrThrow(ctx, Asset, featuredAssetId);
    }
}

function hasOwn<T extends object, K extends PropertyKey>(
    value: T,
    key: K,
): value is T & Record<K, unknown> {
    return Object.prototype.hasOwnProperty.call(value, key);
}

function requireNonEmptyString(
    value: string | null | undefined,
    fieldName: string,
): string {
    if (typeof value !== 'string') {
        throw new UserInputError(`El campo "${fieldName}" es obligatorio.`);
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
        throw new UserInputError(`El campo "${fieldName}" no puede estar vacío.`);
    }

    return normalizedValue;
}

function normalizeNullableString(
    value: string | null | undefined,
): string | null | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue === '' ? null : normalizedValue;
}
