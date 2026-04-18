'use client';
import { alpha, createTheme } from '@mui/material/styles';
import { baselightTheme } from './palette';
import typography from './typography';

export const theme = createTheme({
    ...baselightTheme,
    typography,
    shape: {
        borderRadius: 18,
    },
    components: {
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    borderRadius: 999,
                    textTransform: 'none',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    paddingInline: '1.35rem',
                },
                containedPrimary: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'none',
                        backgroundColor: '#022C18',
                    },
                },
                outlinedPrimary: {
                    borderColor: alpha('#004825', 0.26),
                    '&:hover': {
                        borderColor: '#004825',
                        backgroundColor: alpha('#004825', 0.04),
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 28,
                    boxShadow: '0 18px 40px rgba(15, 38, 28, 0.08)',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
                rounded: {
                    borderRadius: 24,
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 999,
                    fontWeight: 600,
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: 'none',
                },
            },
        },
        MuiTextField: {
            defaultProps: {
                variant: 'outlined',
            },
        },
    },
});
