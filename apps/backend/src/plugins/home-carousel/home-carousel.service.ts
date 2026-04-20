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
import {
    HomeCarouselBadgeVariant,
    HomeCarouselLinkType,
    HomeCarouselSlide,
    HomeCarouselSlideLayout,
    HomeCarouselTextTheme,
} from './home-carousel-slide.entity';
import {
    HomeCarouselSettings,
    HomeCarouselTransitionEffect,
} from './home-carousel-settings.entity';

const LINK_TYPES: HomeCarouselLinkType[] = ['internal', 'external'];
const LAYOUTS: HomeCarouselSlideLayout[] = ['split_left', 'split_right', 'full_image'];
const BADGE_VARIANTS: HomeCarouselBadgeVariant[] = ['solid', 'outline', 'pill'];
const TEXT_THEMES: HomeCarouselTextTheme[] = ['dark', 'light'];
const TRANSITIONS: HomeCarouselTransitionEffect[] = ['fade', 'slide', 'zoom'];

export interface CreateHomeCarouselSlideInput {
    title: string;
    subtitle?: string | null;
    description?: string | null;
    primaryButtonText?: string | null;
    primaryButtonUrl?: string | null;
    secondaryButtonText?: string | null;
    secondaryButtonUrl?: string | null;
    linkType?: HomeCarouselLinkType | null;
    openInNewTab?: boolean | null;
    isActive?: boolean | null;
    sortOrder?: number | null;
    altText?: string | null;
    layout?: HomeCarouselSlideLayout | null;
    textTheme?: HomeCarouselTextTheme | null;
    badgeText?: string | null;
    badgeColor?: string | null;
    badgeVariant?: HomeCarouselBadgeVariant | null;
    desktopAssetId?: ID | null;
    mobileAssetId?: ID | null;
}

export interface UpdateHomeCarouselSlideInput {
    id: ID;
    title?: string | null;
    subtitle?: string | null;
    description?: string | null;
    primaryButtonText?: string | null;
    primaryButtonUrl?: string | null;
    secondaryButtonText?: string | null;
    secondaryButtonUrl?: string | null;
    linkType?: HomeCarouselLinkType | null;
    openInNewTab?: boolean | null;
    isActive?: boolean | null;
    sortOrder?: number | null;
    altText?: string | null;
    layout?: HomeCarouselSlideLayout | null;
    textTheme?: HomeCarouselTextTheme | null;
    badgeText?: string | null;
    badgeColor?: string | null;
    badgeVariant?: HomeCarouselBadgeVariant | null;
    desktopAssetId?: ID | null;
    mobileAssetId?: ID | null;
}

export interface UpdateHomeCarouselSettingsInput {
    transitionEffect?: HomeCarouselTransitionEffect | null;
    autoplayEnabled?: boolean | null;
    autoplayInterval?: number | null;
    showArrows?: boolean | null;
    showDots?: boolean | null;
}

@Injectable()
export class HomeCarouselService {
    constructor(
        private readonly connection: TransactionalConnection,
        private readonly listQueryBuilder: ListQueryBuilder,
    ) {}

    async findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<HomeCarouselSlide>,
    ): Promise<PaginatedList<HomeCarouselSlide>> {
        const qb = this.listQueryBuilder.build(HomeCarouselSlide, options, {
            ctx,
            relations: ['desktopAsset', 'mobileAsset'],
        });

        if (!options?.sort) {
            qb.addOrderBy('homecarouselslide.sortOrder', 'ASC').addOrderBy(
                'homecarouselslide.createdAt',
                'ASC',
            );
        }

        const [items, totalItems] = await qb.getManyAndCount();
        return { items, totalItems };
    }

    async findActive(ctx: RequestContext): Promise<HomeCarouselSlide[]> {
        return this.connection.getRepository(ctx, HomeCarouselSlide).find({
            where: { isActive: true },
            relations: ['desktopAsset', 'mobileAsset'],
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });
    }

    findOne(ctx: RequestContext, id: ID): Promise<HomeCarouselSlide | null> {
        return this.connection.getRepository(ctx, HomeCarouselSlide).findOne({
            where: { id },
            relations: ['desktopAsset', 'mobileAsset'],
        });
    }

    async create(
        ctx: RequestContext,
        input: CreateHomeCarouselSlideInput,
    ): Promise<HomeCarouselSlide> {
        const repo = this.connection.getRepository(ctx, HomeCarouselSlide);
        const slide = new HomeCarouselSlide({
            title: requireNonEmptyString(input.title, 'title'),
            subtitle: normalizeNullableString(input.subtitle) ?? null,
            description: normalizeNullableString(input.description) ?? null,
            primaryButtonText: normalizeNullableString(input.primaryButtonText) ?? null,
            primaryButtonUrl: normalizeNullableString(input.primaryButtonUrl) ?? null,
            secondaryButtonText: normalizeNullableString(input.secondaryButtonText) ?? null,
            secondaryButtonUrl: normalizeNullableString(input.secondaryButtonUrl) ?? null,
            linkType: normalizeLinkType(input.linkType) ?? 'internal',
            openInNewTab: input.openInNewTab ?? false,
            isActive: input.isActive ?? true,
            sortOrder: typeof input.sortOrder === 'number' ? input.sortOrder : 0,
            altText: normalizeNullableString(input.altText) ?? null,
            layout: normalizeEnum(input.layout, LAYOUTS, 'layout') ?? 'split_left',
            textTheme: normalizeEnum(input.textTheme, TEXT_THEMES, 'textTheme') ?? 'dark',
            badgeText: normalizeNullableString(input.badgeText) ?? null,
            badgeColor: normalizeNullableString(input.badgeColor) ?? null,
            badgeVariant: normalizeEnum(input.badgeVariant, BADGE_VARIANTS, 'badgeVariant') ?? 'solid',
        });

        const desktopAsset = await this.resolveAsset(ctx, input.desktopAssetId, 'desktopAssetId');
        if (desktopAsset !== undefined) {
            slide.desktopAsset = desktopAsset;
            slide.desktopAssetId = desktopAsset?.id ?? null;
        }

        const mobileAsset = await this.resolveAsset(ctx, input.mobileAssetId, 'mobileAssetId');
        if (mobileAsset !== undefined) {
            slide.mobileAsset = mobileAsset;
            slide.mobileAssetId = mobileAsset?.id ?? null;
        }

        return repo.save(slide);
    }

    async update(
        ctx: RequestContext,
        input: UpdateHomeCarouselSlideInput,
    ): Promise<HomeCarouselSlide> {
        const repo = this.connection.getRepository(ctx, HomeCarouselSlide);
        const slide = await this.connection.getEntityOrThrow(ctx, HomeCarouselSlide, input.id, {
            relations: ['desktopAsset', 'mobileAsset'],
        });

        if (hasOwn(input, 'title')) {
            slide.title = requireNonEmptyString(input.title, 'title');
        }
        if (hasOwn(input, 'subtitle')) {
            slide.subtitle = normalizeNullableString(input.subtitle) ?? null;
        }
        if (hasOwn(input, 'description')) {
            slide.description = normalizeNullableString(input.description) ?? null;
        }
        if (hasOwn(input, 'primaryButtonText')) {
            slide.primaryButtonText = normalizeNullableString(input.primaryButtonText) ?? null;
        }
        if (hasOwn(input, 'primaryButtonUrl')) {
            slide.primaryButtonUrl = normalizeNullableString(input.primaryButtonUrl) ?? null;
        }
        if (hasOwn(input, 'secondaryButtonText')) {
            slide.secondaryButtonText = normalizeNullableString(input.secondaryButtonText) ?? null;
        }
        if (hasOwn(input, 'secondaryButtonUrl')) {
            slide.secondaryButtonUrl = normalizeNullableString(input.secondaryButtonUrl) ?? null;
        }
        if (hasOwn(input, 'linkType')) {
            slide.linkType = normalizeLinkType(input.linkType) ?? 'internal';
        }
        if (hasOwn(input, 'openInNewTab')) {
            if (typeof input.openInNewTab !== 'boolean') {
                throw new UserInputError('El campo "openInNewTab" debe ser booleano.');
            }
            slide.openInNewTab = input.openInNewTab;
        }
        if (hasOwn(input, 'isActive')) {
            if (typeof input.isActive !== 'boolean') {
                throw new UserInputError('El campo "isActive" debe ser booleano.');
            }
            slide.isActive = input.isActive;
        }
        if (hasOwn(input, 'sortOrder')) {
            if (typeof input.sortOrder !== 'number') {
                throw new UserInputError('El campo "sortOrder" debe ser numérico.');
            }
            slide.sortOrder = input.sortOrder;
        }
        if (hasOwn(input, 'altText')) {
            slide.altText = normalizeNullableString(input.altText) ?? null;
        }
        if (hasOwn(input, 'layout')) {
            slide.layout = normalizeEnum(input.layout, LAYOUTS, 'layout') ?? 'split_left';
        }
        if (hasOwn(input, 'textTheme')) {
            slide.textTheme = normalizeEnum(input.textTheme, TEXT_THEMES, 'textTheme') ?? 'dark';
        }
        if (hasOwn(input, 'badgeText')) {
            slide.badgeText = normalizeNullableString(input.badgeText) ?? null;
        }
        if (hasOwn(input, 'badgeColor')) {
            slide.badgeColor = normalizeNullableString(input.badgeColor) ?? null;
        }
        if (hasOwn(input, 'badgeVariant')) {
            slide.badgeVariant = normalizeEnum(input.badgeVariant, BADGE_VARIANTS, 'badgeVariant') ?? 'solid';
        }
        if (hasOwn(input, 'desktopAssetId')) {
            const asset = await this.resolveAsset(ctx, input.desktopAssetId, 'desktopAssetId');
            slide.desktopAsset = asset ?? null;
            slide.desktopAssetId = asset?.id ?? null;
        }
        if (hasOwn(input, 'mobileAssetId')) {
            const asset = await this.resolveAsset(ctx, input.mobileAssetId, 'mobileAssetId');
            slide.mobileAsset = asset ?? null;
            slide.mobileAssetId = asset?.id ?? null;
        }

        return repo.save(slide);
    }

    async delete(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const repo = this.connection.getRepository(ctx, HomeCarouselSlide);
        const slide = await repo.findOne({ where: { id } });
        if (!slide) {
            return { result: DeletionResult.NOT_DELETED, message: 'Slide no encontrado.' };
        }
        await repo.remove(slide);
        return { result: DeletionResult.DELETED };
    }

    async reorder(ctx: RequestContext, orderedIds: ID[]): Promise<HomeCarouselSlide[]> {
        const repo = this.connection.getRepository(ctx, HomeCarouselSlide);
        const ids = Array.from(new Set(orderedIds.map((id) => String(id))));
        await Promise.all(ids.map((id, index) => repo.update(id, { sortOrder: index })));
        return repo.find({
            relations: ['desktopAsset', 'mobileAsset'],
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });
    }

    async getSettings(ctx: RequestContext): Promise<HomeCarouselSettings> {
        const repo = this.connection.getRepository(ctx, HomeCarouselSettings);
        const existing = await repo.findOne({ where: {}, order: { id: 'ASC' } });
        if (existing) return existing;
        return repo.save(new HomeCarouselSettings({}));
    }

    async updateSettings(
        ctx: RequestContext,
        input: UpdateHomeCarouselSettingsInput,
    ): Promise<HomeCarouselSettings> {
        const repo = this.connection.getRepository(ctx, HomeCarouselSettings);
        const settings = await this.getSettings(ctx);
        if (hasOwn(input, 'transitionEffect')) {
            settings.transitionEffect =
                normalizeEnum(input.transitionEffect, TRANSITIONS, 'transitionEffect') ?? 'fade';
        }
        if (hasOwn(input, 'autoplayEnabled')) {
            if (typeof input.autoplayEnabled !== 'boolean') {
                throw new UserInputError('El campo "autoplayEnabled" debe ser booleano.');
            }
            settings.autoplayEnabled = input.autoplayEnabled;
        }
        if (hasOwn(input, 'autoplayInterval')) {
            if (typeof input.autoplayInterval !== 'number' || input.autoplayInterval < 500) {
                throw new UserInputError('El campo "autoplayInterval" debe ser un número ≥ 500.');
            }
            settings.autoplayInterval = input.autoplayInterval;
        }
        if (hasOwn(input, 'showArrows')) {
            if (typeof input.showArrows !== 'boolean') {
                throw new UserInputError('El campo "showArrows" debe ser booleano.');
            }
            settings.showArrows = input.showArrows;
        }
        if (hasOwn(input, 'showDots')) {
            if (typeof input.showDots !== 'boolean') {
                throw new UserInputError('El campo "showDots" debe ser booleano.');
            }
            settings.showDots = input.showDots;
        }
        return repo.save(settings);
    }

    private async resolveAsset(
        ctx: RequestContext,
        assetId: ID | null | undefined,
        fieldName: string,
    ): Promise<Asset | null | undefined> {
        if (assetId === undefined) {
            return undefined;
        }
        if (assetId === null) {
            return null;
        }
        try {
            return await this.connection.getEntityOrThrow(ctx, Asset, assetId);
        } catch {
            throw new UserInputError(`No se encontró el asset referenciado por "${fieldName}".`);
        }
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
    const normalized = value.trim();
    if (!normalized) {
        throw new UserInputError(`El campo "${fieldName}" no puede estar vacío.`);
    }
    return normalized;
}

function normalizeNullableString(value: string | null | undefined): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function normalizeEnum<T extends string>(
    value: string | null | undefined,
    allowed: readonly T[],
    fieldName: string,
): T | undefined {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value);
    if (!allowed.includes(normalized as T)) {
        throw new UserInputError(
            `Valor inválido para "${fieldName}": ${value}. Valores permitidos: ${allowed.join(', ')}.`,
        );
    }
    return normalized as T;
}

function normalizeLinkType(
    value: HomeCarouselLinkType | string | null | undefined,
): HomeCarouselLinkType | undefined {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).toLowerCase();
    if (!LINK_TYPES.includes(normalized as HomeCarouselLinkType)) {
        throw new UserInputError(
            `Valor inválido para "linkType": ${value}. Debe ser "internal" o "external".`,
        );
    }
    return normalized as HomeCarouselLinkType;
}
