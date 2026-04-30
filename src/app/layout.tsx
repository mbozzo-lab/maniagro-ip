import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maniagro – Ingeniería de Procesos",
  description: "Gestión de proyectos del área de Ingeniería de Procesos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
