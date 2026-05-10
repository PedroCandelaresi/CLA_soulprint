/**
 * Auto-login para Vendure Admin en modo testing
 * 
 * Este script se inyecta en el index.html cuando ADMIN_TESTING_MODE=true
 * Realiza automáticamente un login con credenciales de superadmin
 */

(function() {
    'use strict';

    // Solo ejecutar si estamos en el admin UI
    if (!window.location.pathname.includes('/admin')) {
        return;
    }

    // Verificar si ya hay un token válido
    const existingToken = localStorage.getItem('vendure_auth_token') || sessionStorage.getItem('vendure_auth_token');
    if (existingToken) {
        console.log('[AutoLogin] Token already exists, skipping auto-login');
        return;
    }

    const credentials = {
        username: window.__CLA_ADMIN_USER || 'superadmin',
        password: window.__CLA_ADMIN_PASS || 'superadmin',
    };

    console.log('[AutoLogin] Starting auto-login to Vendure Admin...');

    /**
     * Realizar login y guardar el token
     */
    async function autoLogin() {
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
            });

            const data = await response.json();

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
                const channel = loginResult.channels?.[0];
                if (channel?.token) {
                    // Guardar token en localStorage para Vendure Admin
                    localStorage.setItem('vendure_auth_token', channel.token);
                    sessionStorage.setItem('vendure_auth_token', channel.token);
                    console.log('[AutoLogin] ✓ Auto-login successful!');
                    console.log('[AutoLogin] Logged in as:', loginResult.identifier);
                    console.log('[AutoLogin] Reloading page...');
                    
                    // Recargar la página para que el admin pueda usarlo
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                    return true;
                }
            }

            console.error('[AutoLogin] Unexpected login response:', loginResult);
            return false;
        } catch (error) {
            console.error('[AutoLogin] Error during auto-login:', error);
            return false;
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
