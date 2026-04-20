'use client';

import { Tooltip, type TooltipProps } from '@mui/material';
import { isValidElement, type ReactElement } from 'react';

type TooltipActionProps = Omit<TooltipProps, 'children' | 'title'> & {
    title: TooltipProps['title'];
    children: ReactElement;
};

export default function TooltipAction({
    title,
    children,
    arrow = true,
    describeChild = true,
    ...tooltipProps
}: TooltipActionProps) {
    if (!title || !isValidElement(children)) {
        return children;
    }

    const disabled = Boolean((children.props as { disabled?: boolean }).disabled);

    if (disabled) {
        return (
            <Tooltip title={title} arrow={arrow} describeChild={describeChild} {...tooltipProps}>
                <span style={{ display: 'inline-flex', width: 'fit-content' }}>{children}</span>
            </Tooltip>
        );
    }

    return (
        <Tooltip title={title} arrow={arrow} describeChild={describeChild} {...tooltipProps}>
            {children}
        </Tooltip>
    );
}
