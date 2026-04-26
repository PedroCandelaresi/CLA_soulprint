'use client';

import { useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import type { PersonalizationAssetSummary } from '@/lib/personalization/types';

interface PersonalizationAssetPreviewProps {
    asset: PersonalizationAssetSummary;
    fileName?: string | null;
    label?: string;
}

function isImageAsset(asset: PersonalizationAssetSummary): boolean {
    return asset.mimeType?.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(asset.source);
}

function isPdfAsset(asset: PersonalizationAssetSummary): boolean {
    return asset.mimeType === 'application/pdf' || /\.pdf$/i.test(asset.source);
}

export default function PersonalizationAssetPreview({
    asset,
    fileName,
    label = 'Archivo',
}: PersonalizationAssetPreviewProps) {
    const [open, setOpen] = useState(false);
    const title = fileName || asset.source.split('/').pop() || label;
    const image = isImageAsset(asset);
    const pdf = isPdfAsset(asset);

    return (
        <>
            <Button
                variant="text"
                onClick={() => setOpen(true)}
                sx={{
                    justifyContent: 'flex-start',
                    width: '100%',
                    p: 1,
                    textAlign: 'left',
                    color: 'inherit',
                    textTransform: 'none',
                    borderRadius: 2.5,
                    border: '1px solid rgba(0,72,37,0.1)',
                    bgcolor: 'rgba(255,253,248,0.78)',
                    transition: 'border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease',
                    '&:hover': {
                        bgcolor: 'rgba(246,237,222,0.92)',
                        borderColor: 'rgba(0,72,37,0.2)',
                        transform: 'translateY(-1px)',
                    },
                }}
            >
                <Stack direction="row" spacing={1.25} alignItems="center" width="100%">
                    <Box
                        sx={{
                            width: 72,
                            height: 72,
                            borderRadius: 2,
                            overflow: 'hidden',
                            border: '1px solid rgba(0,72,37,0.14)',
                            bgcolor: 'rgba(255,252,248,0.95)',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                        }}
                    >
                        {image ? (
                            <Box
                                component="img"
                                src={asset.preview || asset.source}
                                alt={title}
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <Typography variant="caption" fontWeight={800} color="primary.main">
                                {pdf ? 'PDF' : 'FILE'}
                            </Typography>
                        )}
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                            {label}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ wordBreak: 'break-word' }}>
                            {title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Clic para ampliar
                        </Typography>
                    </Box>
                </Stack>
            </Button>

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
                <DialogContent dividers sx={{ bgcolor: 'rgba(255,251,244,0.72)' }}>
                    {image && (
                        <Box
                            component="img"
                            src={asset.source || asset.preview}
                            alt={title}
                            sx={{
                                display: 'block',
                                width: '100%',
                                maxHeight: '70vh',
                                objectFit: 'contain',
                                borderRadius: 2,
                                bgcolor: 'common.white',
                            }}
                        />
                    )}
                    {pdf && (
                        <Box
                            component="iframe"
                            src={asset.source}
                            title={title}
                            sx={{ width: '100%', height: '70vh', border: 0 }}
                        />
                    )}
                    {!image && !pdf && (
                        <Typography color="text.secondary">
                            Este archivo no tiene vista previa integrada. Podés abrirlo en una pestaña nueva.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button href={asset.source} target="_blank" rel="noopener noreferrer" startIcon={<OpenInNewRoundedIcon />}>
                        Abrir original
                    </Button>
                    <Button onClick={() => setOpen(false)}>Cerrar</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
