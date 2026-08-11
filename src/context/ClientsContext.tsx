"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type ClientItem = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  photoUrl?: string;
};

type ClientsContextType = {
  clients: ClientItem[];
  addClient: (client: Omit<ClientItem, "id">) => void;
  updateClient: (id: string, updates: Partial<ClientItem>) => void;
  deleteClient: (id: string) => void;
};

const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadClients() {
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase.from("clients").select("*");
          if (!error && data) {
            const formatted: ClientItem[] = data.map((item: any) => ({
              id: item.id,
              name: item.name,
              email: item.email,
              phone: item.phone || undefined,
              address: item.address || undefined,
              birthDate: item.birth_date || undefined,
              photoUrl: item.photo_url || undefined,
            })).filter(c => c.email !== "cliente@vip.com");

            setClients(formatted);
            localStorage.setItem("@agenday:clients", JSON.stringify(formatted));
            setIsLoaded(true);
            return;
          }
        } catch (e) {
          console.error("Erro ao carregar clientes do Supabase:", e);
        }
      }

      const saved = localStorage.getItem("@agenday:clients");
      if (saved) {
        try {
          const parsed = JSON.parse(saved).filter((c: ClientItem) => c.email !== "cliente@vip.com");
          setClients(parsed);
        } catch (e) {
          setClients([]);
        }
      }
      setIsLoaded(true);
    }

    loadClients();
  }, []);

  const saveToStorage = (newClients: ClientItem[]) => {
    setClients(newClients);
    localStorage.setItem("@agenday:clients", JSON.stringify(newClients));
  };

  const addClient = async (client: Omit<ClientItem, "id">) => {
    const newId = Math.random().toString(36).substring(2, 11);
    const newClient = { ...client, id: newId };
    const updatedList = [...clients, newClient];
    saveToStorage(updatedList);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("clients").insert({
          id: newId,
          name: client.name,
          email: client.email,
          phone: client.phone || "",
          address: client.address || "",
          birth_date: client.birthDate || "",
          photo_url: client.photoUrl || ""
        });
      } catch (e) {
        console.error("Erro ao adicionar cliente no Supabase:", e);
      }
    }
  };

  const updateClient = async (id: string, updates: Partial<ClientItem>) => {
    const updatedList = clients.map(c => c.id === id ? { ...c, ...updates } : c);
    saveToStorage(updatedList);

    if (isSupabaseConfigured() && supabase) {
      try {
        const payload: any = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.email !== undefined) payload.email = updates.email;
        if (updates.phone !== undefined) payload.phone = updates.phone;
        if (updates.address !== undefined) payload.address = updates.address;
        if (updates.birthDate !== undefined) payload.birth_date = updates.birthDate;
        if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl;

        await supabase.from("clients").update(payload).eq("id", id);
      } catch (e) {
        console.error("Erro ao atualizar cliente no Supabase:", e);
      }
    }
  };

  const deleteClient = async (id: string) => {
    const updatedList = clients.filter(c => c.id !== id);
    saveToStorage(updatedList);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("clients").delete().eq("id", id);
      } catch (e) {
        console.error("Erro ao deletar cliente no Supabase:", e);
      }
    }
  };

  if (!isLoaded) return null;

  return (
    <ClientsContext.Provider value={{ clients, addClient, updateClient, deleteClient }}>
      {children}
    </ClientsContext.Provider>
  );
}

export function useClients() {
  const context = useContext(ClientsContext);
  if (context === undefined) {
    throw new Error("useClients must be used within a ClientsProvider");
  }
  return context;
}
