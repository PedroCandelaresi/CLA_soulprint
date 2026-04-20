import type { ComponentPropsWithoutRef } from 'react';

type BrandLogoImageProps = Omit<ComponentPropsWithoutRef<'img'>, 'src' | 'alt'> & {
    decorative?: boolean;
    label?: string;
};

export default function BrandLogoImage({
    decorative = false,
    label = 'CLA Soulprint',
    className,
    style,
    ...props
}: BrandLogoImageProps) {
    return (
        <img
            {...props}
            src="/images/logos/CLA.svg"
            alt={decorative ? '' : label}
            aria-hidden={decorative || undefined}
            className={className}
            style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                ...style,
            }}
        />
    );
}
