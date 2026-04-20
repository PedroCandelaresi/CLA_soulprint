'use client';

import { IconButton, type IconButtonProps } from '@mui/material';
import type { TooltipProps } from '@mui/material/Tooltip';
import type { ReactNode } from 'react';
import TooltipAction from './TooltipAction';

type TooltipIconButtonProps = IconButtonProps & {
    tooltip: ReactNode;
    tooltipPlacement?: TooltipProps['placement'];
};

export default function TooltipIconButton({
    tooltip,
    tooltipPlacement = 'top',
    ...buttonProps
}: TooltipIconButtonProps) {
    return (
        <TooltipAction title={tooltip} placement={tooltipPlacement}>
            <IconButton {...buttonProps} />
        </TooltipAction>
    );
}
