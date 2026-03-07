import type { Metadata } from "next";
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";
import "./global.css";


import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Box } from "@mui/material";
import { plus } from "@/theme/typography";

export const metadata: Metadata = {
  title: "Tienda - Storefront",
  description: "E-commerce storefront",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={plus.className}>

        <ThemeRegistry>
          <Box display="flex" flexDirection="column" minHeight="100vh">
            <Header />
            <Box component="main" flexGrow={1}>
              {children}
            </Box>
            <Footer />
          </Box>
        </ThemeRegistry>
      </body>
    </html>
  );
}
