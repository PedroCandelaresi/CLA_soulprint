import { Controller, Get, Res } from '@nestjs/common';
import { TransactionalConnection } from '@vendure/core';
import type { Response } from 'express';

const DEFAULT_READY_TIMEOUT_MS = 5000;

function parseReadyTimeoutMs(value: string | undefined): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_READY_TIMEOUT_MS;
    }
    return Math.max(parsed, DEFAULT_READY_TIMEOUT_MS);
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return 'database is not available';
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
            reject(new Error(`timeout of ${timeoutMs}ms exceeded`));
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeout) {
            clearTimeout(timeout);
        }
    }
}

@Controller('health')
export class HealthController {
    private readonly readyTimeoutMs = parseReadyTimeoutMs(process.env.HEALTH_READY_TIMEOUT_MS);

    constructor(private readonly connection: TransactionalConnection) {}

    @Get('live')
    live(): { status: 'ok'; type: 'live'; uptime: number } {
        return {
            status: 'ok',
            type: 'live',
            uptime: process.uptime(),
        };
    }

    @Get('ready')
    async ready(@Res() res: Response): Promise<Response> {
        const startedAt = Date.now();

        try {
            if (!this.connection.rawConnection.isInitialized) {
                throw new Error('database connection is not initialized');
            }

            await withTimeout(this.connection.rawConnection.query('SELECT 1'), this.readyTimeoutMs);

            return res.status(200).json({
                status: 'ok',
                type: 'ready',
                checks: {
                    database: {
                        status: 'up',
                    },
                },
                responseTimeMs: Date.now() - startedAt,
            });
        } catch (error) {
            return res.status(503).json({
                status: 'error',
                type: 'ready',
                checks: {
                    database: {
                        status: 'down',
                        message: getErrorMessage(error),
                    },
                },
                responseTimeMs: Date.now() - startedAt,
            });
        }
    }
}
