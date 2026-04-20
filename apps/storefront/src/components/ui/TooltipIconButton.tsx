'use client';

import { IconButton, type IconButtonProps } from '@mui/material';
import type { TooltipProps } from '@mui/material/Tooltip';
import type { CSSProperties, ReactNode } from 'react';
import TooltipAction from './TooltipAction';

type TooltipIconButtonProps = Omit<IconButtonProps, 'href'> & {
    tooltip: ReactNode;
    tooltipPlacement?: TooltipProps['placement'];
    href?: string;
    target?: string;
    rel?: string;
};

export default function TooltipIconButton({
    tooltip,
    tooltipPlacement = 'top',
    href,
    target,
    rel,
    ...buttonProps
}: TooltipIconButtonProps) {
    const anchorStyle: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
    };

    if (href) {
        return (
            <TooltipAction title={tooltip} placement={tooltipPlacement}>
                <a href={href} target={target} rel={rel} style={anchorStyle}>
                    <IconButton {...buttonProps} component="span" />
                </a>
            </TooltipAction>
        );
    }

    return (
        <TooltipAction title={tooltip} placement={tooltipPlacement}>
            <IconButton {...buttonProps} />
        </TooltipAction>
    );
}
