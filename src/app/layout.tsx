import React from "react";
import MyApp from "./app";
import NextTopLoader from 'nextjs-toploader';
import "./global.css";
import { CustomizerContextProvider } from "./context/customizerContext";


export const metadata = {
  title: "CLA | Accesorios para humanos y mascotas",
  description: "Tienda y panel de administración de CLA, accesorios de joyería para toda la familia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <NextTopLoader color="#5D87FF" />
        <CustomizerContextProvider>
          <MyApp>{children}</MyApp>
        </CustomizerContextProvider>
      </body>
    </html>
  );
}
