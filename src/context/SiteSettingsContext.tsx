"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type SiteSettings = {
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  aboutTitle: string;
  aboutText: string;
  aboutImage: string;
  businessStart: string;
  businessEnd: string;
  whatsappNumber: string;
  salonAddress: string;
  mapsLink: string;
  preparationSteps: string[];
  logoUrl?: string;
};

type SiteSettingsContextType = {
  settings: SiteSettings;
  updateSettings: (newSettings: Partial<SiteSettings>) => void;
};

const defaultSettings: SiteSettings = {
  heroTitle: "A sua beleza tratada como uma verdadeira joia",
  heroSubtitle: "Com Fran Marinho, cada detalhe é pensado para oferecer a você uma experiência de beleza inesquecível.",
  heroImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2000&auto=format&fit=crop",
  aboutTitle: "Experiência e Exclusividade",
  aboutText: "Nosso espaço foi desenhado para ser o seu refúgio urbano. Muito mais do que um salão, somos especialistas em elevar a autoestima através de técnicas modernas e atendimento personalizado. Trabalhamos com os melhores produtos do mercado mundial para garantir resultados impecáveis e duradouros.",
  aboutImage: "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=1000&auto=format&fit=crop",
  businessStart: "09:00",
  businessEnd: "18:00",
  whatsappNumber: "5511999999999",
  salonAddress: "Fran Marinho Beauty Studio • Av. Afonso Pena, 1234",
  mapsLink: "https://maps.google.com",
  preparationSteps: [
    "Venha sem maquiagem nos olhos",
    "Informe alergias ou sensibilidades",
    "Traga uma foto de inspiração"
  ],
  logoUrl: ""
};

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json.configured && json.settings) {
          const data = json.settings;
          const formatted: SiteSettings = {
            heroTitle: data.hero_title || defaultSettings.heroTitle,
            heroSubtitle: data.hero_subtitle || defaultSettings.heroSubtitle,
            heroImage: data.hero_image || defaultSettings.heroImage,
            aboutTitle: data.about_title || defaultSettings.aboutTitle,
            aboutText: data.about_text || defaultSettings.aboutText,
            aboutImage: data.about_image || defaultSettings.aboutImage,
            businessStart: data.business_start || defaultSettings.businessStart,
            businessEnd: data.business_end || defaultSettings.businessEnd,
            whatsappNumber: data.whatsapp_number || defaultSettings.whatsappNumber,
            salonAddress: data.salon_address || defaultSettings.salonAddress,
            mapsLink: data.maps_link || defaultSettings.mapsLink,
            preparationSteps: Array.isArray(data.preparation_steps) ? data.preparation_steps : defaultSettings.preparationSteps,
            logoUrl: data.logo_url || ""
          };
          setSettings(formatted);
          localStorage.setItem("@agenday_settings", JSON.stringify(formatted));
          setIsLoaded(true);
          return;
        }
      } catch (e) {
        console.error("Erro ao carregar configurações do site da API:", e);
      }

      const saved = localStorage.getItem("@agenday_settings");
      if (saved) {
        try {
          setSettings(JSON.parse(saved));
        } catch (e) {
          setSettings(defaultSettings);
        }
      }
      setIsLoaded(true);
    }

    loadSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<SiteSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("@agenday_settings", JSON.stringify(updated));

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error("Erro ao atualizar configurações via API:", e);
    }
  };

  if (!isLoaded) return <div style={{ display: "none" }}>{children}</div>;

  return (
    <SiteSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    throw new Error("useSiteSettings must be used within a SiteSettingsProvider");
  }
  return context;
}
