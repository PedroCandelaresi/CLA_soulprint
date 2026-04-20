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
import { Box, Stack, Typography, useMediaQuery } from "@mui/material";
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
const SLIDE_IMAGE_SIZES = "(min-width: 900px) 58vw, 100vw";
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
    bgcolor: "rgba(255,250,242,0.14)",
    backdropFilter: "blur(6px)",
    border: "1px solid rgba(255,255,255,0.2)",
    width: { xs: 40, md: 52 },
    height: { xs: 40, md: 52 },
    borderRadius: 10,
    boxShadow: "none",
    "&:hover": {
        bgcolor: "rgba(255,250,242,0.28)",
        borderColor: "rgba(255,255,255,0.55)",
        transform: "translateY(-50%)",
        boxShadow: "none",
    },
    "&:focus-visible": {
        outline: "2px solid rgba(255,255,255,0.9)",
        outlineOffset: 2,
        transform: "translateY(-50%)",
    },
    "&:active": {
        transform: "translateY(-50%)",
    },
    transition: "background-color 0.2s ease, border-color 0.2s ease",
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
                height: "45vh",
                minHeight: { xs: 440, md: 420 },
                overflow: "hidden",
                bgcolor: "var(--cla-brand-green)",
                isolation: "isolate",
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
                const desktopColumns = textOnRight
                    ? "minmax(0, 1.14fr) minmax(0, 0.86fr)"
                    : "minmax(0, 0.86fr) minmax(0, 1.14fr)";
                const textBackground = textOnRight
                    ? "linear-gradient(135deg, rgba(0,72,37,0.98) 0%, rgba(6,38,22,0.94) 100%)"
                    : "linear-gradient(225deg, rgba(0,72,37,0.98) 0%, rgba(6,38,22,0.94) 100%)";
                const imageOverlay = textOnRight
                    ? "linear-gradient(90deg, rgba(0,72,37,0.28) 0%, rgba(0,72,37,0.08) 18%, rgba(3,25,15,0.08) 100%)"
                    : "linear-gradient(270deg, rgba(0,72,37,0.28) 0%, rgba(0,72,37,0.08) 18%, rgba(3,25,15,0.08) 100%)";

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
                        <Box
                            sx={{
                                position: "relative",
                                zIndex: 1,
                                display: "grid",
                                height: "100%",
                                gridTemplateColumns: { xs: "1fr", md: desktopColumns },
                                gridTemplateRows: { xs: "minmax(0, 0.9fr) minmax(0, 1.1fr)", md: "1fr" },
                            }}
                        >
                            <Box
                                sx={{
                                    position: "relative",
                                    order: { xs: 1, md: textOnRight ? 2 : 1 },
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    px: { xs: 3, sm: 4, md: 4.5, lg: 6 },
                                    py: { xs: 3.5, sm: 4, md: 4.5 },
                                    background: {
                                        xs: "linear-gradient(180deg, rgba(0,72,37,0.98) 0%, rgba(6,38,22,0.94) 100%)",
                                        md: textBackground,
                                    },
                                }}
                            >
                                <Stack
                                    spacing={{ xs: 1.2, sm: 1.5, md: 1.8 }}
                                    sx={{
                                        width: "100%",
                                        maxWidth: { xs: "100%", md: 430 },
                                        mx: "auto",
                                        textAlign: "center",
                                        alignItems: "center",
                                        fontFamily: "Arial, Helvetica, sans-serif",
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
                                            fontFamily: "Arial, Helvetica, sans-serif",
                                            letterSpacing: { xs: 2.5, sm: 3.5, md: 4.5 },
                                            fontSize: { xs: "0.68rem", sm: "0.72rem", md: "0.74rem" },
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
                                            fontFamily: "Arial, Helvetica, sans-serif",
                                            fontSize: {
                                                xs: "clamp(1.95rem, 7vw, 2.5rem)",
                                                sm: "clamp(2.2rem, 4.8vw, 3rem)",
                                                md: "clamp(2.35rem, 3.3vw, 3.3rem)",
                                            },
                                            lineHeight: 1.06,
                                            letterSpacing: "-0.04em",
                                        }}
                                    >
                                        {slide.titulo}
                                    </Typography>

                                    <Typography
                                        variant="h6"
                                        sx={{
                                            color: "rgba(255,248,238,0.82)",
                                            fontFamily: "Arial, Helvetica, sans-serif",
                                            fontWeight: 400,
                                            lineHeight: 1.45,
                                            fontSize: { xs: "0.92rem", sm: "0.98rem", md: "1rem" },
                                            maxWidth: { xs: "100%", md: 400 },
                                        }}
                                    >
                                        {slide.descripcion}
                                    </Typography>

                                    <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        spacing={1.5}
                                        justifyContent="center"
                                        width="100%"
                                        pt={{ xs: 0.5, md: 1 }}
                                        alignItems="center"
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
                                                py: 1.15,
                                                fontSize: { xs: "0.92rem", md: "0.96rem" },
                                                fontFamily: "Arial, Helvetica, sans-serif",
                                                fontWeight: 700,
                                                borderRadius: 10,
                                                border: "1px solid rgba(226,207,170,0.82)",
                                                background:
                                                    "linear-gradient(135deg, rgba(226,207,170,1) 0%, rgba(199,164,107,1) 100%)",
                                                boxShadow: "none",
                                                color: "var(--cla-brand-green-deep)",
                                                "&:hover": {
                                                    background:
                                                        "linear-gradient(135deg, rgba(235,217,184,1) 0%, rgba(210,176,118,1) 100%)",
                                                    boxShadow: "none",
                                                },
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
                                                py: 1.15,
                                                fontSize: { xs: "0.92rem", md: "0.96rem" },
                                                fontFamily: "Arial, Helvetica, sans-serif",
                                                fontWeight: 600,
                                                borderRadius: 10,
                                                borderColor: "rgba(244,234,213,0.5)",
                                                backgroundColor: "rgba(255,250,242,0.06)",
                                                color: "var(--cla-brand-paper)",
                                                "&:hover": {
                                                    borderColor: "rgba(244,234,213,0.72)",
                                                    backgroundColor: "rgba(244,234,213,0.14)",
                                                },
                                            }}
                                        >
                                            Ver catálogo
                                        </TooltipButton>
                                    </Stack>
                                </Stack>
                            </Box>

                            <Box
                                sx={{
                                    position: "relative",
                                    order: { xs: 2, md: textOnRight ? 1 : 2 },
                                    width: "100%",
                                    minHeight: { xs: 260, sm: 320, md: "100%" },
                                    overflow: "hidden",
                                    "&::before": {
                                        content: '""',
                                        position: "absolute",
                                        top: 0,
                                        bottom: 0,
                                        [textOnRight ? "right" : "left"]: 0,
                                        width: "1px",
                                        bgcolor: "rgba(244,234,213,0.16)",
                                        zIndex: 1,
                                    },
                                }}
                            >
                                <Image
                                    src={slide.imagen}
                                    alt={slide.alt ?? slide.titulo}
                                    fill
                                    priority={index === 0}
                                    sizes={SLIDE_IMAGE_SIZES}
                                    style={{
                                        objectFit: "cover",
                                        objectPosition: slide.posicion,
                                    }}
                                />
                                <Box
                                    sx={{
                                        position: "absolute",
                                        inset: 0,
                                        background: {
                                            xs: "linear-gradient(180deg, rgba(6,38,22,0.06) 0%, rgba(6,38,22,0.24) 100%)",
                                            md: imageOverlay,
                                        },
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>
                );
            })}

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
                    borderRadius: 10,
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
