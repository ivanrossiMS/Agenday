"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAppointments } from "./AppointmentsContext";

export type LoyaltySettings = {
  stampsRequired: number;
  prizeName: string;
  expirationDays: number;
  isActive: boolean;
};

export type LoyaltyClaim = {
  id: number;
  clientEmail: string;
  clientName: string;
  prizeName: string;
  date: string;
};

export type LoyaltyUserStats = {
  clientEmail: string;
  clientName: string;
  stamps: number;
  completedAppointments: number;
  availablePrizes: number;
};

type LoyaltyContextType = {
  settings: LoyaltySettings;
  updateSettings: (newSettings: Partial<LoyaltySettings>) => void;
  claims: LoyaltyClaim[];
  claimPrize: (clientEmail: string, clientName: string) => void;
  getUserStats: (clientEmail: string) => LoyaltyUserStats;
  getAllStats: () => LoyaltyUserStats[];
};

const defaultSettings: LoyaltySettings = {
  stampsRequired: 5,
  prizeName: "1 Hidratação Grátis",
  expirationDays: 90,
  isActive: true,
};

const LoyaltyContext = createContext<LoyaltyContextType | undefined>(undefined);

export function LoyaltyProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LoyaltySettings>(defaultSettings);
  const [claims, setClaims] = useState<LoyaltyClaim[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { appointments } = useAppointments();

  useEffect(() => {
    async function loadLoyalty() {
      const savedSettings = localStorage.getItem("@agenday_loyalty_settings");
      const localSettings: LoyaltySettings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;
      const savedClaims = localStorage.getItem("@agenday_loyalty_claims");
      const localClaims: LoyaltyClaim[] = savedClaims ? JSON.parse(savedClaims) : [];

      try {
        const res = await fetch("/api/loyalty");
        const json = await res.json();
        if (json.configured) {
          if (json.settings) {
            const formattedSettings: LoyaltySettings = {
              stampsRequired: Number(json.settings.stamps_required) || 5,
              prizeName: json.settings.prize_name || "1 Hidratação Grátis",
              expirationDays: Number(json.settings.expiration_days) || 90,
              isActive: json.settings.is_active !== false
            };
            setSettings(formattedSettings);
            localStorage.setItem("@agenday_loyalty_settings", JSON.stringify(formattedSettings));
          } else {
            setSettings(localSettings);
            localStorage.setItem("@agenday_loyalty_settings", JSON.stringify(localSettings));
            fetch("/api/loyalty", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "updateSettings", settings: localSettings })
            }).catch(e => console.error("Error seeding loyalty settings:", e));
          }

          if (Array.isArray(json.claims)) {
            if (json.claims.length > 0) {
              const formattedClaims: LoyaltyClaim[] = json.claims.map((item: any) => ({
                id: Number(item.id),
                clientEmail: item.client_email,
                clientName: item.client_name,
                prizeName: item.prize_name,
                date: item.date
              }));
              setClaims(formattedClaims);
              localStorage.setItem("@agenday_loyalty_claims", JSON.stringify(formattedClaims));
            } else if (localClaims.length > 0) {
              setClaims(localClaims);
              localStorage.setItem("@agenday_loyalty_claims", JSON.stringify(localClaims));
              for (const c of localClaims) {
                fetch("/api/loyalty", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "claimPrize", claim: c })
                }).catch(e => console.error("Error seeding claim:", e));
              }
            }
          }
          setIsLoaded(true);
          return;
        }
      } catch (e) {
        console.error("Erro ao carregar fidelidade da API:", e);
      }

      setSettings(localSettings);
      setClaims(localClaims);
      localStorage.setItem("@agenday_loyalty_settings", JSON.stringify(localSettings));
      localStorage.setItem("@agenday_loyalty_claims", JSON.stringify(localClaims));
      setIsLoaded(true);
    }


    loadLoyalty();
  }, []);

  const updateSettings = async (newSettings: Partial<LoyaltySettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("@agenday_loyalty_settings", JSON.stringify(updated));

    try {
      await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateSettings", settings: updated })
      });
    } catch (e) {
      console.error("Erro ao salvar configurações de fidelidade:", e);
    }
  };

  const claimPrize = async (clientEmail: string, clientName: string) => {
    const newId = Date.now();
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const newClaim: LoyaltyClaim = {
      id: newId,
      clientEmail,
      clientName,
      prizeName: settings.prizeName,
      date: dateStr,
    };
    const updatedClaims = [newClaim, ...claims];
    setClaims(updatedClaims);
    localStorage.setItem("@agenday_loyalty_claims", JSON.stringify(updatedClaims));

    try {
      await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claimPrize", claim: newClaim })
      });
    } catch (e) {
      console.error("Erro ao salvar resgate de fidelidade:", e);
    }
  };

  const getUserStats = (clientEmail: string): LoyaltyUserStats => {
    const completedApps = appointments.filter(a => a.clientEmail === clientEmail && a.status === 'completed');
    const totalCompleted = completedApps.length;
    const userClaims = claims.filter(c => c.clientEmail === clientEmail).length;
    const earnedPrizes = Math.floor(totalCompleted / (settings.stampsRequired || 5));
    const availablePrizes = Math.max(0, earnedPrizes - userClaims);
    const stamps = totalCompleted % (settings.stampsRequired || 5);

    return {
      clientEmail,
      clientName: completedApps[0]?.clientName || "Cliente",
      stamps,
      completedAppointments: totalCompleted,
      availablePrizes,
    };
  };

  const getAllStats = (): LoyaltyUserStats[] => {
    const uniqueEmails = Array.from(new Set(appointments.filter(a => a.status === 'completed').map(a => a.clientEmail)));
    return uniqueEmails.map(email => getUserStats(email)).sort((a, b) => b.stamps - a.stamps);
  };

  if (!isLoaded) return null;

  return (
    <LoyaltyContext.Provider value={{ settings, updateSettings, claims, claimPrize, getUserStats, getAllStats }}>
      {children}
    </LoyaltyContext.Provider>
  );
}

export function useLoyalty() {
  const context = useContext(LoyaltyContext);
  if (context === undefined) {
    throw new Error("useLoyalty must be used within a LoyaltyProvider");
  }
  return context;
}
