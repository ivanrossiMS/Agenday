"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type TestimonialItem = {
  id?: string;
  quote: string;
  author: string;
};

export type SiteSettings = {
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  aboutTitle: string;
  aboutText: string;
  aboutImage: string;
  businessStart: string;
  businessEnd: string;
  workDays?: number[]; // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
  whatsappNumber: string;
  salonAddress: string;
  mapsLink: string;
  preparationSteps: string[];
  logoUrl?: string;
  loginHeroImage?: string;
  loginQuote?: string;
  loginQuoteAuthor?: string;
  testimonials?: TestimonialItem[];
};

type SiteSettingsContextType = {
  settings: SiteSettings;
  updateSettings: (newSettings: Partial<SiteSettings>) => void;
};

const defaultTestimonials: TestimonialItem[] = [
  {
    id: "t1",
    quote: "Foi a melhor extensão de cílios que já fiz. Super natural e durou semanas intacta. O ambiente é um luxo!",
    author: "Amanda Guimarães"
  },
  {
    id: "t2",
    quote: "O cuidado que elas têm com a nossa unha é surreal. A esmaltação em gel ficou perfeita, sem bolhas, sem defeitos.",
    author: "Letícia Carvalho"
  }
];

const defaultSettings: SiteSettings = {
  heroTitle: "A sua beleza tratada como uma verdadeira joia",
  heroSubtitle: "Com Fran Marinho, cada detalhe é pensado para oferecer a você uma experiência de beleza inesquecível.",
  heroImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2000&auto=format&fit=crop",
  aboutTitle: "Experiência e Exclusividade",
  aboutText: "Nosso espaço foi desenhado para ser o seu refúgio urbano. Muito mais do que um salão, somos especialistas em elevar a autoestima através de técnicas modernas e atendimento personalizado. Trabalhamos com os melhores produtos do mercado mundial para garantir resultados impecáveis e duradouros.",
  aboutImage: "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=1000&auto=format&fit=crop",
  businessStart: "09:00",
  businessEnd: "18:00",
  workDays: [1, 2, 3, 4, 5, 6], // Seg a Sáb por padrão
  whatsappNumber: "5511999999999",
  salonAddress: "Fran Marinho Beauty Studio • Av. Afonso Pena, 1234",
  mapsLink: "https://maps.google.com",
  preparationSteps: [
    "Venha sem maquiagem nos olhos",
    "Informe alergias ou sensibilidades",
    "Traga uma foto de inspiração"
  ],
  logoUrl: "",
  loginHeroImage: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=1200&auto=format&fit=crop",
  loginQuote: "A beleza começa no momento em que você decide ser você mesma.",
  loginQuoteAuthor: "Coco Chanel",
  testimonials: defaultTestimonials
};

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const saved = localStorage.getItem("@agenday_settings");
      let localSettings: SiteSettings = defaultSettings;
      if (saved) {
        try {
          localSettings = JSON.parse(saved);
        } catch (e) {
          localSettings = defaultSettings;
        }
      }

      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json.configured) {
          if (json.settings) {
            const data = json.settings;
            let prepSteps = data.preparation_steps;
            if (typeof prepSteps === "string") {
              try { prepSteps = JSON.parse(prepSteps); } catch (err) {}
            }
            let parsedWorkDays = data.work_days;
            if (typeof parsedWorkDays === "string") {
              try { parsedWorkDays = JSON.parse(parsedWorkDays); } catch (err) {}
            }
            let parsedTestimonials = data.testimonials;
            if (typeof parsedTestimonials === "string") {
              try { parsedTestimonials = JSON.parse(parsedTestimonials); } catch (err) {}
            }

            const formatted: SiteSettings = {
              heroTitle: data.hero_title !== null && data.hero_title !== undefined ? data.hero_title : localSettings.heroTitle,
              heroSubtitle: data.hero_subtitle !== null && data.hero_subtitle !== undefined ? data.hero_subtitle : localSettings.heroSubtitle,
              heroImage: data.hero_image !== null && data.hero_image !== undefined ? data.hero_image : localSettings.heroImage,
              aboutTitle: data.about_title !== null && data.about_title !== undefined ? data.about_title : localSettings.aboutTitle,
              aboutText: data.about_text !== null && data.about_text !== undefined ? data.about_text : localSettings.aboutText,
              aboutImage: data.about_image !== null && data.about_image !== undefined ? data.about_image : localSettings.aboutImage,
              businessStart: data.business_start !== null && data.business_start !== undefined ? data.business_start : localSettings.businessStart,
              businessEnd: data.business_end !== null && data.business_end !== undefined ? data.business_end : localSettings.businessEnd,
              workDays: Array.isArray(parsedWorkDays) ? parsedWorkDays : (localSettings.workDays || defaultSettings.workDays),
              whatsappNumber: data.whatsapp_number !== null && data.whatsapp_number !== undefined ? data.whatsapp_number : localSettings.whatsappNumber,
              salonAddress: data.salon_address !== null && data.salon_address !== undefined ? data.salon_address : localSettings.salonAddress,
              mapsLink: data.maps_link !== null && data.maps_link !== undefined ? data.maps_link : localSettings.mapsLink,
              preparationSteps: Array.isArray(prepSteps) ? prepSteps : (localSettings.preparationSteps || defaultSettings.preparationSteps),
              logoUrl: data.logo_url !== null && data.logo_url !== undefined ? data.logo_url : (localSettings.logoUrl || ""),
              loginHeroImage: data.login_hero_image !== null && data.login_hero_image !== undefined ? data.login_hero_image : (localSettings.loginHeroImage || defaultSettings.loginHeroImage),
              loginQuote: data.login_quote !== null && data.login_quote !== undefined ? data.login_quote : (localSettings.loginQuote || defaultSettings.loginQuote),
              loginQuoteAuthor: data.login_quote_author !== null && data.login_quote_author !== undefined ? data.login_quote_author : (localSettings.loginQuoteAuthor || defaultSettings.loginQuoteAuthor),
              testimonials: Array.isArray(parsedTestimonials) ? parsedTestimonials : (localSettings.testimonials || defaultTestimonials)
            };




            setSettings(formatted);
            localStorage.setItem("@agenday_settings", JSON.stringify(formatted));
            setIsLoaded(true);
            return;
          } else {
            // DB has no settings row, seed it
            setSettings(localSettings);
            localStorage.setItem("@agenday_settings", JSON.stringify(localSettings));
            fetch("/api/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(localSettings)
            }).catch(e => console.error("Error seeding settings:", e));
            setIsLoaded(true);
            return;
          }
        }
      } catch (e) {
        console.error("Erro ao carregar configurações do site da API:", e);
      }

      setSettings(localSettings);
      localStorage.setItem("@agenday_settings", JSON.stringify(localSettings));
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
