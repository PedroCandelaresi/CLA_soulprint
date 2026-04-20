import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DeletionResponse } from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import { Allow, Ctx, ListQueryOptions, Permission, RequestContext } from '@vendure/core';
import { HomeCarouselSlide } from './home-carousel-slide.entity';
import { HomeCarouselSettings } from './home-carousel-settings.entity';
import {
    CreateHomeCarouselSlideInput,
    HomeCarouselService,
    UpdateHomeCarouselSettingsInput,
    UpdateHomeCarouselSlideInput,
} from './home-carousel.service';

@Resolver()
export class HomeCarouselAdminResolver {
    constructor(private readonly service: HomeCarouselService) {}

    @Query()
    @Allow(Permission.ReadCatalog)
    homeCarouselSlide(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID,
    ): Promise<HomeCarouselSlide | null> {
        return this.service.findOne(ctx, id);
    }

    @Query()
    @Allow(Permission.ReadCatalog)
    homeCarouselSlides(
        @Ctx() ctx: RequestContext,
        @Args() args: { options?: ListQueryOptions<HomeCarouselSlide> },
    ): Promise<PaginatedList<HomeCarouselSlide>> {
        return this.service.findAll(ctx, args.options ?? undefined);
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    createHomeCarouselSlide(
        @Ctx() ctx: RequestContext,
        @Args('input') input: CreateHomeCarouselSlideInput,
    ): Promise<HomeCarouselSlide> {
        return this.service.create(ctx, input);
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    updateHomeCarouselSlide(
        @Ctx() ctx: RequestContext,
        @Args('input') input: UpdateHomeCarouselSlideInput,
    ): Promise<HomeCarouselSlide> {
        return this.service.update(ctx, input);
    }

    @Mutation()
    @Allow(Permission.DeleteCatalog)
    deleteHomeCarouselSlide(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID,
    ): Promise<DeletionResponse> {
        return this.service.delete(ctx, id);
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    reorderHomeCarouselSlides(
        @Ctx() ctx: RequestContext,
        @Args('orderedIds') orderedIds: ID[],
    ): Promise<HomeCarouselSlide[]> {
        return this.service.reorder(ctx, orderedIds);
    }

    @Query()
    @Allow(Permission.ReadCatalog)
    homeCarouselSettings(@Ctx() ctx: RequestContext): Promise<HomeCarouselSettings> {
        return this.service.getSettings(ctx);
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    updateHomeCarouselSettings(
        @Ctx() ctx: RequestContext,
        @Args('input') input: UpdateHomeCarouselSettingsInput,
    ): Promise<HomeCarouselSettings> {
        return this.service.updateSettings(ctx, input);
    }
}

@Resolver()
export class HomeCarouselShopResolver {
    constructor(private readonly service: HomeCarouselService) {}

    @Query()
    activeHomeCarouselSlides(@Ctx() ctx: RequestContext): Promise<HomeCarouselSlide[]> {
        return this.service.findActive(ctx);
    }

    @Query()
    async homeCarouselConfig(
        @Ctx() ctx: RequestContext,
    ): Promise<{ settings: HomeCarouselSettings; slides: HomeCarouselSlide[] }> {
        const [settings, slides] = await Promise.all([
            this.service.getSettings(ctx),
            this.service.findActive(ctx),
        ]);
        return { settings, slides };
    }
}
