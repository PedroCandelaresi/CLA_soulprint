'use client';

import Link from 'next/link';
import { Button, type ButtonProps } from '@mui/material';
import type { TooltipProps } from '@mui/material/Tooltip';
import type { CSSProperties, ReactNode } from 'react';
import TooltipAction from './TooltipAction';

type TooltipButtonProps = Omit<ButtonProps, 'component' | 'href'> & {
    tooltip: ReactNode;
    tooltipPlacement?: TooltipProps['placement'];
    href?: string;
    target?: string;
    rel?: string;
};

export default function TooltipButton({
    tooltip,
    tooltipPlacement = 'top',
    href,
    target,
    rel,
    fullWidth,
    ...buttonProps
}: TooltipButtonProps) {
    const linkStyle: CSSProperties = {
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : 'auto',
        textDecoration: 'none',
    };

    if (href) {
        const button = <Button {...buttonProps} component="span" fullWidth={fullWidth} />;
        const isExternal =
            href.startsWith('http://') ||
            href.startsWith('https://') ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:') ||
            target === '_blank';

        return (
            <TooltipAction title={tooltip} placement={tooltipPlacement}>
                {isExternal ? (
                    <a href={href} target={target} rel={rel} style={linkStyle}>
                        {button}
                    </a>
                ) : (
                    <Link href={href} style={linkStyle}>
                        {button}
                    </Link>
                )}
            </TooltipAction>
        );
    }

    return (
        <TooltipAction title={tooltip} placement={tooltipPlacement}>
            <Button {...buttonProps} fullWidth={fullWidth} />
        </TooltipAction>
    );
}
