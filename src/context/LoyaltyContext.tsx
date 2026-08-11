"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAppointments } from "./AppointmentsContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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
      let remoteSettings: LoyaltySettings | null = null;
      let remoteClaims: LoyaltyClaim[] | null = null;

      if (isSupabaseConfigured() && supabase) {
        try {
          const [settingsRes, claimsRes] = await Promise.all([
            supabase.from("loyalty_settings").select("*").eq("id", "default").single(),
            supabase.from("loyalty_claims").select("*").order("created_at", { ascending: false })
          ]);

          if (!settingsRes.error && settingsRes.data) {
            remoteSettings = {
              stampsRequired: Number(settingsRes.data.stamps_required) || 5,
              prizeName: settingsRes.data.prize_name || "1 Hidratação Grátis",
              expirationDays: Number(settingsRes.data.expiration_days) || 90,
              isActive: settingsRes.data.is_active !== false
            };
          }

          if (!claimsRes.error && claimsRes.data) {
            remoteClaims = claimsRes.data.map((item: any) => ({
              id: Number(item.id),
              clientEmail: item.client_email,
              clientName: item.client_name,
              prizeName: item.prize_name,
              date: item.date
            }));
          }
        } catch (e) {
          console.error("Erro ao carregar fidelidade do Supabase:", e);
        }
      }

      if (remoteSettings) {
        setSettings(remoteSettings);
      } else {
        const savedSettings = localStorage.getItem("@agenday_loyalty_settings");
        if (savedSettings) setSettings(JSON.parse(savedSettings));
      }

      if (remoteClaims) {
        setClaims(remoteClaims);
      } else {
        const savedClaims = localStorage.getItem("@agenday_loyalty_claims");
        if (savedClaims) setClaims(JSON.parse(savedClaims));
      }

      setIsLoaded(true);
    }

    loadLoyalty();
  }, []);

  const updateSettings = async (newSettings: Partial<LoyaltySettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("@agenday_loyalty_settings", JSON.stringify(updated));

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("loyalty_settings").upsert({
          id: "default",
          stamps_required: updated.stampsRequired,
          prize_name: updated.prizeName,
          expiration_days: updated.expirationDays,
          is_active: updated.isActive,
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        console.error("Erro ao salvar configurações de fidelidade no Supabase:", e);
      }
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

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("loyalty_claims").insert({
          id: newId,
          client_email: clientEmail,
          client_name: clientName,
          prize_name: settings.prizeName,
          date: dateStr
        });
      } catch (e) {
        console.error("Erro ao salvar resgate no Supabase:", e);
      }
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
