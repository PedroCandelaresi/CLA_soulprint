const fontFamily = 'Arial, Helvetica, sans-serif';
const headingFamily = 'Arial, Helvetica, sans-serif';

const typography = {
    fontFamily,
    h1: {
        fontFamily: headingFamily,
        fontWeight: 700,
        fontSize: 'clamp(2.8rem, 6vw, 4.2rem)',
        lineHeight: 1.02,
        letterSpacing: '-0.04em',
    },
    h2: {
        fontFamily: headingFamily,
        fontWeight: 700,
        fontSize: 'clamp(2.2rem, 4.8vw, 3.3rem)',
        lineHeight: 1.05,
        letterSpacing: '-0.032em',
    },
    h3: {
        fontFamily: headingFamily,
        fontWeight: 700,
        fontSize: 'clamp(1.85rem, 3.8vw, 2.65rem)',
        lineHeight: 1.08,
        letterSpacing: '-0.026em',
    },
    h4: {
        fontFamily: headingFamily,
        fontWeight: 700,
        fontSize: 'clamp(1.5rem, 3vw, 2.05rem)',
        lineHeight: 1.14,
        letterSpacing: '-0.02em',
    },
    h5: {
        fontFamily: headingFamily,
        fontWeight: 700,
        fontSize: 'clamp(1.22rem, 2.1vw, 1.6rem)',
        lineHeight: 1.18,
        letterSpacing: '-0.015em',
    },
    h6: {
        fontFamily: headingFamily,
        fontWeight: 700,
        fontSize: 'clamp(1rem, 1.8vw, 1.22rem)',
        lineHeight: 1.24,
        letterSpacing: '-0.01em',
    },
    button: {
        textTransform: 'none' as const,
        fontWeight: 700,
        letterSpacing: '0.01em',
    },
    body1: {
        fontSize: '0.975rem',
        fontWeight: 400,
        lineHeight: 1.72,
    },
    body2: {
        fontSize: '0.875rem',
        letterSpacing: '0.005em',
        fontWeight: 400,
        lineHeight: 1.58,
    },
    subtitle1: {
        fontSize: '1rem',
        fontWeight: 500,
        lineHeight: 1.64,
    },
    subtitle2: {
        fontSize: '0.875rem',
        fontWeight: 600,
        lineHeight: 1.5,
    },
    overline: {
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.22em',
    },
};

export default typography;
