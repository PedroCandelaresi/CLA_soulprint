'use client';
import React, { useState } from 'react';
import { Box, useTheme, MobileStepper } from '@mui/material';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import Image from 'next/image';
import TooltipIconButton from '@/components/ui/TooltipIconButton';

interface ProductCarouselProps {
    images: string[];
    alt: string;
    overlay?: React.ReactNode;
}

const ProductCarousel = ({ images, alt, overlay }: ProductCarouselProps) => {
    const theme = useTheme();
    const [activeStep, setActiveStep] = useState(0);
    const [currentImages, setCurrentImages] = useState(images);
    const maxSteps = currentImages.length;

    // React to props change
    React.useEffect(() => {
        setCurrentImages(images);
        setActiveStep(0);
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
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    height: { xs: 360, md: 560 },
                    overflow: 'hidden',
                    borderRadius: 5,
                    border: `1px solid ${theme.palette.divider}`,
                    background: 'linear-gradient(180deg, rgba(244,234,213,0.8) 0%, rgba(255,253,248,1) 100%)',
                    boxShadow: '0 22px 42px rgba(0,72,37,0.08)',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        inset: 18,
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.58)',
                        pointerEvents: 'none',
                    },
                }}
            >
                <Image
                    src={currentImages[activeStep]}
                    alt={`${alt} - Image ${activeStep + 1}`}
                    fill
                    sizes="(max-width: 900px) 100vw, 50vw"
                    style={{ objectFit: 'contain', padding: 22 }}
                    priority={activeStep === 0}
                    onError={handleImageError}
                />
                {overlay && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            zIndex: 1,
                            p: 2,
                        }}
                    >
                        {overlay}
                    </Box>
                )}
            </Box>

            {maxSteps > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <MobileStepper
                        variant="dots"
                        steps={maxSteps}
                        position="static"
                        activeStep={activeStep}
                        sx={{
                            bgcolor: 'transparent',
                            flexGrow: 1,
                            '& .MuiMobileStepper-dot': {
                                backgroundColor: 'rgba(0,72,37,0.18)',
                            },
                            '& .MuiMobileStepper-dotActive': {
                                backgroundColor: 'primary.main',
                            },
                        }}
                        nextButton={
                            <TooltipIconButton
                                size="small"
                                onClick={handleNext}
                                disabled={activeStep === maxSteps - 1}
                                tooltip="Ver siguiente imagen"
                                sx={{ bgcolor: 'background.paper', ml: 1, border: `1px solid ${theme.palette.divider}` }}
                            >
                                <IconChevronRight size={20} />
                            </TooltipIconButton>
                        }
                        backButton={
                            <TooltipIconButton
                                size="small"
                                onClick={handleBack}
                                disabled={activeStep === 0}
                                tooltip="Ver imagen anterior"
                                sx={{ bgcolor: 'background.paper', mr: 1, border: `1px solid ${theme.palette.divider}` }}
                            >
                                <IconChevronLeft size={20} />
                            </TooltipIconButton>
                        }
                    />
                </Box>
            )}
        </Box>
    );
};

export default ProductCarousel;
