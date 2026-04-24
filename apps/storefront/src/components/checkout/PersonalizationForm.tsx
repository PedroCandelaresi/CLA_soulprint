'use client';

import {
    Box,
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
import type { PersonalizationBackMode, PersonalizationSideMode } from '@/types/storefront';

export interface PersonalizationValues {
    frontMode: PersonalizationSideMode;
    frontText: string;
    backMode: PersonalizationBackMode;
    backText: string;
}

interface PersonalizationFormProps {
    values: PersonalizationValues;
    onChange: (next: PersonalizationValues) => void;
    disabled?: boolean;
}

const MAX_CHARS = 200;

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
                            onChange={(_e, v) => set({ frontMode: v as PersonalizationSideMode, frontText: '' })}
                        >
                            <FormControlLabel value="text" control={<Radio size="small" />} label="Frase / texto" />
                            <FormControlLabel value="image" control={<Radio size="small" />} label="Imagen (la subís luego del pago)" />
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
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            Una vez que confirmés el pago, te pediremos que subas la imagen para el frente.
                        </Typography>
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
                            onChange={(_e, v) => set({ backMode: v as PersonalizationBackMode, backText: '' })}
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
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            Una vez que confirmés el pago, te pediremos que subas la imagen para el dorso.
                        </Typography>
                    )}
                </Stack>
            </Box>
        </Stack>
    );
}

export function defaultPersonalizationValues(): PersonalizationValues {
    return { frontMode: 'text', frontText: '', backMode: 'none', backText: '' };
}

export function validatePersonalization(values: PersonalizationValues): string | null {
    if (values.frontMode === 'text' && !values.frontText.trim()) {
        return 'Escribí la frase para el frente de la pieza.';
    }
    if (values.backMode === 'text' && !values.backText.trim()) {
        return 'Escribí la frase para el dorso, o elegí "Sin dorso".';
    }
    return null;
}
