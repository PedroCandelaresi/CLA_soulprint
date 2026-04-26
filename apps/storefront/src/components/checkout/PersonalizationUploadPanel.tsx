'use client';

import { useMemo, useState } from 'react';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TextFieldsOutlinedIcon from '@mui/icons-material/TextFieldsOutlined';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import type {
    PersonalizationLineData,
    PersonalizationLineStatus,
    PersonalizationOrderData,
} from '@/lib/personalization/types';
import PersonalizationAssetPreview from './PersonalizationAssetPreview';

type Side = 'front' | 'back';

type PersonalizationUploadPanelProps = {
    data: PersonalizationOrderData | null;
    loading: boolean;
    error: string | null;
    uploadingLineId: string | null;
    onReload: () => void;
    onUpload: (line: PersonalizationLineData, side: Side, file: File, notes: string) => Promise<void>;
};

const ACCEPTED_FILE_TYPES = 'image/jpeg,image/png,image/webp,application/pdf';

function statusChip(status: PersonalizationLineStatus) {
    if (status === 'uploaded' || status === 'approved') {
        return { label: status === 'approved' ? 'Aprobado' : 'Recibido', color: 'success' as const };
    }
    if (status === 'rejected') return { label: 'Rechazado', color: 'error' as const };
    if (status === 'pending-upload') return { label: 'Pendiente', color: 'warning' as const };
    return { label: 'N/A', color: 'default' as const };
}

function UploadSlot({
    label,
    sideKey,
    line,
    uploadingLineId,
    onUpload,
}: {
    label: string;
    sideKey: Side;
    line: PersonalizationLineData;
    uploadingLineId: string | null;
    onUpload: PersonalizationUploadPanelProps['onUpload'];
}) {
    const [file, setFile] = useState<File | null>(null);
    const isUploading = uploadingLineId === `${line.orderLineId}:${sideKey}`;
    const existingAsset = sideKey === 'front' ? line.frontAsset : line.backAsset;
    const existingFileName = sideKey === 'front' ? line.frontSnapshotFileName : line.backSnapshotFileName;
    const uploadedAt = sideKey === 'front' ? line.frontUploadedAt : line.backUploadedAt;

    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: existingAsset ? 'success.light' : 'rgba(0,72,37,0.12)',
                bgcolor: existingAsset ? 'rgba(232,245,233,0.5)' : 'rgba(255,252,248,0.7)',
            }}
        >
            <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
                    {existingAsset && (
                        <Chip
                            icon={<CheckCircleOutlineIcon />}
                            label={uploadedAt ? `Recibido` : 'Recibido'}
                            color="success"
                            size="small"
                            variant="outlined"
                        />
                    )}
                </Stack>

                {existingAsset && (
                    <PersonalizationAssetPreview
                        asset={existingAsset}
                        fileName={existingFileName}
                        label={`Vista previa ${label.toLowerCase()}`}
                    />
                )}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Button
                        component="label"
                        variant="outlined"
                        size="small"
                        startIcon={<UploadFileOutlinedIcon />}
                        disabled={isUploading}
                        sx={{ minWidth: 160 }}
                    >
                        {file ? 'Cambiar' : existingAsset ? 'Reemplazar' : 'Elegir archivo'}
                        <Box
                            component="input"
                            type="file"
                            accept={ACCEPTED_FILE_TYPES}
                            sx={{ display: 'none' }}
                            onChange={e => setFile(e.currentTarget.files?.[0] ?? null)}
                        />
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                        {file ? file.name : 'JPG, PNG, WEBP o PDF'}
                    </Typography>
                </Stack>

                {file && (
                    <Stack direction="row" justifyContent="flex-end">
                        <Button
                            variant="contained"
                            size="small"
                            disabled={isUploading}
                            onClick={async () => {
                                await onUpload(line, sideKey, file, '');
                                setFile(null);
                            }}
                        >
                            {isUploading ? <><CircularProgress size={14} sx={{ mr: 1 }} />Subiendo...</> : 'Subir imagen'}
                        </Button>
                    </Stack>
                )}
            </Stack>
        </Box>
    );
}

function TextSlot({ label, text }: { label: string; text: string | null }) {
    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'success.light',
                bgcolor: 'rgba(232,245,233,0.5)',
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <TextFieldsOutlinedIcon sx={{ color: 'success.dark', mt: 0.2, flexShrink: 0 }} fontSize="small" />
                <Box>
                    <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontStyle: 'italic' }}>
                        &ldquo;{text ?? ''}&rdquo;
                    </Typography>
                </Box>
                <Chip label="Listo" color="success" size="small" variant="outlined" sx={{ ml: 'auto', flexShrink: 0 }} />
            </Stack>
        </Box>
    );
}

function getOverallCopy(data: PersonalizationOrderData | null): string {
    if (!data) return 'Verificando el estado de personalización del pedido...';
    if (!data.requiresPersonalization) return 'Este pedido no requiere archivos adicionales.';
    if (data.overallPersonalizationStatus === 'complete') return 'Ya tenemos todo lo necesario para producir tu pedido.';
    if (data.overallPersonalizationStatus === 'partial') return 'Recibimos parte de los archivos. Completá los pendientes.';
    return 'Subí las imágenes requeridas para que podamos producir tu pedido.';
}

export function PersonalizationUploadPanel({
    data,
    loading,
    error,
    uploadingLineId,
    onReload,
    onUpload,
}: PersonalizationUploadPanelProps) {
    const requiredLines = useMemo(
        () => data?.lines.filter(l => l.requiresPersonalization) ?? [],
        [data],
    );

    if (!loading && !error && data && !data.requiresPersonalization) return null;

    return (
        <Paper
            variant="outlined"
            sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, bgcolor: 'rgba(255,253,248,0.88)' }}
        >
            <Stack spacing={2.5}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1.5}
                >
                    <Box>
                        <Typography variant="h5" fontWeight={800}>Personalización del pedido</Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                            {getOverallCopy(data)}
                        </Typography>
                    </Box>
                    {data?.requiresPersonalization && (
                        <Chip
                            label={data.overallPersonalizationStatus === 'complete' ? 'Completo' : 'Pendiente'}
                            color={data.overallPersonalizationStatus === 'complete' ? 'success' : 'warning'}
                            variant="outlined"
                        />
                    )}
                </Stack>

                {loading && (
                    <Alert severity="info" icon={<CircularProgress size={18} />}>
                        Consultando estado de personalización...
                    </Alert>
                )}

                {error && (
                    <Alert
                        severity="warning"
                        action={<Button color="inherit" size="small" onClick={onReload}>Reintentar</Button>}
                    >
                        {error}
                    </Alert>
                )}

                {requiredLines.map((line, idx) => (
                    <Box key={line.orderLineId}>
                        {idx > 0 && <Divider sx={{ mb: 2.5 }} />}

                        <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography fontWeight={700}>{line.productName}</Typography>
                                    {line.variantName && (
                                        <Typography variant="caption" color="text.secondary">
                                            {line.variantName}
                                        </Typography>
                                    )}
                                    {line.quantity > 1 && (
                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                            · x{line.quantity}
                                        </Typography>
                                    )}
                                </Box>
                                <Chip
                                    {...statusChip(line.personalizationStatus)}
                                    variant="outlined"
                                    size="small"
                                />
                            </Stack>

                            {/* Frente */}
                            {line.frontMode === 'text'
                                ? <TextSlot label="Frente" text={line.frontText} />
                                : <UploadSlot
                                    label="Frente"
                                    sideKey="front"
                                    line={line}
                                    uploadingLineId={uploadingLineId}
                                    onUpload={onUpload}
                                />
                            }

                            {/* Dorso */}
                            {line.backMode !== 'none' && (
                                line.backMode === 'text'
                                    ? <TextSlot label="Dorso" text={line.backText} />
                                    : <UploadSlot
                                        label="Dorso"
                                        sideKey="back"
                                        line={line}
                                        uploadingLineId={uploadingLineId}
                                        onUpload={onUpload}
                                    />
                            )}
                        </Stack>
                    </Box>
                ))}
            </Stack>
        </Paper>
    );
}
