'use client';

import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    type FocusEvent,
    type TouchEvent,
} from "react";
import Image from "next/image";
import { Box, Stack, Typography, Container, useMediaQuery } from "@mui/material";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import TooltipButton from "@/components/ui/TooltipButton";
import TooltipIconButton from "@/components/ui/TooltipIconButton";

type Diapositiva = {
    id: string;
    titulo: string;
    descripcion: string;
    imagen: string;
    enlace: string;
    posicion: string;
    alt?: string;
};

type EstadoPausa = {
    hover: boolean;
    focus: boolean;
    manual: boolean;
};

const diapositivas: Diapositiva[] = [
    {
        id: "retratos-con-memoria",
        titulo: "Retratos que se vuelven amuleto",
        descripcion: "Una estética íntima y cálida para piezas que guardan memoria y acompañan todos los días.",
        imagen: "/images/carrousel/carrousel1.png",
        enlace: "/productos",
        posicion: "center center",
        alt: "Mujer con un perro usando joyas con retratos grabados",
    },
    {
        id: "vinculos-cotidianos",
        titulo: "Vínculos que también se llevan puestos",
        descripcion: "Fotos nobles, paleta serena y una tienda con aire editorial para historias reales.",
        imagen: "/images/carrousel/carrousel2.png",
        enlace: "/productos",
        posicion: "center center",
        alt: "Hombre con un perro en un parque mostrando dijes personalizados",
    },
    {
        id: "alma-criolla",
        titulo: "Colecciones con alma criolla y urbana",
        descripcion: "Un storefront más sensible, con identidad visual fuerte y una narrativa de marca mucho más cuidada.",
        imagen: "/images/carrousel/carrousel3.png",
        enlace: "/destacados",
        posicion: "center center",
        alt: "Hombre con atuendo tradicional junto a animales con dijes personalizados",
    },
];

const AUTOPLAY_INTERVAL = 5500;
const SWIPE_THRESHOLD = 48;
const SLIDE_IMAGE_SIZES = "100vw";
const SIDE_PANEL_WIDTH = { xs: 56, md: 84 };
const VISUALLY_HIDDEN_STYLES = {
    position: "absolute",
    width: 1,
    height: 1,
    p: 0,
    m: -1,
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
    border: 0,
} as const;

const navigationButtonStyles = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 10,
    color: "common.white",
    bgcolor: "rgba(255,255,255,0.12)",
    backdropFilter: "blur(6px)",
    border: "1px solid rgba(255,255,255,0.2)",
    width: { xs: 40, md: 52 },
    height: { xs: 40, md: 52 },
    "&:hover": {
        bgcolor: "rgba(255,255,255,0.22)",
        borderColor: "rgba(255,255,255,0.5)",
    },
    "&:focus-visible": {
        outline: "2px solid rgba(255,255,255,0.9)",
        outlineOffset: 2,
    },
    transition: "all 0.2s ease",
} as const;

const CarruselDestacado = () => {
    const carouselId = useId();
    const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)", { noSsr: true });
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const [activeStep, setActiveStep] = useState(0);
    const [estadoPausa, setEstadoPausa] = useState<EstadoPausa>({
        hover: false,
        focus: false,
        manual: false,
    });

    const totalDiapositivas = diapositivas.length;
    const autoplayActivo = !reduceMotion && !estadoPausa.hover && !estadoPausa.focus && !estadoPausa.manual;
    const transicionFade = reduceMotion ? "none" : "opacity 0.9s ease-in-out";
    const transicionContenido = reduceMotion ? "none" : "opacity 0.8s ease, transform 0.8s ease";

    const actualizarPausa = useCallback((clave: keyof EstadoPausa, valor: boolean) => {
        setEstadoPausa((prev) => (prev[clave] === valor ? prev : { ...prev, [clave]: valor }));
    }, []);

    const goToSlide = useCallback(
        (index: number) => {
            setActiveStep((prev) => {
                if (index === prev) {
                    return prev;
                }

                return (index + totalDiapositivas) % totalDiapositivas;
            });
        },
        [totalDiapositivas],
    );

    const goNext = useCallback(() => {
        setActiveStep((prev) => (prev + 1) % totalDiapositivas);
    }, [totalDiapositivas]);

    const goPrev = useCallback(() => {
        setActiveStep((prev) => (prev - 1 + totalDiapositivas) % totalDiapositivas);
    }, [totalDiapositivas]);

    const toggleManualPause = useCallback(() => {
        setEstadoPausa((prev) => ({ ...prev, manual: !prev.manual }));
    }, []);

    const handleFocusCapture = useCallback(() => {
        actualizarPausa("focus", true);
    }, [actualizarPausa]);

    const handleBlurCapture = useCallback(
        (event: FocusEvent<HTMLDivElement>) => {
            const nextFocusedElement = event.relatedTarget;

            if (!event.currentTarget.contains(nextFocusedElement as Node | null)) {
                actualizarPausa("focus", false);
            }
        },
        [actualizarPausa],
    );

    const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
        const touch = event.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }, []);

    const handleTouchEnd = useCallback(
        (event: TouchEvent<HTMLDivElement>) => {
            if (!touchStartRef.current) {
                return;
            }

            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - touchStartRef.current.x;
            const deltaY = touch.clientY - touchStartRef.current.y;
            touchStartRef.current = null;

            if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) {
                return;
            }

            if (deltaX < 0) {
                goNext();
                return;
            }

            goPrev();
        },
        [goNext, goPrev],
    );

    const handleTouchCancel = useCallback(() => {
        touchStartRef.current = null;
    }, []);

    useEffect(() => {
        if (!autoplayActivo) {
            return undefined;
        }

        const timer = window.setTimeout(goNext, AUTOPLAY_INTERVAL);

        return () => window.clearTimeout(timer);
    }, [activeStep, autoplayActivo, goNext]);

    return (
        <Box
            component="section"
            role="region"
            aria-roledescription="carousel"
            aria-label="Carrusel destacado de productos"
            aria-describedby={`${carouselId}-instructions`}
            onMouseEnter={() => actualizarPausa("hover", true)}
            onMouseLeave={() => actualizarPausa("hover", false)}
            onFocusCapture={handleFocusCapture}
            onBlurCapture={handleBlurCapture}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            sx={{
                position: "relative",
                width: "100%",
                aspectRatio: { xs: "4 / 3", md: "16 / 9" },
                minHeight: { xs: 320, sm: 360, md: 420 },
                maxHeight: { xs: 560, md: 760 },
                overflow: "hidden",
                bgcolor: "var(--cla-brand-green-dark)",
                isolation: "isolate",
                borderBottomLeftRadius: { xs: 24, md: 36 },
                borderBottomRightRadius: { xs: 24, md: 36 },
            }}
        >
            <Box component="p" id={`${carouselId}-instructions`} sx={VISUALLY_HIDDEN_STYLES}>
                El carrusel rota automáticamente cada {AUTOPLAY_INTERVAL / 1000} segundos. Se pausa al pasar el cursor,
                al enfocar un control o al activar el botón de pausa.
            </Box>

            {diapositivas.map((slide, index) => {
                const slideId = `${carouselId}-slide-${slide.id}`;
                const isActive = index === activeStep;
                const textOnRight = index % 2 === 1;
                const imageJustifyContent = textOnRight ? "flex-start" : "flex-end";
                const textJustifyContent = textOnRight ? "flex-end" : "flex-start";
                const textAlign = textOnRight ? "right" : "left";
                const foregroundImagePosition = textOnRight ? "left center" : "right center";
                const contentGradient = textOnRight
                    ? "linear-gradient(90deg, rgba(244,234,213,0.06) 0%, rgba(6,42,27,0.16) 28%, rgba(6,42,27,0.62) 68%, rgba(2,27,17,0.9) 100%)"
                    : "linear-gradient(90deg, rgba(2,27,17,0.9) 0%, rgba(6,42,27,0.62) 32%, rgba(6,42,27,0.16) 72%, rgba(244,234,213,0.06) 100%)";

                return (
                    <Box
                        key={slide.id}
                        id={slideId}
                        role="group"
                        aria-roledescription="slide"
                        aria-label={`${index + 1} de ${totalDiapositivas}: ${slide.titulo}`}
                        aria-hidden={!isActive}
                        sx={{
                            position: "absolute",
                            inset: 0,
                            opacity: isActive ? 1 : 0,
                            transition: transicionFade,
                            zIndex: isActive ? 1 : 0,
                            pointerEvents: isActive ? "auto" : "none",
                        }}
                    >
                        <Image
                            src={slide.imagen}
                            alt=""
                            fill
                            priority={index === 0}
                            sizes={SLIDE_IMAGE_SIZES}
                            style={{
                                objectFit: "cover",
                                objectPosition: slide.posicion,
                                filter: "blur(28px) saturate(1.03) brightness(0.82)",
                                transform: "scale(1.12)",
                                opacity: 0.78,
                            }}
                        />

                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                background: contentGradient,
                            }}
                        />

                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                justifyContent: { xs: "center", md: imageJustifyContent },
                                alignItems: "stretch",
                                pointerEvents: "none",
                                zIndex: 1,
                                overflow: "hidden",
                            }}
                        >
                            <Box
                                sx={{
                                    position: "relative",
                                    width: "100%",
                                    height: "100%",
                                }}
                            >
                                <Image
                                    src={slide.imagen}
                                    alt={slide.alt ?? slide.titulo}
                                    fill
                                    priority={index === 0}
                                    sizes={SLIDE_IMAGE_SIZES}
                                    style={{
                                        objectFit: "contain",
                                        objectPosition: foregroundImagePosition,
                                        transform: "scale(1.015)",
                                    }}
                                />
                            </Box>
                        </Box>

                        <Container
                            maxWidth="lg"
                            sx={{
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: { xs: "center", md: textJustifyContent },
                                position: "relative",
                                zIndex: 2,
                            }}
                        >
                            <Stack
                                spacing={{ xs: 1.75, sm: 2.25, md: 2.5 }}
                                sx={{
                                    width: "100%",
                                    maxWidth: { xs: 340, sm: 460, md: 430 },
                                    py: { xs: 5, sm: 6, md: 7 },
                                    textAlign: { xs: "center", md: textAlign },
                                    alignItems: { xs: "center", md: textOnRight ? "flex-end" : "flex-start" },
                                    position: "relative",
                                    borderRadius: { xs: 5, md: 6 },
                                    border: "1px solid rgba(244,234,213,0.12)",
                                    background:
                                        "linear-gradient(180deg, rgba(7,31,21,0.56) 0%, rgba(7,31,21,0.22) 100%)",
                                    backdropFilter: "blur(8px)",
                                    boxShadow: "0 24px 44px rgba(0,0,0,0.16)",
                                    px: { xs: 2.5, sm: 3, md: 3.5 },
                                    opacity: isActive ? 1 : 0,
                                    transform: isActive ? "translateY(0)" : "translateY(16px)",
                                    transition: transicionContenido,
                                    transitionDelay: reduceMotion || !isActive ? "0s" : "0.15s",
                                }}
                            >
                                <Typography
                                    component="p"
                                    variant="overline"
                                    sx={{
                                        color: "var(--cla-brand-cream)",
                                        letterSpacing: { xs: 3, sm: 4, md: 5 },
                                        fontSize: { xs: "0.7rem", sm: "0.75rem" },
                                        fontWeight: 600,
                                    }}
                                >
                                    CLA Soulprint
                                </Typography>

                                <Typography
                                    component="h2"
                                    color="common.white"
                                    fontWeight={700}
                                    sx={{
                                        typography: { xs: "h4", sm: "h3", md: "h2" },
                                        lineHeight: { xs: 1.12, md: 1.15 },
                                        textShadow: "0 2px 20px rgba(0,0,0,0.3)",
                                    }}
                                >
                                    {slide.titulo}
                                </Typography>

                                <Typography
                                    variant="h6"
                                    sx={{
                                        color: "rgba(255,248,238,0.82)",
                                        fontWeight: 400,
                                        lineHeight: 1.6,
                                        fontSize: { xs: "0.95rem", sm: "1rem", md: "1.15rem" },
                                    }}
                                >
                                    {slide.descripcion}
                                </Typography>

                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={1.5}
                                    justifyContent={{ xs: "center", md: textOnRight ? "flex-end" : "flex-start" }}
                                    width="100%"
                                    pt={{ xs: 0.5, md: 1 }}
                                >
                                    <TooltipButton
                                        variant="contained"
                                        href={slide.enlace}
                                        size="large"
                                        tabIndex={isActive ? 0 : -1}
                                        tooltip={`Explorar ${slide.titulo}`}
                                        sx={{
                                            width: { xs: "100%", sm: "auto" },
                                            px: { xs: 3, md: 4 },
                                            py: 1.5,
                                            fontSize: { xs: "0.95rem", md: "1rem" },
                                            fontWeight: 600,
                                            bgcolor: "var(--cla-brand-cream)",
                                            color: "var(--cla-brand-green-dark)",
                                            "&:hover": { bgcolor: "#f8f0df" },
                                        }}
                                    >
                                        Explorar colección
                                    </TooltipButton>

                                    <TooltipButton
                                        variant="outlined"
                                        href="/productos"
                                        size="large"
                                        tabIndex={isActive ? 0 : -1}
                                        tooltip="Ir al catálogo general"
                                        sx={{
                                            width: { xs: "100%", sm: "auto" },
                                            px: { xs: 3, md: 4 },
                                            py: 1.5,
                                            fontSize: { xs: "0.95rem", md: "1rem" },
                                            fontWeight: 500,
                                            borderColor: "rgba(244,234,213,0.54)",
                                            color: "var(--cla-brand-cream)",
                                            "&:hover": {
                                                borderColor: "var(--cla-brand-cream)",
                                                bgcolor: "rgba(244,234,213,0.08)",
                                            },
                                        }}
                                    >
                                        Ver catálogo
                                    </TooltipButton>
                                </Stack>
                            </Stack>
                        </Container>
                    </Box>
                );
            })}

            <Box
                sx={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: SIDE_PANEL_WIDTH,
                    zIndex: 3,
                    pointerEvents: "none",
                    bgcolor: "rgba(0,72,37,0.84)",
                    borderRight: "1px solid rgba(244,234,213,0.1)",
                }}
            />

            <Box
                sx={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    right: 0,
                    width: SIDE_PANEL_WIDTH,
                    zIndex: 3,
                    pointerEvents: "none",
                    bgcolor: "rgba(0,72,37,0.84)",
                    borderLeft: "1px solid rgba(244,234,213,0.1)",
                }}
            />

            <TooltipIconButton
                onClick={goPrev}
                aria-label="Ver diapositiva anterior"
                tooltip="Diapositiva anterior"
                sx={{
                    ...navigationButtonStyles,
                    left: { xs: 8, md: 16 },
                }}
            >
                <IconChevronLeft size={22} stroke={2} />
            </TooltipIconButton>

            <TooltipIconButton
                onClick={goNext}
                aria-label="Ver diapositiva siguiente"
                tooltip="Diapositiva siguiente"
                sx={{
                    ...navigationButtonStyles,
                    right: { xs: 8, md: 16 },
                }}
            >
                <IconChevronRight size={22} stroke={2} />
            </TooltipIconButton>

            <TooltipButton
                type="button"
                onClick={toggleManualPause}
                aria-pressed={estadoPausa.manual}
                aria-label={estadoPausa.manual ? "Reanudar rotación automática" : "Pausar rotación automática"}
                tooltip={estadoPausa.manual ? "Reanudar autoplay del carrusel" : "Pausar autoplay del carrusel"}
                sx={{
                    position: "absolute",
                    right: { xs: 12, md: 24 },
                    bottom: { xs: 16, md: 24 },
                    zIndex: 10,
                    minWidth: 0,
                    px: { xs: 1.5, md: 2 },
                    py: 0.75,
                    color: "common.white",
                    fontSize: { xs: "0.75rem", md: "0.8125rem" },
                    fontWeight: 600,
                    textTransform: "none",
                    bgcolor: "rgba(244,234,213,0.12)",
                    border: "1px solid rgba(244,234,213,0.2)",
                    backdropFilter: "blur(6px)",
                    "&:hover": {
                        bgcolor: "rgba(244,234,213,0.2)",
                        borderColor: "rgba(244,234,213,0.42)",
                    },
                    "&:focus-visible": {
                        outline: "2px solid rgba(255,255,255,0.9)",
                        outlineOffset: 2,
                    },
                }}
            >
                {estadoPausa.manual ? "Reanudar" : "Pausar"}
            </TooltipButton>

            <Stack
                direction="row"
                spacing={1}
                sx={{
                    position: "absolute",
                    bottom: { xs: 18, md: 28 },
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 10,
                    px: 2,
                }}
            >
                {diapositivas.map((slide, index) => {
                    const isActive = index === activeStep;

                    return (
                        <Box
                            key={slide.id}
                            component="button"
                            type="button"
                            onClick={() => goToSlide(index)}
                            aria-label={`Ir a la diapositiva ${index + 1}: ${slide.titulo}`}
                            aria-controls={`${carouselId}-slide-${slide.id}`}
                            aria-current={isActive ? "true" : undefined}
                            sx={{
                                width: isActive ? 28 : 8,
                                height: 8,
                                borderRadius: "4px",
                                border: "none",
                                cursor: "pointer",
                                bgcolor: isActive ? "common.white" : "rgba(255,255,255,0.35)",
                                transition: reduceMotion ? "none" : "all 0.35s ease",
                                p: 0,
                                "&:hover": {
                                    bgcolor: isActive ? "common.white" : "rgba(255,255,255,0.6)",
                                },
                                "&:focus-visible": {
                                    outline: "2px solid rgba(255,255,255,0.9)",
                                    outlineOffset: 3,
                                },
                            }}
                        />
                    );
                })}
            </Stack>
        </Box>
    );
};

export default CarruselDestacado;
