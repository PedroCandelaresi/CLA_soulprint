'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import type { Cart } from '@/types/cart';
import { estimateOrderWeight } from '@/lib/andreani/utils';
import { getAndreaniOrderLogistics, quoteAndreani, saveAndreaniSelection } from '@/lib/andreani/client';
import type { AndreaniLogisticsData, AndreaniQuoteResult } from '@/lib/andreani/types';

interface AndreaniShippingPanelProps {
    cart: Cart;
}

const formatCurrency = (value: number, currency: string) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(value);

interface SavedSelection {
    carrier?: string;
    serviceCode?: string;
    serviceName?: string;
    price?: number;
    currency?: string;
    destinationPostalCode?: string;
    destinationCity?: string;
}

interface SavedShipment {
    trackingNumber?: string;
    shipmentId?: string;
    status?: string;
    createdAt?: string;
}

function toString(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    return undefined;
}

function toNumber(value: unknown): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return undefined;
}

function mapSavedSelection(data: Record<string, unknown> | null | undefined): SavedSelection | null {
    if (!data) {
        return null;
    }

    const selection: SavedSelection = {
        carrier: toString(data.andreaniCarrier),
        serviceCode: toString(data.andreaniServiceCode),
        serviceName: toString(data.andreaniServiceName),
        price: toNumber(data.andreaniPrice),
        currency: toString(data.andreaniCurrency),
        destinationPostalCode: toString(data.andreaniDestinationPostalCode),
        destinationCity: toString(data.andreaniDestinationCity),
    };

    if (
        !selection.carrier &&
        !selection.serviceCode &&
        !selection.serviceName &&
        selection.price === undefined &&
        !selection.destinationPostalCode &&
        !selection.destinationCity
    ) {
        return null;
    }

    return selection;
}

function mapSavedShipment(data: Record<string, unknown> | null | undefined): SavedShipment | null {
    if (!data) {
        return null;
    }

    const trackingNumber = toString(data.andreaniTrackingNumber);
    const shipmentId = toString(data.andreaniShipmentId);
    const status = toString(data.andreaniShipmentStatus);
    const createdAt = toString(data.andreaniShipmentDate);
    const hasAny = data.andreaniShipmentCreated === true || trackingNumber || shipmentId || createdAt;

    if (!hasAny) {
        return null;
    }

    return { trackingNumber, shipmentId, status, createdAt };
}

function formatShipmentDate(value?: string): string | null {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AndreaniShippingPanel({ cart }: AndreaniShippingPanelProps) {
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');
    const [quote, setQuote] = useState<AndreaniQuoteResult | null>(null);
    const [quoteAddress, setQuoteAddress] = useState<{ postalCode: string; city: string } | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    const [selectionLoading, setSelectionLoading] = useState(false);
    const [selectionSuccess, setSelectionSuccess] = useState(false);
    const [selectionError, setSelectionError] = useState<string | null>(null);
    const [selectionDestination, setSelectionDestination] = useState<{ postalCode: string; city: string } | null>(null);
    const [savedSelection, setSavedSelection] = useState<SavedSelection | null>(null);
    const [savedShipment, setSavedShipment] = useState<SavedShipment | null>(null);
    const [logisticsLoading, setLogisticsLoading] = useState(false);
    const [logisticsError, setLogisticsError] = useState<string | null>(null);
    const userEditedDestinationRef = useRef(false);

    const weightKg = useMemo(() => estimateOrderWeight(cart), [cart]);
    const orderTotal = useMemo(() => Number((cart.totalWithTax / 100).toFixed(2)), [cart.totalWithTax]);

    useEffect(() => {
        if (!cart.code) {
            setSavedSelection(null);
            setSavedShipment(null);
            setLogisticsError(null);
            return undefined;
        }

        let isActive = true;
        setLogisticsLoading(true);
        setLogisticsError(null);

        getAndreaniOrderLogistics(cart.code)
            .then((response) => {
                if (!isActive) {
                    return;
                }

                if (response.success && response.data) {
                    const selection = mapSavedSelection(response.data);
                    const shipment = mapSavedShipment(response.data);
                    setSavedSelection(selection);
                    setSavedShipment(shipment);
                    if (!userEditedDestinationRef.current) {
                        if (selection?.destinationPostalCode) {
                            setPostalCode(selection.destinationPostalCode);
                        }
                        if (selection?.destinationCity) {
                            setCity(selection.destinationCity);
                        }
                    }
                } else {
                    setSavedSelection(null);
                    setSavedShipment(null);
                    if (response.error) {
                        setLogisticsError(response.error);
                    }
                }
            })
            .catch((error) => {
                if (!isActive) {
                    return;
                }
                console.error('[andreani] Could not load order logistics:', error);
                setSavedSelection(null);
                setSavedShipment(null);
                setLogisticsError('No se pudo cargar la selección Andreani.');
            })
            .finally(() => {
                if (isActive) {
                    setLogisticsLoading(false);
                }
            });

        return () => {
            isActive = false;
        };
    }, [cart.code]);

    useEffect(() => {
        if (!quoteAddress) {
            return;
        }

        if (quoteAddress.postalCode !== postalCode.trim() || quoteAddress.city !== city.trim()) {
            setQuote(null);
            setQuoteAddress(null);
            setSelectionSuccess(false);
            setSelectionError(null);
            setSelectionDestination(null);
        }
    }, [city, postalCode, quoteAddress]);

    const isQuoteReady = Boolean(postalCode.trim() && city.trim() && !quoteLoading);
    const hasSavedSelection = Boolean(savedSelection && savedSelection.serviceCode);
    const selectionMatchesInput = Boolean(
        hasSavedSelection &&
            postalCode.trim() === savedSelection?.destinationPostalCode &&
            city.trim() === savedSelection?.destinationCity,
    );
    const selectionSuccessDestination = selectionSuccess && selectionDestination
        ? selectionDestination
        : selectionMatchesInput && savedSelection?.destinationPostalCode && savedSelection?.destinationCity
            ? { postalCode: savedSelection.destinationPostalCode, city: savedSelection.destinationCity }
            : null;

    async function handleQuote() {
        if (!postalCode.trim() || !city.trim()) {
            setQuoteError('Completá código postal y ciudad para cotizar.');
            return;
        }

        setQuoteLoading(true);
        setQuoteError(null);
        try {
            const payload = {
                destinationPostalCode: postalCode.trim(),
                destinationCity: city.trim(),
                weightKg,
                declaredValue: orderTotal,
                orderTotal,
            };

            const response = await quoteAndreani(payload);
            if (response.success && response.data) {
                setQuote(response.data);
                setQuoteAddress({ postalCode: payload.destinationPostalCode, city: payload.destinationCity });
                setSelectionSuccess(false);
                setSelectionError(null);
            } else {
                setQuote(null);
                setQuoteAddress(null);
                setQuoteError(response.error || 'No se pudo obtener la cotización de Andreani.');
            }
        } finally {
            setQuoteLoading(false);
        }
    }

    async function handleSelection() {
        if (!quote || !quote.serviceCode) {
            setSelectionSuccess(false);
            setSelectionError('No hay un servicio válido para guardar la selección.');
            return;
        }

        setSelectionLoading(true);
        setSelectionError(null);
        try {
            const response = await saveAndreaniSelection({
                orderCode: cart.code,
                carrier: quote.carrier,
                serviceCode: quote.serviceCode,
                serviceName: quote.serviceName ?? 'Andreani',
                price: quote.price,
                currency: quote.currency,
                destinationPostalCode: postalCode.trim(),
                destinationCity: city.trim(),
                metadata: {
                    breakdown: quote.breakdown,
                },
                weightKg,
            });

            if (response.success) {
                setSelectionSuccess(true);
                setSelectionError(null);
                setSelectionDestination({ postalCode: postalCode.trim(), city: city.trim() });
                setSavedSelection({
                    carrier: quote.carrier,
                    serviceCode: quote.serviceCode,
                    serviceName: quote.serviceName ?? 'Andreani',
                    price: quote.price,
                    currency: quote.currency,
                    destinationPostalCode: postalCode.trim(),
                    destinationCity: city.trim(),
                });
                setSavedShipment(null);
                userEditedDestinationRef.current = false;
                userEditedDestinationRef.current = false;
            } else {
                setSelectionSuccess(false);
                setSelectionError(response.error || 'No se pudo guardar la selección en la orden.');
                setSelectionDestination(null);
            }
        } finally {
            setSelectionLoading(false);
        }
    }

    function handleResetQuote() {
        setQuote(null);
        setQuoteAddress(null);
        setSelectionSuccess(false);
        setSelectionError(null);
        setSelectionDestination(null);
        userEditedDestinationRef.current = true;
    }

    return (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
                <Stack spacing={2}>
                    <Typography variant="h6" fontWeight={600}>
                        Envío Andreani
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Cotizá fast delivery antes de confirmar el pago. Los datos se guardan en la orden activa.
                    </Typography>

                    {logisticsLoading ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                            <CircularProgress size={16} />
                            <Typography variant="body2" color="text.secondary">
                                Cargando selección guardada...
                            </Typography>
                        </Stack>
                    ) : null}

                    {logisticsError ? <Alert severity="warning">{logisticsError}</Alert> : null}

                    {savedShipment ? (
                        <Card variant="outlined" sx={{ borderRadius: 2, backgroundColor: '#f6ffed' }}>
                            <CardContent sx={{ p: 2 }}>
                                <Stack spacing={0.5}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Chip label="Guía generada" color="success" size="small" />
                                        <Typography variant="body2" color="text.secondary">
                                            Tracking {savedShipment.trackingNumber ?? savedShipment.shipmentId ?? '—'}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">
                                        Estado: {savedShipment.status ?? 'Sin información'}
                                    </Typography>
                                    {formatShipmentDate(savedShipment.createdAt) ? (
                                        <Typography variant="body2" color="text.secondary">
                                            Fecha: {formatShipmentDate(savedShipment.createdAt)}
                                        </Typography>
                                    ) : null}
                                </Stack>
                            </CardContent>
                        </Card>
                    ) : null}

                    {hasSavedSelection && savedSelection ? (
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardContent sx={{ p: 2 }}>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                        <Chip label="Envío Andreani seleccionado" color="success" size="small" />
                                        <Button variant="text" size="small" onClick={handleResetQuote}>
                                            Recotizar
                                        </Button>
                                    </Stack>
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        {savedSelection.serviceName ?? savedSelection.serviceCode ?? 'Servicio Andreani'}
                                    </Typography>
                                    <Typography variant="h6">
                                        {savedSelection.price !== undefined
                                            ? formatCurrency(savedSelection.price, savedSelection.currency ?? cart.currencyCode)
                                            : 'Precio no disponible'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Destino: {savedSelection.destinationPostalCode ?? '----'} ·{' '}
                                        {savedSelection.destinationCity ?? '----'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Carrier: {savedSelection.carrier ?? 'Andreani'}
                                    </Typography>
                                    {selectionMatchesInput ? (
                                        <Typography variant="body2" color="success.main">
                                            Coincide con los datos de envío actuales.
                                        </Typography>
                                    ) : null}
                                </Stack>
                            </CardContent>
                        </Card>
                    ) : null}

                    {hasSavedSelection && !selectionMatchesInput && savedSelection ? (
                        <Alert severity="info">
                            La selección guardada corresponde a {savedSelection.destinationPostalCode ?? '---'} ·{' '}
                            {savedSelection.destinationCity ?? '---'}. Actualizá el destino y recotizá para refrescar.
                        </Alert>
                    ) : null}

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            label="Código postal"
                            value={postalCode}
                            onChange={(event) => {
                                setPostalCode(event.target.value);
                                userEditedDestinationRef.current = true;
                            }}
                            fullWidth
                        />
                        <TextField
                            label="Ciudad"
                            value={city}
                            onChange={(event) => {
                                setCity(event.target.value);
                                userEditedDestinationRef.current = true;
                            }}
                            fullWidth
                        />
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                        <Typography variant="body2" color="text.secondary">
                            Peso estimado: {weightKg} kg
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Declarado: {formatCurrency(orderTotal, cart.currencyCode)}
                        </Typography>
                    </Stack>

                    {quoteError ? <Alert severity="error">{quoteError}</Alert> : null}

                    <Button
                        variant="contained"
                        onClick={handleQuote}
                        disabled={!isQuoteReady}
                        endIcon={quoteLoading ? <CircularProgress size={18} color="inherit" /> : null}
                    >
                        {quoteLoading ? 'Cotizando...' : 'Cotizar con Andreani'}
                    </Button>

                    {quote ? (
                        <Card variant="outlined" sx={{ backgroundColor: 'background.paper' }}>
                            <CardContent>
                                <Stack spacing={1}>
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        {quote.serviceName ?? 'Servicio Andreani'}
                                    </Typography>
                                    <Typography variant="h5">
                                        {formatCurrency(quote.price, quote.currency)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Entrega estimada: {quote.estimatedDelivery ?? 'No especificada'}
                                    </Typography>

                                    {quote.breakdown ? (
                                        <Stack spacing={0.5}>
                                            <Divider />
                                            {Object.entries(quote.breakdown).map(([label, value]) =>
                                                value !== null && value !== undefined ? (
                                                    <Typography key={label} variant="body2" color="text.secondary">
                                                        {label}: {formatCurrency(value, quote.currency)}
                                                    </Typography>
                                                ) : null,
                                            )}
                                        </Stack>
                                    ) : null}

                                    <Box sx={{ mt: 2 }}>
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            onClick={handleSelection}
                                            disabled={selectionLoading || selectionSuccess || !quote.serviceCode}
                                            endIcon={selectionLoading ? <CircularProgress size={18} color="inherit" /> : null}
                                        >
                                            {selectionSuccess ? 'Selección guardada' : 'Guardar selección en la orden'}
                                        </Button>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    ) : null}

                    {selectionSuccessDestination ? (
                        <Alert severity="success">
                            Selección registrada para {selectionSuccessDestination.postalCode} · {selectionSuccessDestination.city}.
                        </Alert>
                    ) : null}
                    {selectionError ? (
                        <Alert severity="error">{selectionError}</Alert>
                    ) : null}
                </Stack>
            </CardContent>
        </Card>
    );
}
