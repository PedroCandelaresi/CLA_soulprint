'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import type { PersonalizationLineSummary, PersonalizationOrderResponseData } from '@/types/personalization';
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

function isImageMimeType(value: string | null | undefined): boolean {
    return typeof value === 'string' && value.startsWith('image/');
}

function canUploadForPaymentState(value: string): boolean {
    return ['Authorized', 'Settled', 'approved', 'PaymentAuthorized', 'PaymentSettled'].includes(value);
}

function getOverallStatusCopy(data: PersonalizationOrderResponseData): string {
    switch (data.overallPersonalizationStatus) {
        case 'complete':
            return 'todos los archivos requeridos fueron recibidos';
        case 'partial':
            return 'faltan archivos para algunas líneas';
        case 'pending':
            return 'faltan archivos obligatorios';
        default:
            return 'no requiere personalización';
    }
}

function getLineStatusLabel(status: PersonalizationLineSummary['personalizationStatus']): string {
    switch (status) {
        case 'uploaded':
            return 'Archivo cargado';
        case 'approved':
            return 'Aprobado';
        case 'rejected':
            return 'Rechazado';
        case 'pending-upload':
            return 'Pendiente';
        default:
            return 'No requerida';
    }
}

function getLineStatusColor(status: PersonalizationLineSummary['personalizationStatus']): 'default' | 'warning' | 'success' | 'error' {
    switch (status) {
        case 'uploaded':
        case 'approved':
            return 'success';
        case 'rejected':
            return 'error';
        case 'pending-upload':
            return 'warning';
        default:
            return 'default';
    }
}

function getDefaultSelectedLineId(data: PersonalizationOrderResponseData | null): string | null {
    if (!data) {
        return null;
    }
    const requiredLines = data.lines.filter((line) => line.requiresPersonalization);
    return (
        requiredLines.find((line) => !['uploaded', 'approved'].includes(line.personalizationStatus))?.orderLineId
        ?? requiredLines[0]?.orderLineId
        ?? null
    );
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
    const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [notes, setNotes] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [copyMessage, setCopyMessage] = useState<string | null>(null);

    const accessToken = data?.accessToken
        || initialAccessToken
        || personalizationStorage.getAccessToken(orderCode)
        || undefined;

    const requiredLines = useMemo(
        () => data?.lines.filter((line) => line.requiresPersonalization) ?? [],
        [data],
    );
    const activeLine = useMemo(
        () => requiredLines.find((line) => line.orderLineId === selectedLineId) ?? requiredLines[0] ?? null,
        [requiredLines, selectedLineId],
    );

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

    useEffect(() => {
        const nextSelectedLineId = getDefaultSelectedLineId(data);
        if (!selectedLineId || !requiredLines.some((line) => line.orderLineId === selectedLineId)) {
            setSelectedLineId(nextSelectedLineId);
        }
    }, [data, requiredLines, selectedLineId]);

    useEffect(() => {
        setNotes(activeLine?.notes || '');
        setSelectedFile(null);
    }, [activeLine?.orderLineId]);

    async function loadStatus() {
        setIsLoading(true);
        const response = await getOrderPersonalization({
            orderCode,
            transactionId,
            accessToken,
        });
        const responseData = response.data ?? null;

        if (!response.success || !responseData) {
            setError(response.error || 'No se pudo consultar la personalización del pedido.');
            setData(null);
            setIsLoading(false);
            return;
        }

        if (responseData.accessToken) {
            personalizationStorage.setAccessToken(orderCode, responseData.accessToken);
        }

        setData(responseData);
        setSelectedLineId((current) => {
            if (current && responseData.lines.some((line) => line.orderLineId === current)) {
                return current;
            }
            return getDefaultSelectedLineId(responseData);
        });
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
        if (!activeLine) {
            setError('Seleccioná primero una línea que requiera personalización.');
            return;
        }

        setIsUploading(true);
        setError(null);

        const response = await uploadOrderPersonalization({
            orderCode,
            orderLineId: activeLine.orderLineId,
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

    const uploadAllowed = data.requiresPersonalization && canUploadForPaymentState(data.paymentState);
    const hasMissingFiles = ['pending', 'partial'].includes(data.overallPersonalizationStatus);
    const activeLineHasAsset = Boolean(activeLine?.asset?.source);
    const activeLineUploadedAt = formatDate(activeLine?.uploadedAt ?? null);

    return (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            {title}
                        </Typography>
                        <Typography color="text.secondary">
                            Pedido {data.orderCode}. Estado actual: {getOverallStatusCopy(data)}.
                        </Typography>
                    </Box>

                    {data.requiresPersonalization && hasMissingFiles && (
                        <Alert severity="warning">
                            Acción requerida: faltan archivos de personalización para una o más líneas del pedido.
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
                                {requiredLines.length > 0 && (
                                    <Typography variant="body2" color="text.secondary">
                                        Productos que requieren archivo: {requiredLines.map((line) => line.productName).join(', ')}
                                    </Typography>
                                )}
                            </Stack>
                        </Box>
                    </Stack>

                    {!data.requiresPersonalization && (
                        <Alert severity="info">
                            Esta orden no requiere archivos de personalización.
                        </Alert>
                    )}

                    {data.requiresPersonalization && !uploadAllowed && hasMissingFiles && (
                        <Alert severity="info">
                            Tu pago todavía se está confirmando. Cuando quede acreditado vas a poder subir los archivos pendientes desde esta pantalla.
                        </Alert>
                    )}

                    {error && data && (
                        <Alert severity="error">
                            {error}
                        </Alert>
                    )}

                    {requiredLines.length > 0 && (
                        <>
                            <Divider />
                            <Stack spacing={2}>
                                <Typography fontWeight={600}>
                                    Líneas que requieren personalización
                                </Typography>

                                {requiredLines.map((line) => {
                                    const selected = line.orderLineId === activeLine?.orderLineId;
                                    return (
                                        <Card
                                            key={line.orderLineId}
                                            variant="outlined"
                                            sx={{
                                                borderRadius: 2.5,
                                                borderColor: selected ? 'primary.main' : 'divider',
                                                backgroundColor: selected ? 'action.hover' : 'background.paper',
                                            }}
                                        >
                                            <CardContent sx={{ p: 2 }}>
                                                <Stack
                                                    direction={{ xs: 'column', md: 'row' }}
                                                    spacing={2}
                                                    justifyContent="space-between"
                                                    alignItems={{ xs: 'flex-start', md: 'center' }}
                                                >
                                                    <Stack spacing={0.75}>
                                                        <Typography fontWeight={600}>
                                                            {line.productName}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {line.variantName || 'Variante estándar'}
                                                        </Typography>
                                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                                            <Chip
                                                                size="small"
                                                                color={getLineStatusColor(line.personalizationStatus)}
                                                                label={getLineStatusLabel(line.personalizationStatus)}
                                                            />
                                                            {line.snapshotFileName ? (
                                                                <Chip size="small" variant="outlined" label={line.snapshotFileName} />
                                                            ) : null}
                                                        </Stack>
                                                        {line.uploadedAt ? (
                                                            <Typography variant="body2" color="text.secondary">
                                                                Última carga: {formatDate(line.uploadedAt)}
                                                            </Typography>
                                                        ) : null}
                                                    </Stack>

                                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                                        {line.asset?.source ? (
                                                            <Button
                                                                component={Link}
                                                                href={line.asset.source}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                variant="text"
                                                                startIcon={<OpenInNewOutlinedIcon />}
                                                            >
                                                                Ver archivo
                                                            </Button>
                                                        ) : null}
                                                        <Button
                                                            variant={selected ? 'contained' : 'outlined'}
                                                            onClick={() => setSelectedLineId(line.orderLineId)}
                                                        >
                                                            {selected ? 'Seleccionada' : 'Seleccionar'}
                                                        </Button>
                                                    </Stack>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </Stack>
                        </>
                    )}

                    {activeLine && (
                        <>
                            <Divider />

                            <Stack spacing={2}>
                                <Typography fontWeight={600}>
                                    {activeLineHasAsset ? 'Reemplazar archivo de la línea seleccionada' : 'Subir archivo para la línea seleccionada'}
                                </Typography>

                                <Typography variant="body2" color="text.secondary">
                                    Línea activa: {activeLine.productName}
                                    {activeLine.variantName ? ` · ${activeLine.variantName}` : ''}.
                                </Typography>

                                {activeLineHasAsset && (
                                    <Alert severity="success">
                                        Archivo actual registrado
                                        {activeLine.snapshotFileName ? `: ${activeLine.snapshotFileName}.` : '.'}
                                        {activeLineUploadedAt ? ` Subido el ${activeLineUploadedAt}.` : ''}
                                    </Alert>
                                )}

                                {activeLine.asset?.preview && isImageMimeType(activeLine.asset.mimeType) ? (
                                    <Box
                                        component="img"
                                        src={activeLine.asset.preview}
                                        alt={activeLine.snapshotFileName || activeLine.productName}
                                        sx={{
                                            width: '100%',
                                            maxWidth: { xs: '100%', sm: 360 },
                                            borderRadius: 2,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    />
                                ) : null}

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
                                            maxWidth: { xs: '100%', sm: 360 },
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
                                        {isUploading ? 'Guardando...' : activeLineHasAsset ? 'Reemplazar archivo' : 'Guardar archivo'}
                                    </Button>

                                    {activeLine.asset?.source && (
                                        <Button
                                            component={Link}
                                            href={activeLine.asset.source}
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
                                    Si querés volver más tarde, usá este link seguro para completar la personalización del pedido.
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
