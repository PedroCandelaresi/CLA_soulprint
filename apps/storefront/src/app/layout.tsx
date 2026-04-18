import { Suspense } from "react";
import type { Metadata } from "next";
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";
import "./global.css";


import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { StorefrontProvider } from "@/components/providers/StorefrontProvider";
import { Box } from "@mui/material";
import { getServerStorefrontState } from "@/lib/auth/session";
import { plus } from "@/theme/typography";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CLA Soulprint",
  description: "Storefront inspirado en CLA Soulprint para una experiencia visual más cálida, editorial y premium.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialState = await getServerStorefrontState();

  return (
    <html lang="es">
      <body className={plus.className}>

        <ThemeRegistry>
          <StorefrontProvider initialState={initialState}>
            <Box display="flex" flexDirection="column" minHeight="100vh">
              <Suspense fallback={null}>
                <Header />
              </Suspense>
              <Box component="main" flexGrow={1}>
                {children}
              </Box>
              <Footer />
            </Box>
          </StorefrontProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
