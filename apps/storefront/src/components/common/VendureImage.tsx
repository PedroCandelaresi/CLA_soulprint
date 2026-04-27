'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { getVendurePreviewWebpUrl } from '@/lib/utils/asset-url';

type VendureImageProps = Omit<ImageProps, 'src' | 'onError'> & {
    src: string;
    fallbackSrc?: string;
    onError?: ImageProps['onError'];
};

const VendureImage = ({
    src,
    fallbackSrc = '/images/backgrounds/errorimg.svg',
    onError,
    ...props
}: VendureImageProps) => {
    const originalSrc = src || fallbackSrc;
    const preferredSrc = useMemo(
        () => getVendurePreviewWebpUrl(originalSrc) ?? originalSrc,
        [originalSrc],
    );
    const [currentSrc, setCurrentSrc] = useState(preferredSrc);

    useEffect(() => {
        setCurrentSrc(preferredSrc);
    }, [preferredSrc]);

    const handleError: ImageProps['onError'] = (event) => {
        if (currentSrc !== originalSrc) {
            setCurrentSrc(originalSrc);
            return;
        }

        if (fallbackSrc && currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc);
            return;
        }

        onError?.(event);
    };

    return <Image {...props} src={currentSrc} onError={handleError} />;
};

export default VendureImage;
