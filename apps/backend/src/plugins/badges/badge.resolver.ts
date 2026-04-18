import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DeletionResponse } from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import {
    Allow,
    Ctx,
    ListQueryOptions,
    Permission,
    RequestContext,
} from '@vendure/core';
import { Badge } from './badge.entity';
import { BadgeTemplate } from './badge-template.entity';
import { BadgeService, CreateBadgeInput, UpdateBadgeInput } from './badge.service';
import {
    BadgeTemplateService,
    CreateBadgeTemplateInput,
    UpdateBadgeTemplateInput,
} from './badge-template.service';

@Resolver()
export class BadgeAdminResolver {
    constructor(
        private readonly badgeService: BadgeService,
        private readonly badgeTemplateService: BadgeTemplateService,
    ) {}

    @Query()
    @Allow(Permission.ReadCatalog)
    badge(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID,
    ): Promise<Badge | null> {
        return this.badgeService.findOne(ctx, id);
    }

    @Query()
    @Allow(Permission.ReadCatalog)
    badges(
        @Ctx() ctx: RequestContext,
        @Args() args: { options?: ListQueryOptions<Badge> },
    ): Promise<PaginatedList<Badge>> {
        return this.badgeService.findAll(ctx, args.options ?? undefined);
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    createBadge(
        @Ctx() ctx: RequestContext,
        @Args('input') input: CreateBadgeInput,
    ): Promise<Badge> {
        return this.badgeService.create(ctx, input);
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    updateBadge(
        @Ctx() ctx: RequestContext,
        @Args('input') input: UpdateBadgeInput,
    ): Promise<Badge> {
        return this.badgeService.update(ctx, input);
    }

    @Mutation()
    @Allow(Permission.DeleteCatalog)
    deleteBadge(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID,
    ): Promise<DeletionResponse> {
        return this.badgeService.delete(ctx, id);
    }

    // --- BadgeTemplate ---

    @Query()
    @Allow(Permission.ReadCatalog)
    badgeTemplate(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID,
    ): Promise<BadgeTemplate | null> {
        return this.badgeTemplateService.findOne(ctx, id);
    }

    @Query()
    @Allow(Permission.ReadCatalog)
    badgeTemplates(@Ctx() ctx: RequestContext): Promise<BadgeTemplate[]> {
        return this.badgeTemplateService.findAll(ctx);
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    createBadgeTemplate(
        @Ctx() ctx: RequestContext,
        @Args('input') input: CreateBadgeTemplateInput,
    ): Promise<BadgeTemplate> {
        return this.badgeTemplateService.create(ctx, input);
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    updateBadgeTemplate(
        @Ctx() ctx: RequestContext,
        @Args('input') input: UpdateBadgeTemplateInput,
    ): Promise<BadgeTemplate> {
        return this.badgeTemplateService.update(ctx, input);
    }

    @Mutation()
    @Allow(Permission.DeleteCatalog)
    deleteBadgeTemplate(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID,
    ): Promise<DeletionResponse> {
        return this.badgeTemplateService.delete(ctx, id);
    }
}
