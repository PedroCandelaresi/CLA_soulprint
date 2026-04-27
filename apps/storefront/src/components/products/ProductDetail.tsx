'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Box, Button, Chip, Divider, Grid, MobileStepper, Stack, Typography, useTheme } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import type { Product } from '@/types/product';
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
import { uploadPersonalizationFile } from '@/lib/personalization/client';
import TooltipButton from '@/components/ui/TooltipButton';
import TooltipIconButton from '@/components/ui/TooltipIconButton';
import PersonalizationForm, {
    defaultPersonalizationValues,
    validatePersonalization,
    type PersonalizationValues,
} from '@/components/checkout/PersonalizationForm';
import type { ActiveOrder, ActiveOrderLine } from '@/types/storefront';
import VendureImage from '@/components/common/VendureImage';

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

interface ProductDetailGalleryProps {
    images: string[];
    alt: string;
    overlay?: ReactNode;
}

const ProductDetailGallery = ({ images, alt, overlay }: ProductDetailGalleryProps) => {
    const theme = useTheme();
    const [activeStep, setActiveStep] = useState(0);
    const maxSteps = images.length;

    useEffect(() => {
        setActiveStep(0);
    }, [images]);

    if (maxSteps === 0) {
        return null;
    }

    return (
        <Box sx={{ maxWidth: '100%', flexGrow: 1, position: 'relative' }}>
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    height: { xs: 360, md: 560 },
                    overflow: 'hidden',
                    borderRadius: 5,
                    border: `1px solid ${theme.palette.divider}`,
                    background: 'linear-gradient(180deg, rgba(244,234,213,0.8) 0%, rgba(255,253,248,1) 100%)',
                    boxShadow: '0 22px 42px rgba(0,72,37,0.08)',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        inset: 18,
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.58)',
                        pointerEvents: 'none',
                    },
                }}
            >
                <VendureImage
                    src={images[activeStep]}
                    alt={`${alt} - Image ${activeStep + 1}`}
                    fill
                    sizes="(max-width: 900px) 100vw, 50vw"
                    style={{ objectFit: 'contain', padding: 22 }}
                    priority={activeStep === 0}
                />
                {overlay && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            zIndex: 1,
                            p: 2,
                        }}
                    >
                        {overlay}
                    </Box>
                )}
            </Box>

            {maxSteps > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <MobileStepper
                        variant="dots"
                        steps={maxSteps}
                        position="static"
                        activeStep={activeStep}
                        sx={{
                            bgcolor: 'transparent',
                            flexGrow: 1,
                            '& .MuiMobileStepper-dot': {
                                backgroundColor: 'rgba(0,72,37,0.18)',
                            },
                            '& .MuiMobileStepper-dotActive': {
                                backgroundColor: 'primary.main',
                            },
                        }}
                        nextButton={
                            <TooltipIconButton
                                size="small"
                                onClick={() => setActiveStep((prevActiveStep) => prevActiveStep + 1)}
                                disabled={activeStep === maxSteps - 1}
                                tooltip="Ver siguiente imagen"
                                sx={{ bgcolor: 'background.paper', ml: 1, border: `1px solid ${theme.palette.divider}` }}
                            >
                                <IconChevronRight size={20} />
                            </TooltipIconButton>
                        }
                        backButton={
                            <TooltipIconButton
                                size="small"
                                onClick={() => setActiveStep((prevActiveStep) => prevActiveStep - 1)}
                                disabled={activeStep === 0}
                                tooltip="Ver imagen anterior"
                                sx={{ bgcolor: 'background.paper', mr: 1, border: `1px solid ${theme.palette.divider}` }}
                            >
                                <IconChevronLeft size={20} />
                            </TooltipIconButton>
                        }
                    />
                </Box>
            )}
        </Box>
    );
};

const ProductDetail = ({ product, initialSearchParams = {} }: ProductDetailProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { addItemToOrder, cartLoading, customer } = useStorefront();
    const [quantity, setQuantity] = useState(1);
    const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);
    const [personalization, setPersonalization] = useState<PersonalizationValues>(defaultPersonalizationValues);
    const [uploadingPersonalization, setUploadingPersonalization] = useState(false);
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
    const addToCartBusy = cartLoading || uploadingPersonalization;
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

    const findPersonalizationLine = (order: ActiveOrder | null | undefined): ActiveOrderLine | null => {
        if (!order || !selectedVariant?.id) {
            return null;
        }

        const matchingLines = order.lines.filter((line) => {
            const customFields = line.customFields;
            if (!customFields) {
                return false;
            }

            return (
                line.productVariant.id === selectedVariant.id &&
                customFields.frontMode === personalization.frontMode &&
                (customFields.frontText ?? null) ===
                    (personalization.frontMode === 'text' ? personalization.frontText.trim() : null) &&
                customFields.backMode === personalization.backMode &&
                (customFields.backText ?? null) ===
                    (personalization.backMode === 'text' ? personalization.backText.trim() : null)
            );
        });

        return matchingLines[matchingLines.length - 1] ?? null;
    };

    const uploadSelectedFiles = async (order: ActiveOrder, line: ActiveOrderLine) => {
        if (personalization.frontMode === 'image' && personalization.frontFile) {
            await uploadPersonalizationFile({
                orderCode: order.code,
                orderLineId: line.id,
                side: 'front',
                file: personalization.frontFile,
            });
        }

        if (personalization.backMode === 'image' && personalization.backFile) {
            await uploadPersonalizationFile({
                orderCode: order.code,
                orderLineId: line.id,
                side: 'back',
                file: personalization.backFile,
            });
        }
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
        if (!result.success) {
            setFeedback({
                severity: 'error',
                message: result.message || 'No se pudo agregar el producto al carrito.',
            });
            return;
        }

        const line = findPersonalizationLine(result.order);
        if (!result.order || !line) {
            setFeedback({
                severity: 'error',
                message: 'Producto agregado, pero no pudimos identificar la línea para subir el archivo.',
            });
            return;
        }

        setUploadingPersonalization(true);
        try {
            const hasImageUpload =
                personalization.frontMode === 'image' || personalization.backMode === 'image';
            await uploadSelectedFiles(result.order, line);
            setFeedback({
                severity: 'success',
                message: hasImageUpload
                    ? 'Producto agregado al carrito y archivo recibido correctamente.'
                    : 'Producto agregado al carrito con la personalización indicada.',
            });
            setPersonalization(defaultPersonalizationValues());
        } catch (error) {
            setFeedback({
                severity: 'error',
                message:
                    error instanceof Error && error.message
                        ? `Producto agregado, pero no pudimos subir el archivo: ${error.message}`
                        : 'Producto agregado, pero no pudimos subir el archivo.',
            });
        } finally {
            setUploadingPersonalization(false);
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
                        <ProductDetailGallery
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
                                        disabled={addToCartBusy || !canAddToCart}
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
                                    disabled={addToCartBusy || quantity <= 1 || !canAddToCart}
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
                                    disabled={addToCartBusy || !canAddToCart}
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
                                disabled={!canAddToCart || addToCartBusy}
                                tooltip={
                                    !selectedVariant
                                        ? 'Elegí una combinación válida antes de agregar'
                                        : isOutOfStock
                                          ? 'La variante seleccionada no tiene stock'
                                          : 'Agregar esta pieza al carrito'
                                }
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                {uploadingPersonalization
                                    ? 'Subiendo archivo...'
                                    : !selectedVariant
                                      ? 'Seleccioná una combinación válida'
                                      : isOutOfStock
                                        ? 'Sin stock'
                                        : 'Agregar al carrito'}
                            </TooltipButton>

                            {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}

                        </Stack>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ProductDetail;
