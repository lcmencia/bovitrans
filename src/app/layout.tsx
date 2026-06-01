import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BoviTrans — Gestión de Transporte Ganadero",
  description:
    "Plataforma logística para el transporte terrestre de ganado vacuno.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
