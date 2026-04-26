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
                    p: 0,
                    textAlign: 'left',
                    color: 'inherit',
                    textTransform: 'none',
                }}
            >
                <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            borderRadius: 2,
                            overflow: 'hidden',
                            border: '1px solid rgba(0,72,37,0.14)',
                            bgcolor: 'rgba(255,252,248,0.9)',
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
                        <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: 220 }}>
                            {title}
                        </Typography>
                    </Box>
                </Stack>
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>{title}</DialogTitle>
                <DialogContent dividers>
                    {image && (
                        <Box
                            component="img"
                            src={asset.source || asset.preview}
                            alt={title}
                            sx={{ display: 'block', width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
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
