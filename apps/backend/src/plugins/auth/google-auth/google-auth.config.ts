export interface GoogleAuthConfig {
    enabled: boolean;
    clientId?: string;
    clientSecret?: string;
    callbackUrl?: string;
}

function readEnv(name: string): string | undefined {
    const value = process.env[name]?.trim();
    return value ? value : undefined;
}

export function getGoogleAuthConfigFromEnv(): GoogleAuthConfig {
    const clientId = readEnv('GOOGLE_CLIENT_ID');
    const clientSecret = readEnv('GOOGLE_CLIENT_SECRET');
    const callbackUrl = readEnv('GOOGLE_CALLBACK_URL');

    return {
        enabled: Boolean(clientId && clientSecret),
        clientId,
        clientSecret,
        callbackUrl,
    };
}
