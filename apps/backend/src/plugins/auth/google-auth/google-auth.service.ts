import { Inject, Injectable } from '@nestjs/common';
import { GoogleAuthConfig, getGoogleAuthConfigFromEnv } from './google-auth.config';

export const GOOGLE_AUTH_CONFIG_OPTIONS = Symbol('GOOGLE_AUTH_CONFIG_OPTIONS');

interface GoogleTokenInfoResponse {
    aud?: string;
    azp?: string;
    email?: string;
    email_verified?: string | boolean;
    exp?: string;
    family_name?: string;
    given_name?: string;
    iss?: string;
    name?: string;
    picture?: string;
    sub?: string;
}

export interface GoogleCustomerProfile {
    sub: string;
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    fullName?: string;
    picture?: string;
}

function normalizeBoolean(value: string | boolean | undefined): boolean {
    return value === true || value === 'true';
}

function normalizeNameParts(profile: GoogleTokenInfoResponse): { firstName: string; lastName: string } {
    const givenName = profile.given_name?.trim();
    const familyName = profile.family_name?.trim();

    if (givenName || familyName) {
        return {
            firstName: givenName || 'Cliente',
            lastName: familyName || '',
        };
    }

    const fullName = profile.name?.trim();
    if (!fullName) {
        return {
            firstName: 'Cliente',
            lastName: '',
        };
    }

    const [firstName, ...rest] = fullName.split(/\s+/);
    return {
        firstName: firstName || 'Cliente',
        lastName: rest.join(' '),
    };
}

@Injectable()
export class GoogleAuthService {
    constructor(
        @Inject(GOOGLE_AUTH_CONFIG_OPTIONS)
        private readonly config: GoogleAuthConfig,
    ) {}

    getConfig(): GoogleAuthConfig {
        return this.config;
    }

    isEnabled(): boolean {
        return this.config.enabled;
    }

    async verifyIdToken(idToken: string): Promise<GoogleCustomerProfile> {
        if (!this.config.clientId) {
            throw new Error('Google OAuth no está configurado.');
        }

        const response = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
            {
                headers: {
                    Accept: 'application/json',
                },
            },
        );

        if (!response.ok) {
            throw new Error('Google rechazó el token enviado.');
        }

        const payload = await response.json() as GoogleTokenInfoResponse;
        const audiences = [payload.aud, payload.azp].filter((value): value is string => Boolean(value));
        if (!audiences.includes(this.config.clientId)) {
            throw new Error('El token de Google no pertenece a esta aplicación.');
        }

        if (!payload.sub || !payload.email) {
            throw new Error('Google no devolvió un perfil válido.');
        }

        const issuer = payload.iss?.trim();
        if (issuer && issuer !== 'https://accounts.google.com' && issuer !== 'accounts.google.com') {
            throw new Error('El emisor del token de Google no es válido.');
        }

        const exp = Number(payload.exp);
        if (Number.isFinite(exp) && exp * 1000 < Date.now()) {
            throw new Error('El token de Google expiró.');
        }

        const emailVerified = normalizeBoolean(payload.email_verified);
        if (!emailVerified) {
            throw new Error('La cuenta de Google debe tener el email verificado.');
        }

        const names = normalizeNameParts(payload);

        return {
            sub: payload.sub,
            email: payload.email.trim().toLowerCase(),
            emailVerified,
            firstName: names.firstName,
            lastName: names.lastName,
            fullName: payload.name?.trim(),
            picture: payload.picture?.trim(),
        };
    }
}

export function createGoogleAuthConfigProvider() {
    return {
        provide: GOOGLE_AUTH_CONFIG_OPTIONS,
        useValue: getGoogleAuthConfigFromEnv(),
    };
}
