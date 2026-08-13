import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import { AuthProvider } from "@/context/AuthContext";
import { ServicesProvider } from "@/context/ServicesContext";
import { SiteSettingsProvider } from "@/context/SiteSettingsContext";
import { AppointmentsProvider } from "@/context/AppointmentsContext";
import { LoyaltyProvider } from "@/context/LoyaltyContext";
import { ClientsProvider } from "@/context/ClientsContext";

import GoogleAuthProviderWrapper from "@/components/GoogleAuthProviderWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://franmarinho.com.br'),
  title: "Fran Marinho | Studio de Beleza & Estética",
  description: "Agende seus serviços de beleza com facilidade, conforto e luxo com Fran Marinho.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.svg"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "apple-touch-icon-precomposed", url: "/apple-touch-icon.png" },
    ],
  },
  openGraph: {
    title: "Fran Marinho | Studio de Beleza & Estética",
    description: "Agende seus serviços de beleza com facilidade, conforto e luxo com Fran Marinho.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fran Marinho Studio de Beleza Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fran Marinho | Studio de Beleza & Estética",
    description: "Agende seus serviços de beleza com facilidade, conforto e luxo com Fran Marinho.",
    images: ["/og-image.png"],
  },
};

export const viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable}`}>
        <GoogleAuthProviderWrapper>
          <SiteSettingsProvider>
            <AuthProvider>
              <ClientsProvider>
                <ServicesProvider>
                  <AppointmentsProvider>
                    <LoyaltyProvider>
                      <Header />
                      <main>{children}</main>
                      <WhatsAppButton />
                    </LoyaltyProvider>
                  </AppointmentsProvider>
                </ServicesProvider>
              </ClientsProvider>
            </AuthProvider>
          </SiteSettingsProvider>
        </GoogleAuthProviderWrapper>
      </body>
    </html>
  );
}
