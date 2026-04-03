'use client';
import {
    Box,
    Typography,
    Container,
    Stack,
    IconButton,
} from "@mui/material";
import Link from "next/link";
import { IconBrandFacebook, IconBrandInstagram } from "@tabler/icons-react";

const Footer = () => {
    return (
        <Box sx={{ bgcolor: 'background.paper', pt: 6, pb: 2 }}>
            <Container maxWidth="lg">
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 2, sm: 4 }}
                    alignItems="center"
                    justifyContent="center"
                    sx={{ py: 3, textAlign: { xs: 'center', sm: 'left' } }}
                >
                    <Stack direction="row" spacing={2} justifyContent="center">
                        <IconButton href="#" color="primary"><IconBrandInstagram /></IconButton>
                        <IconButton href="#" color="primary"><IconBrandFacebook /></IconButton>
                    </Stack>
                    <Typography variant="body2" color="textSecondary" sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                        <Link href="https://intech.nqn.net.ar" target="_blank" style={{ textDecoration: 'none', color: 'inherit' }}>
                            Power By Intech.nqn
                        </Link>
                    </Typography>
                </Stack>
            </Container>
        </Box>
    );
};

export default Footer;
