'use client';

import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    LinearProgress,
    Paper,
    Stack,
    Typography,
    type ChipProps,
    type PaperProps,
} from '@mui/material';
import type { ReactNode } from 'react';
import type { TimelineStep } from './accountPresentation';

export function AccountSectionCard({
    children,
    ...paperProps
}: PaperProps & { children: ReactNode }) {
    return (
        <Paper
            variant="outlined"
            {...paperProps}
            sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: 4,
                borderColor: 'divider',
                ...paperProps.sx,
            }}
        >
            {children}
        </Paper>
    );
}

export function AccountStatusChip({
    label,
    color,
}: {
    label: string;
    color: ChipProps['color'];
}) {
    return <Chip label={label} color={color} size="small" sx={{ fontWeight: 700 }} />;
}

export function AccountLoadingState({
    title = 'Cargando tu cuenta',
    message = 'Estamos preparando tu información.',
}: {
    title?: string;
    message?: string;
}) {
    return (
        <AccountSectionCard>
            <Stack spacing={2} alignItems="center" py={4}>
                <CircularProgress />
                <Stack spacing={0.5} textAlign="center">
                    <Typography variant="h6" fontWeight={700}>
                        {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {message}
                    </Typography>
                </Stack>
            </Stack>
        </AccountSectionCard>
    );
}

export function AccountErrorState({
    message,
    action,
}: {
    message: string;
    action?: ReactNode;
}) {
    return (
        <AccountSectionCard>
            <Stack spacing={2}>
                <Alert severity="error">{message}</Alert>
                {action}
            </Stack>
        </AccountSectionCard>
    );
}

export function AccountEmptyState({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <AccountSectionCard>
            <Stack spacing={1.5} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
                <Typography variant="h6" fontWeight={700}>
                    {title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {description}
                </Typography>
                {action}
            </Stack>
        </AccountSectionCard>
    );
}

export function AccountMetric({
    label,
    value,
    helpText,
}: {
    label: string;
    value: string;
    helpText?: string;
}) {
    return (
        <AccountSectionCard sx={{ height: '100%' }}>
            <Stack spacing={0.75}>
                <Typography variant="body2" color="text.secondary">
                    {label}
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                    {value}
                </Typography>
                {helpText && (
                    <Typography variant="body2" color="text.secondary">
                        {helpText}
                    </Typography>
                )}
            </Stack>
        </AccountSectionCard>
    );
}

export function AccountProgress({
    label,
    value,
    caption,
}: {
    label: string;
    value: number;
    caption?: string;
}) {
    return (
        <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body2" fontWeight={600}>
                    {label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {Math.max(0, Math.min(100, value))}%
                </Typography>
            </Stack>
            <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, value))}
                sx={{ height: 8, borderRadius: 999 }}
            />
            {caption && (
                <Typography variant="body2" color="text.secondary">
                    {caption}
                </Typography>
            )}
        </Stack>
    );
}

export function AccountTimeline({ steps }: { steps: TimelineStep[] }) {
    return (
        <Stack spacing={0} sx={{ position: 'relative' }}>
            {steps.map((step, index) => {
                const isLast = index === steps.length - 1;
                const isComplete = step.state === 'complete';
                const isCurrent = step.state === 'current';
                const isCancelled = step.state === 'cancelled';

                return (
                    <Box key={step.key} sx={{ display: 'flex', gap: 2, position: 'relative', pb: isLast ? 0 : 3 }}>
                        <Stack alignItems="center" sx={{ width: 24, flexShrink: 0 }}>
                            <Box
                                sx={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    mt: 0.5,
                                    bgcolor: isCancelled
                                        ? 'error.main'
                                        : isComplete
                                          ? 'success.main'
                                          : isCurrent
                                            ? 'primary.main'
                                            : 'grey.300',
                                    border: isCurrent ? '4px solid' : 'none',
                                    borderColor: isCurrent ? 'primary.light' : undefined,
                                }}
                            />
                            {!isLast && (
                                <Box
                                    sx={{
                                        width: 2,
                                        flexGrow: 1,
                                        minHeight: 32,
                                        bgcolor: isComplete ? 'success.main' : 'divider',
                                        mt: 1,
                                    }}
                                />
                            )}
                        </Stack>

                        <Stack spacing={0.5} pb={isLast ? 0 : 0.5}>
                            <Typography variant="body1" fontWeight={700}>
                                {step.label}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {step.description}
                            </Typography>
                        </Stack>
                    </Box>
                );
            })}
        </Stack>
    );
}
