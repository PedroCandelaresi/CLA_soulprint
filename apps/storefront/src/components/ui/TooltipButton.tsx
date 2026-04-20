'use client';

import { Button, type ButtonProps } from '@mui/material';
import type { TooltipProps } from '@mui/material/Tooltip';
import type { ReactNode } from 'react';
import TooltipAction from './TooltipAction';

type TooltipButtonProps = ButtonProps & {
    tooltip: ReactNode;
    tooltipPlacement?: TooltipProps['placement'];
};

export default function TooltipButton({
    tooltip,
    tooltipPlacement = 'top',
    ...buttonProps
}: TooltipButtonProps) {
    return (
        <TooltipAction title={tooltip} placement={tooltipPlacement}>
            <Button {...buttonProps} />
        </TooltipAction>
    );
}
