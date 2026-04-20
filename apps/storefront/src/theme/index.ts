'use client';
import { alpha, createTheme } from '@mui/material/styles';
import { baselightTheme } from './palette';
import typography from './typography';

const border = alpha('#004825', 0.08);
const strongBorder = alpha('#004825', 0.14);
const surfaceGlow = '0 22px 50px rgba(7, 35, 24, 0.08)';

export const theme = createTheme({
    ...baselightTheme,
    typography,
    shape: {
        borderRadius: 24,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                ':root': {
                    colorScheme: 'light',
                },
            },
        },
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
                    paddingBlock: '0.78rem',
                },
                containedPrimary: {
                    background: 'linear-gradient(135deg, #0A5A31 0%, #062616 100%)',
                    boxShadow: '0 18px 32px rgba(6, 38, 22, 0.18)',
                    '&:hover': {
                        boxShadow: '0 22px 34px rgba(6, 38, 22, 0.22)',
                        background: 'linear-gradient(135deg, #116D3D 0%, #041C11 100%)',
                    },
                },
                containedSecondary: {
                    background: 'linear-gradient(135deg, #E4C28E 0%, #C7A46B 100%)',
                    color: '#173428',
                    boxShadow: '0 16px 30px rgba(139, 102, 57, 0.18)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #E7CC9F 0%, #BE975E 100%)',
                    },
                },
                outlinedPrimary: {
                    borderColor: strongBorder,
                    backgroundColor: alpha('#FFFDF8', 0.72),
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                        borderColor: '#004825',
                        backgroundColor: alpha('#004825', 0.05),
                    },
                },
                textPrimary: {
                    '&:hover': {
                        backgroundColor: alpha('#004825', 0.05),
                    },
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    borderRadius: 999,
                    border: `1px solid ${border}`,
                    backgroundColor: alpha('#FFFDF8', 0.74),
                    backdropFilter: 'blur(12px)',
                    transition:
                        'transform 0.22s ease, box-shadow 0.22s ease, background-color 0.22s ease, border-color 0.22s ease',
                    '&:hover': {
                        backgroundColor: '#FFFDF8',
                        borderColor: strongBorder,
                        boxShadow: '0 14px 28px rgba(7, 35, 24, 0.12)',
                        transform: 'translateY(-1px)',
                    },
                    '&.Mui-disabled': {
                        opacity: 0.45,
                        borderColor: border,
                        backgroundColor: alpha('#FFFDF8', 0.4),
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 32,
                    border: `1px solid ${border}`,
                    boxShadow: surfaceGlow,
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    borderColor: border,
                },
                rounded: {
                    borderRadius: 28,
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 999,
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                    backdropFilter: 'blur(10px)',
                },
                outlined: {
                    borderColor: strongBorder,
                    backgroundColor: alpha('#FFFDF8', 0.7),
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
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 20,
                    backgroundColor: alpha('#FFFDF8', 0.9),
                    '& fieldset': {
                        borderColor: strongBorder,
                    },
                    '&:hover fieldset': {
                        borderColor: alpha('#004825', 0.28),
                    },
                    '&.Mui-focused fieldset': {
                        borderColor: '#004825',
                        boxShadow: `0 0 0 4px ${alpha('#C7A46B', 0.16)}`,
                    },
                },
            },
        },
        MuiDivider: {
            styleOverrides: {
                root: {
                    borderColor: border,
                },
            },
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 20,
                    border: `1px solid ${border}`,
                },
                standardInfo: {
                    backgroundColor: alpha('#376E63', 0.08),
                },
                standardSuccess: {
                    backgroundColor: alpha('#2F7D4E', 0.08),
                },
                standardWarning: {
                    backgroundColor: alpha('#B8882C', 0.1),
                },
                standardError: {
                    backgroundColor: alpha('#B95C4E', 0.08),
                },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor: alpha('#062616', 0.96),
                    color: '#FFF9F1',
                    border: `1px solid ${alpha('#E4C28E', 0.24)}`,
                    borderRadius: 14,
                    padding: '0.65rem 0.8rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    boxShadow: '0 18px 34px rgba(6, 27, 18, 0.24)',
                },
                arrow: {
                    color: alpha('#062616', 0.96),
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                root: {
                    minHeight: 52,
                    backgroundColor: alpha('#FFFDF8', 0.7),
                    borderRadius: 999,
                    border: `1px solid ${border}`,
                    padding: 4,
                },
                indicator: {
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, rgba(0,72,37,0.12), rgba(199,164,107,0.18))',
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    minHeight: 44,
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 999,
                    zIndex: 1,
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 18,
                    transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                    },
                },
            },
        },
        MuiBadge: {
            styleOverrides: {
                badge: {
                    fontWeight: 700,
                    border: '2px solid #062616',
                },
            },
        },
    },
});
