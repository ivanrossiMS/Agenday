"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

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
      try {
        const res = await fetch("/api/clients");
        const json = await res.json();
        if (json.configured && Array.isArray(json.data)) {
          const formatted: ClientItem[] = json.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            email: item.email,
            phone: item.phone || undefined,
            address: item.address || undefined,
            birthDate: item.birth_date || undefined,
            photoUrl: item.photo_url || undefined,
          })).filter((c: ClientItem) => c.email !== "cliente@vip.com");

          setClients(formatted);
          localStorage.setItem("@agenday:clients", JSON.stringify(formatted));
          setIsLoaded(true);
          return;
        }
      } catch (e) {
        console.error("Erro ao carregar clientes da API:", e);
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

    try {
      await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient)
      });
    } catch (e) {
      console.error("Erro ao adicionar cliente via API:", e);
    }
  };

  const updateClient = async (id: string, updates: Partial<ClientItem>) => {
    const target = clients.find(c => c.id === id);
    const updated = { ...(target || {}), ...updates, id } as ClientItem;
    const updatedList = clients.map(c => c.id === id ? updated : c);
    saveToStorage(updatedList);

    try {
      await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error("Erro ao atualizar cliente via API:", e);
    }
  };

  const deleteClient = async (id: string) => {
    const updatedList = clients.filter(c => c.id !== id);
    saveToStorage(updatedList);

    try {
      await fetch(`/api/clients?id=${id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Erro ao deletar cliente via API:", e);
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
