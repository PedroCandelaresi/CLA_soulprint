'use client';
import React from "react";
import {
    Box,
    Grid,
    Typography,
    Container,
    Divider,
    Stack,
    IconButton,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { IconBrandFacebook, IconBrandTwitter, IconBrandInstagram } from "@tabler/icons-react";

const Footer = () => {
    return (
        <Box sx={{ bgcolor: 'background.paper', pt: 6, pb: 2 }}>
            <Container maxWidth="lg">
                <Grid container spacing={3} justifyContent="center" mb={2}>
                    <Grid size={{ xs: 12 }} sx={{ textAlign: 'center' }}>
                        <Stack direction="row" spacing={2} justifyContent="center" mb={3}>
                            <IconButton href="#" color="primary"><IconBrandInstagram /></IconButton>
                            <IconButton href="#" color="primary"><IconBrandFacebook /></IconButton>
                        </Stack>
                    </Grid>
                </Grid>

                <Box py={3} textAlign="center">
                    <Typography variant="body2" color="textSecondary">
                        <Link href="https://intech.nqn.net.ar" target="_blank" style={{ textDecoration: 'none', color: 'inherit' }}>
                            Power By Intech.nqn
                        </Link>
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
};

export default Footer;
