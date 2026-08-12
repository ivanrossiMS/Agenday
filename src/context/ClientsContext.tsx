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
  status?: "active" | "inactive";
  password?: string;
};


type ClientsContextType = {
  clients: ClientItem[];
  addClient: (client: Omit<ClientItem, "id">) => Promise<{ success: boolean; error?: string }>;
  updateClient: (id: string, updates: Partial<ClientItem>) => Promise<{ success: boolean; error?: string }>;
  deleteClient: (id: string) => void;
};

const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadClients() {
      const saved = localStorage.getItem("@agenday:clients");
      let localClients: ClientItem[] = [];
      if (saved) {
        try {
          localClients = JSON.parse(saved).filter((c: ClientItem) => c.email !== "cliente@vip.com");
        } catch (e) {
          localClients = [];
        }
      }

      try {
        const res = await fetch("/api/clients");
        const json = await res.json();
        if (json.configured && Array.isArray(json.data)) {
          if (json.data.length > 0) {
            const formatted: ClientItem[] = json.data.map((item: any) => ({
              id: item.id,
              name: item.name,
              email: item.email,
              phone: item.phone || undefined,
              address: item.address || undefined,
              birthDate: item.birth_date || undefined,
              photoUrl: item.photo_url || undefined,
              status: item.status || "active",
            })).filter((c: ClientItem) => c.email !== "cliente@vip.com");

            setClients(formatted);
            localStorage.setItem("@agenday:clients", JSON.stringify(formatted));
            setIsLoaded(true);
            return;
          } else if (localClients.length > 0) {
            // DB is empty, seed DB with local clients
            setClients(localClients);
            localStorage.setItem("@agenday:clients", JSON.stringify(localClients));
            for (const c of localClients) {
              fetch("/api/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(c)
              }).catch(e => console.error("Error seeding client:", e));
            }
            setIsLoaded(true);
            return;
          }
        }
      } catch (e) {
        console.error("Erro ao carregar clientes da API:", e);
      }

      setClients(localClients);
      localStorage.setItem("@agenday:clients", JSON.stringify(localClients));
      setIsLoaded(true);
    }


    loadClients();
  }, []);

  const saveToStorage = (newClients: ClientItem[]) => {
    setClients(newClients);
    localStorage.setItem("@agenday:clients", JSON.stringify(newClients));
  };

  const addClient = async (client: Omit<ClientItem, "id">): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = client.email ? client.email.trim().toLowerCase() : "";
    if (!cleanEmail) {
      return { success: false, error: "E-mail é obrigatório." };
    }

    const existsLocally = clients.some(c => c.email && c.email.trim().toLowerCase() === cleanEmail);
    if (existsLocally) {
      return { success: false, error: "Este e-mail já está cadastrado por outro cliente." };
    }

    const newId = Math.random().toString(36).substring(2, 11);
    const newClient = { ...client, email: cleanEmail, id: newId };

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient)
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        return { success: false, error: json.message || "Este e-mail já está cadastrado." };
      }
    } catch (e: any) {
      console.error("Erro ao adicionar cliente via API:", e);
      return { success: false, error: "Erro de conexão ao salvar cliente." };
    }

    const updatedList = [...clients, newClient];
    saveToStorage(updatedList);
    return { success: true };
  };

  const updateClient = async (id: string, updates: Partial<ClientItem>): Promise<{ success: boolean; error?: string }> => {
    const target = clients.find(c => c.id === id);
    if (!target) return { success: false, error: "Cliente não encontrado." };

    const newEmail = updates.email ? updates.email.trim().toLowerCase() : target.email;
    if (newEmail) {
      const existsOther = clients.some(c => c.id !== id && c.email && c.email.trim().toLowerCase() === newEmail);
      if (existsOther) {
        return { success: false, error: "Este e-mail já pertence a outro cliente cadastrado." };
      }
    }

    const updated = { ...target, ...updates, email: newEmail, id } as ClientItem;

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        return { success: false, error: json.message || "Erro ao atualizar cliente na API." };
      }
    } catch (e: any) {
      console.error("Erro ao atualizar cliente via API:", e);
      return { success: false, error: "Erro de conexão ao atualizar cliente." };
    }

    const updatedList = clients.map(c => c.id === id ? updated : c);
    saveToStorage(updatedList);
    return { success: true };
  };

  const deleteClient = async (id: string) => {
    const target = clients.find(c => c.id === id);
    const updatedList = clients.filter(c => c.id !== id);
    saveToStorage(updatedList);

    // Limpar das listas locais de usuários se existir
    try {
      const usersListStr = localStorage.getItem("@agenday:users_list");
      if (usersListStr) {
        let usersList: any[] = JSON.parse(usersListStr);
        usersList = usersList.filter(u => u.id !== id && (target?.email ? u.email.toLowerCase() !== target.email.toLowerCase() : true));
        localStorage.setItem("@agenday:users_list", JSON.stringify(usersList));
      }
      const storedUserStr = localStorage.getItem("@agenday:user");
      if (storedUserStr && target?.email) {
        const storedUser = JSON.parse(storedUserStr);
        if (storedUser.email && storedUser.email.toLowerCase() === target.email.toLowerCase()) {
          localStorage.removeItem("@agenday:user");
        }
      }
    } catch (e) {}

    try {
      const url = `/api/clients?id=${id}${target?.email ? `&email=${encodeURIComponent(target.email)}` : ''}`;
      await fetch(url, { method: "DELETE" });
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
