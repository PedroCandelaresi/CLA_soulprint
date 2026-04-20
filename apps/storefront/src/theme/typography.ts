import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';

export const plus = Plus_Jakarta_Sans({
    weight: ['300', '400', '500', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
    fallback: ['Helvetica', 'Arial', 'sans-serif'],
    variable: '--font-cla-sans',
});

export const cormorant = Cormorant_Garamond({
    weight: ['500', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
    fallback: ['Georgia', 'Times New Roman', 'serif'],
    variable: '--font-cla-serif',
});

const fontFamily = 'var(--font-cla-sans), Helvetica, Arial, sans-serif';
const headingFamily = 'var(--font-cla-serif), Georgia, serif';

const typography = {
    fontFamily,
    h1: {
        fontFamily: headingFamily,
        fontWeight: 600,
        fontSize: 'clamp(3rem, 7vw, 4.75rem)',
        lineHeight: 0.98,
        letterSpacing: '-0.035em',
    },
    h2: {
        fontFamily: headingFamily,
        fontWeight: 600,
        fontSize: 'clamp(2.45rem, 5vw, 3.75rem)',
        lineHeight: 1.02,
        letterSpacing: '-0.03em',
    },
    h3: {
        fontFamily: headingFamily,
        fontWeight: 600,
        fontSize: 'clamp(2rem, 4vw, 3rem)',
        lineHeight: 1.06,
        letterSpacing: '-0.028em',
    },
    h4: {
        fontFamily: headingFamily,
        fontWeight: 600,
        fontSize: 'clamp(1.65rem, 3.5vw, 2.35rem)',
        lineHeight: 1.12,
        letterSpacing: '-0.024em',
    },
    h5: {
        fontFamily: headingFamily,
        fontWeight: 600,
        fontSize: 'clamp(1.35rem, 2.4vw, 1.85rem)',
        lineHeight: 1.18,
        letterSpacing: '-0.02em',
    },
    h6: {
        fontFamily: headingFamily,
        fontWeight: 600,
        fontSize: 'clamp(1.08rem, 2vw, 1.4rem)',
        lineHeight: 1.24,
        letterSpacing: '-0.015em',
    },
    button: {
        textTransform: 'none' as const,
        fontWeight: 600,
        letterSpacing: '0.01em',
    },
    body1: {
        fontSize: '0.975rem',
        fontWeight: 400,
        lineHeight: 1.75,
    },
    body2: {
        fontSize: '0.875rem',
        letterSpacing: '0.005em',
        fontWeight: 400,
        lineHeight: 1.6,
    },
    subtitle1: {
        fontSize: '1rem',
        fontWeight: 500,
        lineHeight: 1.7,
    },
    subtitle2: {
        fontSize: '0.875rem',
        fontWeight: 600,
        lineHeight: 1.55,
    },
    overline: {
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.24em',
    },
};

export default typography;
