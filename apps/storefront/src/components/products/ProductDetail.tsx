'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Box, Button, Chip, Divider, Grid, Stack, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import type { Product } from '@/types/product';
import ProductCarousel from './ProductCarousel';
import ProductBadges from './ProductBadges';
import {
    areSelectionsEqual,
    buildVariantQueryString,
    getInitialVariantState,
    getOptionAvailability,
    getVariantOptionSelection,
    type OptionSelection,
    type SearchParamRecord,
} from './productVariantSelection';
import { useStorefront } from '@/components/providers/StorefrontProvider';
import { resolveBadges } from '@/lib/badges/resolveBadges';
import TooltipButton from '@/components/ui/TooltipButton';
import TooltipIconButton from '@/components/ui/TooltipIconButton';
import PersonalizationForm, {
    defaultPersonalizationValues,
    validatePersonalization,
    type PersonalizationValues,
} from '@/components/checkout/PersonalizationForm';

interface ProductDetailProps {
    product: Product;
    initialSearchParams?: SearchParamRecord;
}

function formatCurrency(amount: number, currencyCode: string): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currencyCode || 'ARS',
    }).format(amount / 100);
}

function getStockChip(stockLevel?: string) {
    if (stockLevel === 'IN_STOCK') {
        return { label: 'En stock', color: 'success' as const };
    }

    if (stockLevel === 'LOW_STOCK') {
        return { label: 'Stock bajo', color: 'warning' as const };
    }

    if (stockLevel === 'OUT_OF_STOCK') {
        return { label: 'Sin stock', color: 'default' as const };
    }

    return { label: 'Disponibilidad a confirmar', color: 'default' as const };
}

const ProductDetail = ({ product, initialSearchParams = {} }: ProductDetailProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { addItemToOrder, cartLoading, customer } = useStorefront();
    const [quantity, setQuantity] = useState(1);
    const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);
    const [personalization, setPersonalization] = useState<PersonalizationValues>(defaultPersonalizationValues);
    const optionGroups = product.optionGroups ?? [];
    const hasOptionGroups = optionGroups.length > 0;
    const hasMultipleVariants = product.variants.length > 1;
    const currentQueryString = searchParams.toString();
    const liveSearchParamRecord = useMemo(
        () => Object.fromEntries(searchParams.entries()),
        [currentQueryString, searchParams],
    );
    const initialVariantState = useMemo(
        () => getInitialVariantState(product, initialSearchParams),
        [initialSearchParams, product],
    );
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
        initialVariantState.selectedVariant?.id,
    );
    const [selectedOptions, setSelectedOptions] = useState<OptionSelection>(
        initialVariantState.selectedOptions,
    );
    const lastWrittenQueryRef = useRef<string | null>(null);
    const selectedOptionsRef = useRef(selectedOptions);
    const selectedVariantIdRef = useRef(selectedVariantId);
    selectedOptionsRef.current = selectedOptions;
    selectedVariantIdRef.current = selectedVariantId;

    useEffect(() => {
        setSelectedVariantId(initialVariantState.selectedVariant?.id);
        setSelectedOptions(initialVariantState.selectedOptions);
        setQuantity(1);
        setFeedback(null);
        lastWrittenQueryRef.current = null;
    }, [
        initialVariantState.matchedQuery,
        initialVariantState.selectedVariant?.id,
        product.id,
    ]);

    const selectedVariant = useMemo(() => {
        if (!hasOptionGroups) {
            return product.variants.find((variant) => variant.id === selectedVariantId) ?? initialVariantState.selectedVariant;
        }

        return (
            product.variants.find((variant) => {
                const variantSelection = getVariantOptionSelection(variant);
                return optionGroups.every((group) => variantSelection[group.id] === selectedOptions[group.id]);
            }) ?? undefined
        );
    }, [
        hasOptionGroups,
        initialVariantState.selectedVariant,
        optionGroups,
        product.variants,
        selectedOptions,
        selectedVariantId,
    ]);

    useEffect(() => {
        if (selectedVariant?.id !== selectedVariantId) {
            setSelectedVariantId(selectedVariant?.id);
        }
    }, [selectedVariant?.id, selectedVariantId]);

    useEffect(() => {
        if (currentQueryString === lastWrittenQueryRef.current) {
            lastWrittenQueryRef.current = null;
            return;
        }

        const nextVariantState = getInitialVariantState(product, liveSearchParamRecord);
        const nextVariantId = nextVariantState.selectedVariant?.id;

        if (
            nextVariantId === selectedVariantIdRef.current &&
            areSelectionsEqual(nextVariantState.selectedOptions, selectedOptionsRef.current)
        ) {
            return;
        }

        setSelectedVariantId(nextVariantId);
        setSelectedOptions(nextVariantState.selectedOptions);
        setQuantity(1);
        setFeedback(null);
    }, [
        currentQueryString,
        liveSearchParamRecord,
        product,
    ]);

    const canonicalQueryString = useMemo(
        () =>
            buildVariantQueryString(
                product,
                selectedOptions,
                selectedVariant,
                new URLSearchParams(currentQueryString),
            ),
        [currentQueryString, product, selectedOptions, selectedVariant],
    );

    useEffect(() => {
        if (canonicalQueryString === currentQueryString) {
            return;
        }

        const nextUrl = canonicalQueryString ? `${pathname}?${canonicalQueryString}` : pathname;
        lastWrittenQueryRef.current = canonicalQueryString;
        router.replace(nextUrl, { scroll: false });
    }, [canonicalQueryString, currentQueryString, pathname, router]);

    const selectedOptionSummary = useMemo(
        () =>
            optionGroups
                .map((group) => {
                    const option = group.options.find((item) => item.id === selectedOptions[group.id]);
                    return option ? `${group.name}: ${option.name}` : null;
                })
                .filter((value): value is string => Boolean(value)),
        [optionGroups, selectedOptions],
    );

    const collectionBadges = useMemo(
        () => product.collections?.flatMap((c) => c.customFields?.badges ?? []) ?? [],
        [product.collections],
    );

    const resolvedBadges = useMemo(
        () =>
            resolveBadges({
                productBadges: product.customFields?.badges,
                variantBadges: selectedVariant?.customFields?.badges,
                collectionBadges,
            }),
        [product.customFields?.badges, selectedVariant?.customFields?.badges, collectionBadges],
    );

    const optionAvailabilityMap = useMemo(
        () =>
            Object.fromEntries(
                optionGroups.map((group) => [
                    group.id,
                    Object.fromEntries(
                        group.options.map((option) => [
                            option.id,
                            getOptionAvailability(product, selectedOptions, group.id, option.id),
                        ]),
                    ),
                ]),
            ) as Record<string, Record<string, ReturnType<typeof getOptionAvailability>>>,
        [optionGroups, product, selectedOptions],
    );

    const currencyCode = selectedVariant?.currencyCode || 'ARS';
    const priceWithTax = selectedVariant?.priceWithTax ?? selectedVariant?.price ?? 0;
    const priceWithoutTax = selectedVariant?.price ?? priceWithTax;
    const showTaxBreakdown =
        selectedVariant?.priceWithTax != null && selectedVariant.priceWithTax !== selectedVariant.price;
    const stockChip = getStockChip(selectedVariant?.stockLevel);
    const isOutOfStock = selectedVariant?.stockLevel === 'OUT_OF_STOCK';
    const canAddToCart = Boolean(selectedVariant?.id) && !isOutOfStock;
    const description = (product.description || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const images: string[] = [];
    if (selectedVariant?.featuredAsset) {
        images.push(selectedVariant.featuredAsset.preview);
    }
    if (selectedVariant?.assets) {
        images.push(...selectedVariant.assets.map((asset) => asset.preview));
    }
    if (product.featuredAsset) {
        images.push(product.featuredAsset.preview);
    }
    if (product.assets) {
        images.push(...product.assets.map((asset) => asset.preview));
    }

    const galleryImages = [...new Set(images)];
    if (galleryImages.length === 0) {
        galleryImages.push('/images/backgrounds/errorimg.svg');
    }

    const handleVariantSelection = (variantId?: string) => {
        const variant = product.variants.find((item) => item.id === variantId);
        if (!variant) {
            return;
        }

        setSelectedVariantId(variant.id);
        setSelectedOptions(getVariantOptionSelection(variant));
        setQuantity(1);
        setFeedback(null);
    };

    const handleOptionSelection = (groupId: string, optionId: string) => {
        const availability = optionAvailabilityMap[groupId]?.[optionId];
        if (!availability?.exists) {
            return;
        }

        setSelectedOptions((previous) => ({ ...previous, [groupId]: optionId }));
        setSelectedVariantId(availability.variant?.id);
        setQuantity(1);
        setFeedback(null);
    };

    const handleAddToCart = async () => {
        if (!selectedVariant?.id) {
            setFeedback({
                severity: 'error',
                message: 'La combinación seleccionada no corresponde a una variante comprable.',
            });
            return;
        }

        if (!customer) {
            router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
            return;
        }

        const personalizationError = validatePersonalization(personalization);
        if (personalizationError) {
            setFeedback({ severity: 'error', message: personalizationError });
            return;
        }

        const customFields = {
            frontMode: personalization.frontMode,
            frontText: personalization.frontMode === 'text' ? personalization.frontText.trim() : null,
            backMode: personalization.backMode,
            backText: personalization.backMode === 'text' ? personalization.backText.trim() : null,
        };

        const result = await addItemToOrder(selectedVariant.id, quantity, customFields);
        setFeedback({
            severity: result.success ? 'success' : 'error',
            message:
                result.message ||
                (result.success ? 'Producto agregado al carrito.' : 'No se pudo agregar el producto al carrito.'),
        });
        if (result.success) {
            setPersonalization(defaultPersonalizationValues());
        }
    };

    return (
        <Box
            sx={{
                mt: 2,
                p: { xs: 2.5, md: 4 },
                borderRadius: 6,
                border: '1px solid rgba(0,72,37,0.08)',
                background: 'linear-gradient(180deg, rgba(255,250,242,0.94) 0%, rgba(255,255,255,0.72) 100%)',
                boxShadow: '0 22px 44px rgba(0,72,37,0.08)',
            }}
        >
            <Grid container spacing={{ xs: 3, md: 4 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ position: { md: 'sticky' }, top: { md: 108 } }}>
                        <ProductCarousel
                            images={galleryImages}
                            alt={selectedVariant?.name || product.name}
                            overlay={<ProductBadges badges={resolvedBadges} size="md" />}
                        />
                    </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Stack spacing={2.75}>
                        <Stack spacing={1}>
                            <Typography variant="overline" color="secondary.dark">
                                Pieza seleccionada
                            </Typography>
                            <Typography variant="h3" fontWeight="bold">
                                {product.name}
                            </Typography>
                            {selectedVariant?.name && selectedVariant.name !== product.name && (
                                <Typography variant="h6" color="text.secondary">
                                    {selectedVariant.name}
                                </Typography>
                            )}
                            {selectedOptionSummary.length > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    {selectedOptionSummary.join(' · ')}
                                </Typography>
                            )}
                        </Stack>

                        <Stack spacing={0.75}>
                            <Typography variant="h4" color="primary.main" fontWeight="bold">
                                {formatCurrency(priceWithTax, currencyCode)}
                            </Typography>
                            {showTaxBreakdown && (
                                <Typography variant="body2" color="text.secondary">
                                    Precio base: {formatCurrency(priceWithoutTax, currencyCode)}. El valor principal incluye
                                    impuestos.
                                </Typography>
                            )}
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
                            <Chip label={stockChip.label} color={stockChip.color} size="small" variant="outlined" />
                            {selectedVariant?.sku && (
                                <Chip label={`SKU: ${selectedVariant.sku}`} size="small" variant="outlined" />
                            )}
                        </Stack>

                        <Typography variant="body1" color="text.secondary">
                            {description || 'Descripción no disponible para este producto.'}
                        </Typography>

                        {selectedVariant && isOutOfStock && (
                            <Alert severity="warning">
                                La variante seleccionada está sin stock. Podés elegir otra opción disponible.
                            </Alert>
                        )}

                        {!selectedVariant && (
                            <Alert severity="error">
                                La combinación seleccionada no existe para este producto. Elegí una opción disponible.
                            </Alert>
                        )}

                        {hasOptionGroups && (
                            <>
                                <Divider />
                                <Stack spacing={2.5}>
                                    {optionGroups.map((group) => (
                                        <Stack key={group.id} spacing={1}>
                                            <Typography variant="subtitle2" fontWeight={700}>
                                                {group.name}
                                            </Typography>
                                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                                {group.options.map((option) => {
                                                    const isSelected = selectedOptions[group.id] === option.id;
                                                    const optionAvailability = optionAvailabilityMap[group.id]?.[option.id];
                                                    const isImpossible = !optionAvailability?.exists;
                                                    const isSoldOut = optionAvailability?.exists && !optionAvailability.inStock;

                                                    return (
                                                        <TooltipButton
                                                            key={option.id}
                                                            size="small"
                                                            variant={isSelected ? 'contained' : 'outlined'}
                                                            aria-pressed={isSelected}
                                                            disabled={isImpossible}
                                                            onClick={() => handleOptionSelection(group.id, option.id)}
                                                            tooltip={
                                                                isImpossible
                                                                    ? 'Esta combinación no existe'
                                                                    : isSoldOut
                                                                      ? `${option.name}: variante agotada`
                                                                      : `Elegir ${option.name}`
                                                            }
                                                            sx={
                                                                isSoldOut
                                                                    ? {
                                                                          opacity: 0.65,
                                                                          textDecoration: 'line-through',
                                                                      }
                                                                    : undefined
                                                            }
                                                        >
                                                            {option.name}
                                                        </TooltipButton>
                                                    );
                                                })}
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary">
                                                Las opciones tachadas corresponden a variantes sin stock. Las deshabilitadas
                                                no existen para la combinación actual.
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            </>
                        )}

                        {!hasOptionGroups && hasMultipleVariants && (
                            <>
                                <Divider />
                                <Stack spacing={1.5}>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        Variante
                                    </Typography>
                                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                        {product.variants.map((variant) => (
                                            <TooltipButton
                                                key={variant.id ?? variant.name}
                                                size="small"
                                                variant={variant.id === selectedVariant?.id ? 'contained' : 'outlined'}
                                                aria-pressed={variant.id === selectedVariant?.id}
                                                onClick={() => handleVariantSelection(variant.id)}
                                                tooltip={
                                                    variant.stockLevel === 'OUT_OF_STOCK'
                                                        ? `${variant.name || 'Variante'} sin stock`
                                                        : `Elegir ${variant.name || 'variante'}`
                                                }
                                                sx={
                                                    variant.stockLevel === 'OUT_OF_STOCK'
                                                        ? {
                                                              opacity: 0.65,
                                                              textDecoration: 'line-through',
                                                          }
                                                        : undefined
                                                }
                                            >
                                                {variant.name || 'Variante'}
                                            </TooltipButton>
                                        ))}
                                    </Stack>
                                </Stack>
                            </>
                        )}

                        <Divider />

                        {/* ── Personalización ── */}
                        <Stack spacing={1}>
                            <Typography variant="subtitle1" fontWeight={700}>
                                Personalización
                            </Typography>
                            {customer ? (
                                <>
                                    <Typography variant="body2" color="text.secondary">
                                        Cada pieza se graba según tu indicación. El frente es obligatorio; el dorso es opcional.
                                    </Typography>
                                    <PersonalizationForm
                                        values={personalization}
                                        onChange={setPersonalization}
                                        disabled={cartLoading || !canAddToCart}
                                    />
                                </>
                            ) : (
                                <Box
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 3,
                                        border: '1px solid rgba(0,72,37,0.14)',
                                        bgcolor: 'rgba(255,251,244,0.88)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1.5,
                                    }}
                                >
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <LockOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                        <Typography variant="body2" color="text.secondary">
                                            Para personalizar tu pieza necesitás tener una cuenta.
                                        </Typography>
                                    </Stack>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`)}
                                        sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
                                    >
                                        Iniciá sesión o creá una cuenta
                                    </Button>
                                </Box>
                            )}
                        </Stack>

                        <Divider />

                        <Stack spacing={2.5}>
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    p: 0.75,
                                    borderRadius: 10,
                                    border: '1px solid rgba(0,72,37,0.1)',
                                    bgcolor: 'rgba(255,255,255,0.68)',
                                    width: 'fit-content',
                                }}
                            >
                                <TooltipIconButton
                                    aria-label="Restar cantidad"
                                    onClick={() => setQuantity((previous) => Math.max(1, previous - 1))}
                                    disabled={cartLoading || quantity <= 1 || !canAddToCart}
                                    tooltip="Disminuir cantidad"
                                >
                                    <RemoveRoundedIcon />
                                </TooltipIconButton>
                                <Typography minWidth={32} textAlign="center" fontWeight={700}>
                                    {quantity}
                                </Typography>
                                <TooltipIconButton
                                    aria-label="Sumar cantidad"
                                    onClick={() => setQuantity((previous) => previous + 1)}
                                    disabled={cartLoading || !canAddToCart}
                                    tooltip="Aumentar cantidad"
                                >
                                    <AddRoundedIcon />
                                </TooltipIconButton>
                            </Box>

                            <TooltipButton
                                variant="contained"
                                size="large"
                                startIcon={<ShoppingBagOutlinedIcon />}
                                onClick={handleAddToCart}
                                disabled={!canAddToCart || cartLoading}
                                tooltip={
                                    !selectedVariant
                                        ? 'Elegí una combinación válida antes de agregar'
                                        : isOutOfStock
                                          ? 'La variante seleccionada no tiene stock'
                                          : 'Agregar esta pieza al carrito'
                                }
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                {!selectedVariant
                                    ? 'Seleccioná una combinación válida'
                                    : isOutOfStock
                                        ? 'Sin stock'
                                        : 'Agregar al carrito'}
                            </TooltipButton>

                            {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}

                            <Typography variant="body2" color="text.secondary">
                                El carrito opera siempre con la variante seleccionada. Si iniciás sesión, tu pedido puede
                                mantenerse asociado a tu cuenta.
                            </Typography>
                        </Stack>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ProductDetail;
