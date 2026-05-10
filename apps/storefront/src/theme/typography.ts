const fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const headingFamily = fontFamily;

const typography = {
    fontFamily,
    h1: {
        fontFamily: headingFamily,
        fontWeight: 700,
        fontSize: '4rem',
        lineHeight: 1.04,
        letterSpacing: 0,
        '@media (max-width:600px)': {
            fontSize: '2.55rem',
        },
    },
    h2: {
        fontFamily: headingFamily,
        fontWeight: 700,
        fontSize: '3.15rem',
        lineHeight: 1.08,
        letterSpacing: 0,
        '@media (max-width:600px)': {
            fontSize: '2.15rem',
        },
    },
    h3: {
        fontFamily: headingFamily,
        fontWeight: 700,
        fontSize: '2.45rem',
        lineHeight: 1.12,
        letterSpacing: 0,
        '@media (max-width:600px)': {
            fontSize: '1.8rem',
        },
    },
    h4: {
        fontFamily: headingFamily,
        fontWeight: 700,
        fontSize: '2rem',
        lineHeight: 1.18,
        letterSpacing: 0,
        '@media (max-width:600px)': {
            fontSize: '1.55rem',
        },
    },
    h5: {
        fontFamily: headingFamily,
        fontWeight: 700,
        fontSize: '1.48rem',
        lineHeight: 1.24,
        letterSpacing: 0,
        '@media (max-width:600px)': {
            fontSize: '1.22rem',
        },
    },
    h6: {
        fontFamily: headingFamily,
        fontWeight: 700,
        fontSize: '1.12rem',
        lineHeight: 1.32,
        letterSpacing: 0,
    },
    button: {
        textTransform: 'none' as const,
        fontWeight: 700,
        letterSpacing: 0,
    },
    body1: {
        fontSize: '1rem',
        fontWeight: 400,
        lineHeight: 1.74,
    },
    body2: {
        fontSize: '0.875rem',
        letterSpacing: 0,
        fontWeight: 400,
        lineHeight: 1.62,
    },
    subtitle1: {
        fontSize: '1rem',
        fontWeight: 500,
        lineHeight: 1.68,
    },
    subtitle2: {
        fontSize: '0.875rem',
        fontWeight: 600,
        lineHeight: 1.5,
    },
    overline: {
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: 0,
        textTransform: 'uppercase' as const,
    },
};

export default typography;
