'use client';
import React, { useState } from 'react';
import { Box, IconButton, useTheme, MobileStepper } from '@mui/material';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import Image from 'next/image';

interface ProductCarouselProps {
    images: string[];
    alt: string;
}

const ProductCarousel = ({ images, alt }: ProductCarouselProps) => {
    const theme = useTheme();
    const [activeStep, setActiveStep] = useState(0);
    const [currentImages, setCurrentImages] = useState(images);
    const maxSteps = currentImages.length;

    // React to props change
    React.useEffect(() => {
        setCurrentImages(images);
    }, [images]);

    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleImageError = () => {
        const newImages = [...currentImages];
        newImages[activeStep] = '/images/backgrounds/errorimg.svg'; // Fallback
        setCurrentImages(newImages);
    };

    if (currentImages.length === 0) {
        return null;
    }

    return (
        <Box sx={{ maxWidth: '100%', flexGrow: 1, position: 'relative' }}>
            <Box sx={{ position: 'relative', width: '100%', height: '500px', overflow: 'hidden', borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                <Image
                    src={currentImages[activeStep]}
                    alt={`${alt} - Image ${activeStep + 1}`}
                    fill
                    style={{ objectFit: 'contain' }}
                    priority={activeStep === 0}
                    onError={handleImageError}
                />
            </Box>

            {maxSteps > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <MobileStepper
                        variant="dots"
                        steps={maxSteps}
                        position="static"
                        activeStep={activeStep}
                        sx={{ bgcolor: 'transparent', flexGrow: 1 }}
                        nextButton={
                            <IconButton size="small" onClick={handleNext} disabled={activeStep === maxSteps - 1} sx={{ bgcolor: 'background.paper', ml: 1 }}>
                                <IconChevronRight size={20} />
                            </IconButton>
                        }
                        backButton={
                            <IconButton size="small" onClick={handleBack} disabled={activeStep === 0} sx={{ bgcolor: 'background.paper', mr: 1 }}>
                                <IconChevronLeft size={20} />
                            </IconButton>
                        }
                    />
                </Box>
            )}
        </Box>
    );
};

export default ProductCarousel;
