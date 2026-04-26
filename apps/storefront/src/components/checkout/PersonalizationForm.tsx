'use client';

import {
    Box,
    Button,
    Divider,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import type { PersonalizationBackMode, PersonalizationSideMode } from '@/types/storefront';

export interface PersonalizationValues {
    frontMode: PersonalizationSideMode;
    frontText: string;
    frontFile: File | null;
    backMode: PersonalizationBackMode;
    backText: string;
    backFile: File | null;
}

interface PersonalizationFormProps {
    values: PersonalizationValues;
    onChange: (next: PersonalizationValues) => void;
    disabled?: boolean;
}

const MAX_CHARS = 200;
const ACCEPTED_FILE_TYPES = 'image/jpeg,image/png,image/webp,application/pdf';

const SURFACE = 'rgba(255,251,244,0.88)';
const GREEN_BORDER = 'rgba(0,72,37,0.14)';

export default function PersonalizationForm({ values, onChange, disabled }: PersonalizationFormProps) {
    const set = (patch: Partial<PersonalizationValues>) => onChange({ ...values, ...patch });

    return (
        <Stack spacing={3}>
            {/* ── Frente ── */}
            <Box
                sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: `1px solid ${GREEN_BORDER}`,
                    bgcolor: SURFACE,
                }}
            >
                <Stack spacing={2}>
                    <Typography variant="subtitle2" fontWeight={700} color="primary.dark">
                        Frente <Typography component="span" variant="caption" color="error.main">*</Typography>
                    </Typography>

                    <FormControl disabled={disabled}>
                        <FormLabel sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 0.5 }}>
                            ¿Qué va en el frente?
                        </FormLabel>
                        <RadioGroup
                            row
                            value={values.frontMode}
                            onChange={(_e, v) => set({ frontMode: v as PersonalizationSideMode, frontText: '', frontFile: null })}
                        >
                            <FormControlLabel value="text" control={<Radio size="small" />} label="Frase / texto" />
                            <FormControlLabel value="image" control={<Radio size="small" />} label="Imagen" />
                        </RadioGroup>
                    </FormControl>

                    {values.frontMode === 'text' && (
                        <TextField
                            label="Frase del frente"
                            placeholder="Ej: Para Lola, con amor eterno"
                            multiline
                            minRows={2}
                            maxRows={4}
                            value={values.frontText}
                            onChange={e => set({ frontText: e.target.value.slice(0, MAX_CHARS) })}
                            disabled={disabled}
                            required
                            helperText={`${values.frontText.length} / ${MAX_CHARS} caracteres`}
                            size="small"
                            fullWidth
                        />
                    )}

                    {values.frontMode === 'image' && (
                        <Stack spacing={1}>
                            <Button
                                component="label"
                                variant="outlined"
                                size="small"
                                startIcon={<UploadFileOutlinedIcon />}
                                disabled={disabled}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                {values.frontFile ? 'Cambiar archivo del frente' : 'Elegir archivo del frente'}
                                <Box
                                    component="input"
                                    type="file"
                                    accept={ACCEPTED_FILE_TYPES}
                                    sx={{ display: 'none' }}
                                    onChange={e => set({ frontFile: e.currentTarget.files?.[0] ?? null })}
                                />
                            </Button>
                            <Typography variant="caption" color={values.frontFile ? 'success.dark' : 'text.secondary'}>
                                {values.frontFile ? values.frontFile.name : 'JPG, PNG, WEBP o PDF. Se sube al agregar al carrito.'}
                            </Typography>
                        </Stack>
                    )}
                </Stack>
            </Box>

            <Divider sx={{ borderColor: GREEN_BORDER }} />

            {/* ── Dorso ── */}
            <Box
                sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: `1px solid ${GREEN_BORDER}`,
                    bgcolor: SURFACE,
                }}
            >
                <Stack spacing={2}>
                    <Typography variant="subtitle2" fontWeight={700} color="primary.dark">
                        Dorso <Typography component="span" variant="caption" color="text.secondary">(opcional)</Typography>
                    </Typography>

                    <FormControl disabled={disabled}>
                        <FormLabel sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 0.5 }}>
                            ¿Querés personalizar también el dorso?
                        </FormLabel>
                        <RadioGroup
                            row
                            value={values.backMode}
                            onChange={(_e, v) => set({ backMode: v as PersonalizationBackMode, backText: '', backFile: null })}
                        >
                            <FormControlLabel value="none"  control={<Radio size="small" />} label="Sin dorso" />
                            <FormControlLabel value="text"  control={<Radio size="small" />} label="Frase / texto" />
                            <FormControlLabel value="image" control={<Radio size="small" />} label="Imagen" />
                        </RadioGroup>
                    </FormControl>

                    {values.backMode === 'text' && (
                        <TextField
                            label="Frase del dorso"
                            placeholder="Ej: Siempre en mi corazón"
                            multiline
                            minRows={2}
                            maxRows={4}
                            value={values.backText}
                            onChange={e => set({ backText: e.target.value.slice(0, MAX_CHARS) })}
                            disabled={disabled}
                            required
                            helperText={`${values.backText.length} / ${MAX_CHARS} caracteres`}
                            size="small"
                            fullWidth
                        />
                    )}

                    {values.backMode === 'image' && (
                        <Stack spacing={1}>
                            <Button
                                component="label"
                                variant="outlined"
                                size="small"
                                startIcon={<UploadFileOutlinedIcon />}
                                disabled={disabled}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                {values.backFile ? 'Cambiar archivo del dorso' : 'Elegir archivo del dorso'}
                                <Box
                                    component="input"
                                    type="file"
                                    accept={ACCEPTED_FILE_TYPES}
                                    sx={{ display: 'none' }}
                                    onChange={e => set({ backFile: e.currentTarget.files?.[0] ?? null })}
                                />
                            </Button>
                            <Typography variant="caption" color={values.backFile ? 'success.dark' : 'text.secondary'}>
                                {values.backFile ? values.backFile.name : 'JPG, PNG, WEBP o PDF. Se sube al agregar al carrito.'}
                            </Typography>
                        </Stack>
                    )}
                </Stack>
            </Box>
        </Stack>
    );
}

export function defaultPersonalizationValues(): PersonalizationValues {
    return { frontMode: 'image', frontText: '', frontFile: null, backMode: 'none', backText: '', backFile: null };
}

export function validatePersonalization(values: PersonalizationValues): string | null {
    if (values.frontMode === 'text' && !values.frontText.trim()) {
        return 'Escribí la frase para el frente de la pieza.';
    }
    if (values.frontMode === 'image' && !values.frontFile) {
        return 'Elegí el archivo para el frente de la pieza.';
    }
    if (values.backMode === 'text' && !values.backText.trim()) {
        return 'Escribí la frase para el dorso, o elegí "Sin dorso".';
    }
    if (values.backMode === 'image' && !values.backFile) {
        return 'Elegí el archivo para el dorso, o elegí "Sin dorso".';
    }
    return null;
}
