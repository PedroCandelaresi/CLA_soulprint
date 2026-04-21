'use client';

import { useMemo, useState } from 'react';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import type {
    PersonalizationLineData,
    PersonalizationLineStatus,
    PersonalizationOrderData,
} from '@/lib/personalization/types';

type PersonalizationUploadPanelProps = {
    data: PersonalizationOrderData | null;
    loading: boolean;
    error: string | null;
    uploadingLineId: string | null;
    onReload: () => void;
    onUpload: (line: PersonalizationLineData, file: File, notes: string) => Promise<void>;
};

const ACCEPTED_FILE_TYPES = 'image/jpeg,image/png,image/webp,application/pdf';

function getLineStatusCopy(status: PersonalizationLineStatus): {
    label: string;
    tone: 'default' | 'success' | 'warning' | 'error';
} {
    if (status === 'uploaded') {
        return { label: 'Archivo recibido', tone: 'success' };
    }
    if (status === 'approved') {
        return { label: 'Aprobado', tone: 'success' };
    }
    if (status === 'rejected') {
        return { label: 'Rechazado', tone: 'error' };
    }
    if (status === 'pending-upload') {
        return { label: 'Pendiente', tone: 'warning' };
    }
    return { label: 'No requerido', tone: 'default' };
}

function getOverallCopy(data: PersonalizationOrderData | null): string {
    if (!data) {
        return 'Estamos revisando si este pedido necesita una foto para personalizar el producto.';
    }
    if (!data.requiresPersonalization) {
        return 'Este pedido no requiere archivos adicionales.';
    }
    if (data.overallPersonalizationStatus === 'complete') {
        return 'Ya recibimos todos los archivos necesarios para preparar tu pedido.';
    }
    if (data.overallPersonalizationStatus === 'partial') {
        return 'Ya recibimos parte de los archivos. Falta completar las líneas pendientes.';
    }
    return 'Para avanzar con la producción, subí la foto indicada en cada producto personalizado.';
}

export function PersonalizationUploadPanel({
    data,
    loading,
    error,
    uploadingLineId,
    onReload,
    onUpload,
}: PersonalizationUploadPanelProps) {
    const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
    const [notesByLine, setNotesByLine] = useState<Record<string, string>>({});
    const requiredLines = useMemo(
        () => data?.lines.filter((line) => line.requiresPersonalization) ?? [],
        [data],
    );

    if (!loading && !error && data && !data.requiresPersonalization) {
        return null;
    }

    return (
        <Paper
            variant="outlined"
            sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: 3,
                bgcolor: 'rgba(255, 253, 248, 0.86)',
            }}
        >
            <Stack spacing={2.25}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                    <Box>
                        <Typography variant="h5" fontWeight={800}>
                            Personalización del producto
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                            {getOverallCopy(data)}
                        </Typography>
                    </Box>

                    {data?.requiresPersonalization && (
                        <Chip
                            label={
                                data.overallPersonalizationStatus === 'complete'
                                    ? 'Completo'
                                    : 'Acción requerida'
                            }
                            color={
                                data.overallPersonalizationStatus === 'complete'
                                    ? 'success'
                                    : 'warning'
                            }
                            variant="outlined"
                        />
                    )}
                </Stack>

                {loading && (
                    <Alert severity="info" icon={<CircularProgress size={18} />}>
                        Consultando el estado de personalización del pedido...
                    </Alert>
                )}

                {error && (
                    <Alert
                        severity="warning"
                        action={
                            <Button color="inherit" size="small" onClick={onReload}>
                                Reintentar
                            </Button>
                        }
                    >
                        {error}
                    </Alert>
                )}

                {requiredLines.length > 0 && (
                    <Stack spacing={1.5}>
                        {requiredLines.map((line) => {
                            const selectedFile = selectedFiles[line.orderLineId] ?? null;
                            const notes = notesByLine[line.orderLineId] ?? line.notes ?? '';
                            const statusCopy = getLineStatusCopy(line.personalizationStatus);
                            const isUploading = uploadingLineId === line.orderLineId;

                            return (
                                <Paper
                                    key={line.orderLineId}
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        bgcolor: 'background.paper',
                                    }}
                                >
                                    <Stack spacing={1.75}>
                                        <Stack
                                            direction={{ xs: 'column', sm: 'row' }}
                                            spacing={1.25}
                                            justifyContent="space-between"
                                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                                        >
                                            <Box>
                                                <Typography fontWeight={800}>
                                                    {line.productName}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {line.variantName}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={statusCopy.label}
                                                color={statusCopy.tone}
                                                variant="outlined"
                                            />
                                        </Stack>

                                        {line.asset && (
                                            <Alert severity="success">
                                                Archivo actual: {line.snapshotFileName || 'imagen recibida'}.
                                                Podés cargar otro si necesitás corregirlo.
                                            </Alert>
                                        )}

                                        <Divider />

                                        <Stack
                                            direction={{ xs: 'column', md: 'row' }}
                                            spacing={1.5}
                                            alignItems={{ xs: 'stretch', md: 'flex-start' }}
                                        >
                                            <Button
                                                component="label"
                                                variant="outlined"
                                                startIcon={<UploadFileOutlinedIcon />}
                                                disabled={isUploading}
                                                sx={{ minWidth: { md: 190 } }}
                                            >
                                                {selectedFile ? 'Cambiar archivo' : 'Elegir archivo'}
                                                <Box
                                                    component="input"
                                                    type="file"
                                                    accept={ACCEPTED_FILE_TYPES}
                                                    sx={{ display: 'none' }}
                                                    onChange={(event) => {
                                                        const file = event.currentTarget.files?.[0] ?? null;
                                                        setSelectedFiles((current) => ({
                                                            ...current,
                                                            [line.orderLineId]: file,
                                                        }));
                                                    }}
                                                />
                                            </Button>

                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    {selectedFile
                                                        ? selectedFile.name
                                                        : 'JPG, PNG, WEBP o PDF. Máximo configurado en Vendure.'}
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <TextField
                                            label="Indicaciones para esta foto"
                                            placeholder="Ej: usar el rostro completo, evitar recortes, preferencia de encuadre..."
                                            value={notes}
                                            minRows={2}
                                            multiline
                                            disabled={isUploading}
                                            onChange={(event) => {
                                                setNotesByLine((current) => ({
                                                    ...current,
                                                    [line.orderLineId]: event.target.value,
                                                }));
                                            }}
                                        />

                                        <Stack direction="row" justifyContent="flex-end">
                                            <Button
                                                variant="contained"
                                                disabled={!selectedFile || isUploading}
                                                onClick={async () => {
                                                    if (!selectedFile) {
                                                        return;
                                                    }

                                                    await onUpload(line, selectedFile, notes);
                                                    setSelectedFiles((current) => ({
                                                        ...current,
                                                        [line.orderLineId]: null,
                                                    }));
                                                }}
                                            >
                                                {isUploading ? 'Subiendo...' : 'Subir foto'}
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            );
                        })}
                    </Stack>
                )}
            </Stack>
        </Paper>
    );
}

