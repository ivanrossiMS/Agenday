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

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Agenday | Agendamento de Beleza Premium",
  description: "Agende seus serviços de beleza com facilidade, conforto e luxo.",
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
      </body>
    </html>
  );
}
