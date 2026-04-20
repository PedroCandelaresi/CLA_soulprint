import { fetchVendure } from './client';

export type HomeCarouselLinkType = 'internal' | 'external';
export type HomeCarouselSlideLayout = 'split_left' | 'split_right' | 'full_image';
export type HomeCarouselBadgeVariant = 'solid' | 'outline' | 'pill';
export type HomeCarouselTextTheme = 'dark' | 'light';
export type HomeCarouselTransitionEffect = 'fade' | 'slide' | 'zoom';

export interface HomeCarouselSlide {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    primaryButtonText: string | null;
    primaryButtonUrl: string | null;
    secondaryButtonText: string | null;
    secondaryButtonUrl: string | null;
    linkType: HomeCarouselLinkType;
    openInNewTab: boolean;
    altText: string | null;
    layout: HomeCarouselSlideLayout;
    textTheme: HomeCarouselTextTheme;
    badgeText: string | null;
    badgeColor: string | null;
    badgeVariant: HomeCarouselBadgeVariant;
    desktopAsset: { id: string; preview: string; source: string } | null;
    mobileAsset: { id: string; preview: string; source: string } | null;
}

export interface HomeCarouselSettings {
    transitionEffect: HomeCarouselTransitionEffect;
    autoplayEnabled: boolean;
    autoplayInterval: number;
    showArrows: boolean;
    showDots: boolean;
}

export interface HomeCarouselConfig {
    settings: HomeCarouselSettings;
    slides: HomeCarouselSlide[];
}

const CONFIG_QUERY = /* GraphQL */ `
    query HomeCarouselConfig {
        homeCarouselConfig {
            settings {
                transitionEffect
                autoplayEnabled
                autoplayInterval
                showArrows
                showDots
            }
            slides {
                id
                title
                subtitle
                description
                primaryButtonText
                primaryButtonUrl
                secondaryButtonText
                secondaryButtonUrl
                linkType
                openInNewTab
                altText
                layout
                textTheme
                badgeText
                badgeColor
                badgeVariant
                desktopAsset { id preview source }
                mobileAsset { id preview source }
            }
        }
    }
`;

const DEFAULT_SETTINGS: HomeCarouselSettings = {
    transitionEffect: 'fade',
    autoplayEnabled: true,
    autoplayInterval: 5500,
    showArrows: true,
    showDots: true,
};

export async function getHomeCarouselConfig(): Promise<HomeCarouselConfig> {
    try {
        const data = await fetchVendure<{ homeCarouselConfig: HomeCarouselConfig }>(CONFIG_QUERY);
        return data.homeCarouselConfig ?? { settings: DEFAULT_SETTINGS, slides: [] };
    } catch {
        return { settings: DEFAULT_SETTINGS, slides: [] };
    }
}

export async function getActiveHomeCarouselSlides(): Promise<HomeCarouselSlide[]> {
    const config = await getHomeCarouselConfig();
    return config.slides;
}
