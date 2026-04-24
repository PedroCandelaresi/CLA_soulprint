import { Suspense } from "react";
import type { Metadata } from "next";
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";
import "./global.css";


import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { StorefrontProvider } from "@/components/providers/StorefrontProvider";
import { Box } from "@mui/material";
import { getServerStorefrontState } from "@/lib/auth/session";

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
      <body>

        <ThemeRegistry>
          <StorefrontProvider initialState={initialState}>
            <Box display="flex" flexDirection="column" sx={{ height: '100vh', overflow: 'hidden' }}>
              <Suspense fallback={null}>
                <Header />
              </Suspense>
              <Box component="main" sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {children}
                <Footer />
              </Box>
            </Box>
          </StorefrontProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
