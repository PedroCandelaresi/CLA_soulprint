'use client';

import {
    Box,
    Stack,
    Typography,
} from '@mui/material';
import type { CustomerOrderSummary } from '@/types/customer-account';
import { buildOrderTimeline } from '@/lib/orders/business-status';

function getStepColor(state: ReturnType<typeof buildOrderTimeline>[number]['state']): string {
    switch (state) {
        case 'complete':
            return 'success.main';
        case 'current':
            return 'info.main';
        case 'action-required':
            return 'warning.main';
        case 'skipped':
            return 'text.disabled';
        case 'upcoming':
        default:
            return 'divider';
    }
}

interface OrderProgressTimelineProps {
    order: CustomerOrderSummary;
    compact?: boolean;
}

export default function OrderProgressTimeline({ order, compact = false }: OrderProgressTimelineProps) {
    const steps = buildOrderTimeline(order);

    return (
        <Stack spacing={compact ? 1.5 : 2}>
            {steps.map((step, index) => {
                const isLast = index === steps.length - 1;
                const color = getStepColor(step.state);

                return (
                    <Stack key={step.key} direction="row" spacing={1.5} alignItems="stretch">
                        <Stack alignItems="center" sx={{ width: compact ? 18 : 22, flexShrink: 0 }}>
                            <Box
                                sx={{
                                    width: compact ? 10 : 12,
                                    height: compact ? 10 : 12,
                                    borderRadius: '50%',
                                    bgcolor: color,
                                    border: '2px solid',
                                    borderColor: step.state === 'upcoming' ? 'divider' : color,
                                    mt: compact ? '6px' : '7px',
                                }}
                            />
                            {!isLast && (
                                <Box
                                    sx={{
                                        flex: 1,
                                        width: 2,
                                        bgcolor: step.state === 'upcoming' ? 'divider' : color,
                                        opacity: step.state === 'skipped' ? 0.4 : 1,
                                        minHeight: compact ? 18 : 28,
                                        mt: 0.5,
                                    }}
                                />
                            )}
                        </Stack>

                        <Box sx={{ pb: isLast ? 0 : compact ? 0.5 : 1 }}>
                            <Typography variant={compact ? 'body2' : 'subtitle2'} fontWeight={700}>
                                {step.label}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {step.description}
                            </Typography>
                            {step.timestamp && (
                                <Typography variant="caption" color="text.disabled">
                                    {new Date(step.timestamp).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })}
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                );
            })}
        </Stack>
    );
}
