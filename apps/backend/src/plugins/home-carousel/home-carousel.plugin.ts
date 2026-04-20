import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { HomeCarouselSlide } from './home-carousel-slide.entity';
import { HomeCarouselSettings } from './home-carousel-settings.entity';
import { HomeCarouselService } from './home-carousel.service';
import {
    homeCarouselAdminApiExtensions,
    homeCarouselShopApiExtensions,
} from './home-carousel.schema';
import {
    HomeCarouselAdminResolver,
    HomeCarouselShopResolver,
} from './home-carousel.resolver';

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [HomeCarouselSlide, HomeCarouselSettings],
    providers: [HomeCarouselService],
    adminApiExtensions: {
        schema: homeCarouselAdminApiExtensions,
        resolvers: [HomeCarouselAdminResolver],
    },
    shopApiExtensions: {
        schema: homeCarouselShopApiExtensions,
        resolvers: [HomeCarouselShopResolver],
    },
})
export class HomeCarouselPlugin {}
