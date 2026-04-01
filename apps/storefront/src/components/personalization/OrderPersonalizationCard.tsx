'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import type { PersonalizationOrderResponseData } from '@/types/personalization';
import {
    getOrderPersonalization,
    personalizationStorage,
    uploadOrderPersonalization,
} from '@/lib/personalization/client';

interface OrderPersonalizationCardProps {
    orderCode: string;
    transactionId?: string;
    initialAccessToken?: string | null;
    title?: string;
}

function formatDate(value: string | null): string | null {
    if (!value) {
        return null;
    }
    try {
        return new Date(value).toLocaleString('es-AR', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch {
        return value;
    }
}

function isImageMimeType(value: string | null): boolean {
    return typeof value === 'string' && value.startsWith('image/');
}

function canUploadForPaymentState(value: string): boolean {
    return ['Authorized', 'Settled', 'approved', 'PaymentAuthorized', 'PaymentSettled'].includes(value);
}

export default function OrderPersonalizationCard({
    orderCode,
    transactionId,
    initialAccessToken,
    title = 'Subí la foto de tu pedido',
}: OrderPersonalizationCardProps) {
    const [data, setData] = useState<PersonalizationOrderResponseData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [notes, setNotes] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [copyMessage, setCopyMessage] = useState<string | null>(null);

    const accessToken = data?.accessToken
        || initialAccessToken
        || personalizationStorage.getAccessToken(orderCode)
        || undefined;

    useEffect(() => {
        if (!selectedFile || !selectedFile.type.startsWith('image/')) {
            setPreviewUrl(null);
            return;
        }

        const nextUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(nextUrl);

        return () => {
            URL.revokeObjectURL(nextUrl);
        };
    }, [selectedFile]);

    async function loadStatus() {
        setIsLoading(true);
        const response = await getOrderPersonalization({
            orderCode,
            transactionId,
            accessToken,
        });

        if (!response.success || !response.data) {
            setError(response.error || 'No se pudo consultar la personalización del pedido.');
            setData(null);
            setIsLoading(false);
            return;
        }

        if (response.data.accessToken) {
            personalizationStorage.setAccessToken(orderCode, response.data.accessToken);
        }

        setData(response.data);
        setNotes(response.data.notes || '');
        setError(null);
        setIsLoading(false);
    }

    useEffect(() => {
        void loadStatus();
    }, [orderCode, transactionId, initialAccessToken]);

    async function handleUpload() {
        if (!selectedFile) {
            setError('Seleccioná un archivo antes de guardarlo.');
            return;
        }

        setIsUploading(true);
        setError(null);

        const response = await uploadOrderPersonalization({
            orderCode,
            file: selectedFile,
            notes,
            transactionId,
            accessToken,
        });

        if (!response.success || !response.data) {
            setError(response.error || 'No se pudo subir el archivo.');
            setIsUploading(false);
            return;
        }

        if (response.data.accessToken) {
            personalizationStorage.setAccessToken(orderCode, response.data.accessToken);
        }

        setSelectedFile(null);
        await loadStatus();
        setIsUploading(false);
    }

    async function handleCopyReentryLink() {
        if (!accessToken || typeof window === 'undefined') {
            return;
        }

        const url = `${window.location.origin}/ordenes/${encodeURIComponent(orderCode)}?token=${encodeURIComponent(accessToken)}`;
        await navigator.clipboard.writeText(url);
        setCopyMessage('Link copiado');
        window.setTimeout(() => setCopyMessage(null), 2500);
    }

    const reentryHref = useMemo(() => {
        if (!accessToken) {
            return null;
        }
        return `/ordenes/${encodeURIComponent(orderCode)}?token=${encodeURIComponent(accessToken)}`;
    }, [accessToken, orderCode]);

    if (isLoading) {
        return (
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <CircularProgress size={20} />
                        <Typography>Consultando la personalización de tu pedido...</Typography>
                    </Stack>
                </CardContent>
            </Card>
        );
    }

    if (error && !data) {
        return (
            <Alert
                severity="warning"
                action={(
                    <Button color="inherit" size="small" onClick={() => void loadStatus()} startIcon={<RefreshOutlinedIcon />}>
                        Reintentar
                    </Button>
                )}
            >
                {error}
            </Alert>
        );
    }

    if (!data) {
        return null;
    }

    const formattedUploadDate = formatDate(data.uploadedAt);
    const hasUploadedAsset = Boolean(data.assetUrl);
    const uploadAllowed = data.requiresPersonalization && canUploadForPaymentState(data.paymentState);
    const isPendingRequired = data.requiresPersonalization && data.personalizationStatus === 'pending';

    return (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            {title}
                        </Typography>
                        <Typography color="text.secondary">
                            Pedido {data.orderCode}. Estado actual: {data.personalizationStatus === 'uploaded' ? 'foto subida' : data.personalizationStatus === 'pending' ? 'pendiente' : 'no requerida'}.
                        </Typography>
                    </Box>

                    {isPendingRequired && (
                        <Alert severity="warning">
                            Acción requerida: este pedido necesita una foto para poder fabricarse. La orden seguirá pendiente hasta que recibamos el archivo.
                        </Alert>
                    )}

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                        <Box flex={1}>
                            <Stack spacing={1}>
                                <Typography variant="body2" color="text.secondary">
                                    Pago: {data.paymentState}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Envío: {data.shipmentState || 'todavía sin novedades'}
                                </Typography>
                                {data.trackingNumber && (
                                    <Typography variant="body2" color="text.secondary">
                                        Tracking Andreani: {data.trackingNumber}
                                    </Typography>
                                )}
                                {data.requiredItems.length > 0 && (
                                    <Typography variant="body2" color="text.secondary">
                                        Productos que requieren foto: {data.requiredItems.map((item) => item.productName).join(', ')}
                                    </Typography>
                                )}
                            </Stack>
                        </Box>

                        {hasUploadedAsset && (
                            <Box
                                sx={{
                                    width: { xs: '100%', md: 180 },
                                    flexShrink: 0,
                                }}
                            >
                                {isImageMimeType(data.assetMimeType) && data.assetPreviewUrl ? (
                                    <Box
                                        component="img"
                                        src={data.assetPreviewUrl}
                                        alt={data.originalFilename || 'Archivo subido'}
                                        sx={{
                                            width: '100%',
                                            height: 180,
                                            objectFit: 'cover',
                                            borderRadius: 2,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    />
                                ) : (
                                    <Box
                                        sx={{
                                            borderRadius: 2,
                                            border: '1px dashed',
                                            borderColor: 'divider',
                                            p: 3,
                                            textAlign: 'center',
                                        }}
                                    >
                                        <Typography variant="body2">Archivo cargado</Typography>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Stack>

                    {data.personalizationStatus === 'not-required' && (
                        <Alert severity="info">
                            Esta orden todavía no tiene una foto pendiente de carga.
                        </Alert>
                    )}

                    {data.requiresPersonalization && data.personalizationStatus === 'pending' && !uploadAllowed && (
                        <Alert severity="info">
                            Tu pago todavía se está confirmando. Cuando quede acreditado vas a poder subir la foto desde esta misma pantalla.
                        </Alert>
                    )}

                    {hasUploadedAsset && (
                        <Alert severity="success">
                            Archivo recibido.
                            {data.originalFilename ? ` Actual: ${data.originalFilename}.` : ''}
                            {formattedUploadDate ? ` Subido el ${formattedUploadDate}.` : ' La foto ya fue subida.'}
                        </Alert>
                    )}

                    {error && data && (
                        <Alert severity="error">
                            {error}
                        </Alert>
                    )}

                    {data.requiresPersonalization && (
                        <>
                            <Divider />

                            <Stack spacing={2}>
                                <Typography fontWeight={600}>
                                    {hasUploadedAsset ? 'Reemplazar archivo obligatorio' : 'Archivo obligatorio para personalizar'}
                                </Typography>

                                <Typography variant="body2" color="text.secondary">
                                    Sin esta imagen el pedido queda pendiente. Si volvés a cargar un archivo nuevo, reemplaza al anterior.
                                </Typography>

                                <Button
                                    component="label"
                                    variant="outlined"
                                    startIcon={<CloudUploadOutlinedIcon />}
                                >
                                    {selectedFile ? 'Cambiar archivo' : 'Seleccionar archivo'}
                                    <input
                                        hidden
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0] || null;
                                            setSelectedFile(file);
                                        }}
                                    />
                                </Button>

                                {selectedFile && (
                                    <Typography variant="body2" color="text.secondary">
                                        Seleccionado: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                                    </Typography>
                                )}

                                {previewUrl && (
                                    <Box
                                        component="img"
                                        src={previewUrl}
                                        alt={selectedFile?.name || 'Vista previa'}
                                        sx={{
                                            width: '100%',
                                            maxWidth: 360,
                                            borderRadius: 2,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    />
                                )}

                                <TextField
                                    label="Notas para el taller"
                                    multiline
                                    minRows={3}
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                    placeholder="Ejemplo: usar la cara completa, priorizar nitidez, etc."
                                />

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <Button
                                        variant="contained"
                                        onClick={() => void handleUpload()}
                                        disabled={!selectedFile || isUploading || !uploadAllowed}
                                        startIcon={isUploading ? <CircularProgress size={18} color="inherit" /> : <CloudUploadOutlinedIcon />}
                                    >
                                        {isUploading ? 'Guardando...' : hasUploadedAsset ? 'Reemplazar archivo' : 'Guardar foto obligatoria'}
                                    </Button>

                                    {data.assetUrl && (
                                        <Button
                                            component={Link}
                                            href={data.assetUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            variant="outlined"
                                            startIcon={<OpenInNewOutlinedIcon />}
                                        >
                                            Ver archivo actual
                                        </Button>
                                    )}
                                </Stack>
                            </Stack>
                        </>
                    )}

                    {reentryHref && (
                        <>
                            <Divider />
                            <Stack spacing={1}>
                                <Typography variant="body2" color="text.secondary">
                                    Si querés volver más tarde, usá este link seguro para completar la foto del pedido.
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <Button
                                        component={Link}
                                        href={reentryHref}
                                        variant="outlined"
                                        startIcon={<OpenInNewOutlinedIcon />}
                                    >
                                        Abrir vista del pedido
                                    </Button>
                                    <Button
                                        variant="text"
                                        onClick={() => void handleCopyReentryLink()}
                                        startIcon={<ContentCopyOutlinedIcon />}
                                    >
                                        Copiar link
                                    </Button>
                                </Stack>
                                {copyMessage && (
                                    <Typography variant="caption" color="success.main">
                                        {copyMessage}
                                    </Typography>
                                )}
                            </Stack>
                        </>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}
