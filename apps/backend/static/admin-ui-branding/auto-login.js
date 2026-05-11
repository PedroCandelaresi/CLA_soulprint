/**
 * Auto-login para Vendure Admin en modo testing
 * 
 * Realiza automáticamente un login con credenciales de superadmin.
 * Puede estar habilitado via:
 * - ADMIN_TESTING_MODE=true (env var)
 * - window.__CLA_AUTO_LOGIN_CONFIG (inyectado en HTML)
 * - window.__CLA_ADMIN_USER y window.__CLA_ADMIN_PASS
 * 
 * Funciona en Docker, GitHub Actions, y local.
 */

(function() {
    'use strict';

    // Solo ejecutar si estamos en el admin UI
    if (!window.location.pathname.includes('/admin')) {
        return;
    }

    localStorage.removeItem('vendure_auth_token');
    sessionStorage.removeItem('vendure_auth_token');

    // Verificar si ya hay un token válido
    const existingToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (existingToken) {
        console.log('[AutoLogin] Token already exists, skipping auto-login');
        return;
    }

    // Obtener configuración inyectada en HTML o variables globales
    const config = window.__CLA_AUTO_LOGIN_CONFIG || {};
    const enabled = config.enabled || window.__CLA_TESTING_MODE || false;
    
    if (!enabled) {
        console.log('[AutoLogin] Auto-login disabled');
        return;
    }

    const credentials = {
        username: config.username || window.__CLA_ADMIN_USER || 'superadmin',
        password: config.password || window.__CLA_ADMIN_PASS || 'superadmin',
    };
    const timeoutMs = Number(config.timeoutMs || window.__CLA_AUTO_LOGIN_TIMEOUT_MS || 8000);

    console.log('[AutoLogin] Starting auto-login to Vendure Admin...');

    async function readGraphQlResponse(response) {
        const contentType = response.headers.get('content-type') || '';
        const bodyText = await response.text();

        if (!response.ok) {
            console.error('[AutoLogin] Admin API HTTP error:', response.status, response.statusText);
            console.error('[AutoLogin] Response preview:', bodyText.slice(0, 300));
            return null;
        }

        if (!contentType.includes('application/json')) {
            console.error('[AutoLogin] Admin API returned non-JSON response:', contentType || '(missing content-type)');
            console.error('[AutoLogin] Response preview:', bodyText.slice(0, 300));
            return null;
        }

        try {
            return JSON.parse(bodyText);
        } catch (error) {
            console.error('[AutoLogin] Could not parse Admin API JSON response:', error);
            console.error('[AutoLogin] Response preview:', bodyText.slice(0, 300));
            return null;
        }
    }

    /**
     * Realizar login y guardar el token
     */
    async function autoLogin() {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            // GraphQL query para login
            const query = `
                mutation Login($username: String!, $password: String!) {
                    login(username: $username, password: $password) {
                        __typename
                        ... on CurrentUser {
                            id
                            identifier
                            channels {
                                id
                                code
                                token
                            }
                        }
                        ... on InvalidCredentialsError {
                            errorCode
                            message
                        }
                    }
                }
            `;

            const response = await fetch('/admin-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    variables: {
                        username: credentials.username,
                        password: credentials.password,
                    },
                }),
                credentials: 'include', // Important for cookies
                signal: controller.signal,
            });

            const data = await readGraphQlResponse(response);
            if (!data) {
                console.warn('[AutoLogin] Could not auto-login because Admin API did not return valid JSON.');
                return false;
            }

            if (data.errors) {
                console.error('[AutoLogin] GraphQL Error:', data.errors);
                console.warn('[AutoLogin] Could not auto-login. Please try manual login.');
                return false;
            }

            const loginResult = data.data?.login;

            if (!loginResult) {
                console.error('[AutoLogin] No login result received');
                return false;
            }

            if (loginResult.__typename === 'InvalidCredentialsError') {
                console.error('[AutoLogin] Invalid credentials:', loginResult.message);
                return false;
            }

            if (loginResult.__typename === 'CurrentUser') {
                const authToken = response.headers.get('vendure-auth-token');
                if (authToken) {
                    localStorage.setItem('authToken', authToken);
                    sessionStorage.setItem('authToken', authToken);
                }

                const channel = loginResult.channels?.[0];
                if (channel?.token) {
                    localStorage.setItem('activeChannelToken', channel.token);
                    sessionStorage.setItem('activeChannelToken', channel.token);
                }

                if (authToken || channel?.token) {
                    console.log('[AutoLogin] ✓ Auto-login successful!');
                    console.log('[AutoLogin] Logged in as:', loginResult.identifier);
                    console.log('[AutoLogin] Reloading page...');
                    
                    // Recargar la página para que el admin pueda usarlo
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                    return true;
                }

                console.warn('[AutoLogin] Login succeeded but no auth token was exposed; relying on auth cookie.');
                setTimeout(() => {
                    window.location.reload();
                }, 500);
                return true;
            }

            console.error('[AutoLogin] Unexpected login response:', loginResult);
            return false;
        } catch (error) {
            if (error?.name === 'AbortError') {
                console.error(`[AutoLogin] Login timed out after ${timeoutMs}ms`);
                return false;
            }
            console.error('[AutoLogin] Error during auto-login:', error);
            return false;
        } finally {
            clearTimeout(timeout);
        }
    }

    // Esperar a que el DOM esté listo y luego intentar login
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoLogin);
    } else {
        setTimeout(autoLogin, 500);
    }

    // También crear un utility global para debugging
    window.CLAAutoLogin = {
        credentials,
        tryLogin: autoLogin,
    };
})();
