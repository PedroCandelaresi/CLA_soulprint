import { Box, Stack, Typography } from '@mui/material';
import type { ProductBadge } from '@/types/product';

interface ProductBadgesProps {
    badges: ProductBadge[];
    size?: 'sm' | 'md';
}

const BADGE_DIMENSIONS = {
    sm: {
        imageMaxWidth: 84,
        imageMaxHeight: 34,
        textPaddingX: 1,
        textPaddingY: 0.4,
        textVariant: 'caption' as const,
    },
    md: {
        imageMaxWidth: 112,
        imageMaxHeight: 46,
        textPaddingX: 1.25,
        textPaddingY: 0.55,
        textVariant: 'body2' as const,
    },
};

const ProductBadges = ({ badges, size = 'sm' }: ProductBadgesProps) => {
    if (badges.length === 0) {
        return null;
    }

    const dimensions = BADGE_DIMENSIONS[size];

    return (
        <Stack
            spacing={1}
            sx={{
                alignItems: 'flex-start',
                maxWidth: '100%',
                pointerEvents: 'none',
            }}
        >
            {badges.map((badge) => {
                const svgDataUrl = badge.renderedSvg
                    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(badge.renderedSvg)}`
                    : null;

                const assetUrl = normalizeBadgeAssetUrl(
                    badge.featuredAsset?.preview || badge.featuredAsset?.source,
                );

                const imageUrl = svgDataUrl ?? assetUrl ?? null;

                if (imageUrl) {
                    return (
                        <Box
                            key={`${badge.code}-${badge.id}`}
                            sx={{
                                display: 'inline-flex',
                                filter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.18))',
                            }}
                        >
                            <Box
                                component="img"
                                src={imageUrl}
                                alt={badge.name}
                                sx={{
                                    display: 'block',
                                    width: 'auto',
                                    height: 'auto',
                                    maxWidth: dimensions.imageMaxWidth,
                                    maxHeight: dimensions.imageMaxHeight,
                                }}
                            />
                        </Box>
                    );
                }

                return (
                    <Box
                        key={`${badge.code}-${badge.id}`}
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            borderRadius: 999,
                            px: dimensions.textPaddingX,
                            py: dimensions.textPaddingY,
                            bgcolor: badge.backgroundColor || 'rgba(17, 24, 39, 0.88)',
                            color: badge.textColor || '#FFFFFF',
                            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.18)',
                            border: '1px solid rgba(255, 255, 255, 0.28)',
                            backdropFilter: 'blur(10px)',
                        }}
                    >
                        <Typography
                            variant={dimensions.textVariant}
                            sx={{
                                fontWeight: 700,
                                lineHeight: 1,
                                letterSpacing: 0.2,
                            }}
                        >
                            {badge.name}
                        </Typography>
                    </Box>
                );
            })}
        </Stack>
    );
};

export default ProductBadges;

function normalizeBadgeAssetUrl(url?: string): string | undefined {
    if (!url) {
        return undefined;
    }

    if (
        url.startsWith('/') ||
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('data:')
    ) {
        return url;
    }

    return `/${url}`;
}
