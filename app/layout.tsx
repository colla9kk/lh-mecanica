import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LH Mecânica Automotiva | Guarujá",
  description: "Oficina mecânica, manutenção automotiva e socorro 24 horas em Guarujá.",
  icons: {
    icon: [
      { url: "/icons/logo-lh-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/logo-lh-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/logo-lh-32.png",
    apple: { url: "/icons/logo-lh-180.png", sizes: "180x180", type: "image/png" },
  },
  manifest: "/site.webmanifest",
  appleWebApp: { capable: true, title: "Mecânica LH", statusBarStyle: "default" },
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
