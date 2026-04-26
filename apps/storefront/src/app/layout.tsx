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

function getSiteUrl(): string {
  const rawSiteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    return new URL(rawSiteUrl).origin;
  } catch {
    return "http://localhost:3000";
  }
}

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "CLA Soulprint",
  description: "Storefront inspirado en CLA Soulprint para una experiencia visual más cálida, editorial y premium.",
  applicationName: "CLA Soulprint",
  openGraph: {
    title: "CLA Soulprint",
    description: "Storefront inspirado en CLA Soulprint para una experiencia visual más cálida, editorial y premium.",
    siteName: "CLA Soulprint",
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CLA Soulprint",
    description: "Storefront inspirado en CLA Soulprint para una experiencia visual más cálida, editorial y premium.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
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
