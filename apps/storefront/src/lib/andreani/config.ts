function parseBooleanEnv(value: string | undefined): boolean {
    return value?.trim().toLowerCase() === 'true';
}

export const ANDREANI_ENABLED = parseBooleanEnv(process.env.NEXT_PUBLIC_ANDREANI_ENABLED);

export const ANDREANI_DISABLED_MESSAGE =
    'La cotización y el tracking de Andreani están temporalmente deshabilitados.';
