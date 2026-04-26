import Image, { type ImageProps } from 'next/image';

type BrandLogoImageProps = Omit<ImageProps, 'src' | 'alt' | 'width' | 'height'> & {
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
        <Image
            {...props}
            src="/images/logos/CLA.svg"
            alt={decorative ? '' : label}
            width={772}
            height={142}
            unoptimized
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
