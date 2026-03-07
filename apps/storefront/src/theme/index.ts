'use client';
import { createTheme } from '@mui/material/styles';
import { baselightTheme } from './palette';
import typography from './typography';

export const theme = createTheme({
    ...baselightTheme,
    typography,
    shape: {
        borderRadius: 8,
    },
});
