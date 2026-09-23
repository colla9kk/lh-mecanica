import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LH Mecânica Automotiva | Guarujá",
  description: "Oficina mecânica, manutenção automotiva e socorro 24 horas em Guarujá.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
