import {
    PluginCommonModule,
    Logger,
    AuthService,
    RequestContext,
    createProxyHandler,
} from '@vendure/core';
import { Module } from '@nestjs/common';

/**
 * AdminTestingModePlugin
 *
 * Plugin que permite acceder al Admin UI sin login durante desarrollo/testing.
 * Activar con: ADMIN_TESTING_MODE=true
 *
 * ⚠️ NUNCA usar en producción
 */

const loggerCtx = 'AdminTestingModePlugin';

@Module({
    imports: [PluginCommonModule],
})
export class AdminTestingModeModule {}

export class AdminTestingModePlugin {
    static options = {
        enabled: false,
    };

    static init(options: { enabled?: boolean } = {}) {
        AdminTestingModePlugin.options = {
            enabled: options.enabled ?? false,
        };
        return AdminTestingModePlugin;
    }

    configure(config: any) {
        if (!AdminTestingModePlugin.options.enabled) {
            return config;
        }

        Logger.warn(
            '⚠️  ADMIN_TESTING_MODE ENABLED - Authentication is DISABLED. NEVER use in production!',
            loggerCtx,
        );

        // Override authOptions para permitir acceso sin contraseña
        config.authOptions.requireVerification = false;

        // Agregar middleware que bypasse autenticación
        if (!config.middleware) {
            config.middleware = [];
        }

        config.middleware.push({
            handler: (req: any, res: any, next: any) => {
                // Solo para rutas del admin
                if (req.path.startsWith('/admin')) {
                    // Inyectar un header para que Vendure sepa que estamos en testing mode
                    req.headers['x-admin-testing-mode'] = 'true';
                }
                next();
            },
            route: '*',
        });

        return config;
    }
}
