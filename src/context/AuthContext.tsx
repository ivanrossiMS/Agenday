"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: "client" | "admin";
  phone?: string;
  birthDate?: string;
  photo?: string;
  password?: string;
  status?: "active" | "inactive";
};

type AuthContextType = {
  user: User | null;
  login: (email: string, pass: string) => Promise<User | null>;
  logout: () => void;
  register: (name: string, email: string, pass: string, birthDate?: string, phone?: string) => User;
  updateProfile: (data: Partial<User>) => void;
  inactivateProfile: () => void;
  deleteProfile: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("@agenday:user");
    if (storedUser) {
      try {
        const parsed: User = JSON.parse(storedUser);
        // Limpar dados legados de teste se existirem
        if (parsed.name === "Cliente VIP") {
          parsed.name = parsed.email ? parsed.email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Cliente";
          parsed.phone = "";
          parsed.birthDate = "";
        }
        setUser(parsed);
      } catch (e) {
        setUser(null);
      }
    }

    // Sincronizar com banco de dados de clientes na inicialização
    async function syncFromDb() {
      try {
        const res = await fetch("/api/clients");
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const stored = localStorage.getItem("@agenday:user");
          if (stored) {
            const currentUser: User = JSON.parse(stored);
            const matchedClient = json.data.find(
              (c: any) => c.email && c.email.toLowerCase() === currentUser.email.toLowerCase()
            );
            if (matchedClient) {
              const syncedUser: User = {
                ...currentUser,
                name: matchedClient.name || currentUser.name,
                phone: matchedClient.phone || currentUser.phone,
                birthDate: matchedClient.birth_date || currentUser.birthDate,
                photo: matchedClient.photo_url || currentUser.photo,
              };
              setUser(syncedUser);
              localStorage.setItem("@agenday:user", JSON.stringify(syncedUser));
            }
          }
        }
      } catch (err) {
        console.error("Erro ao sincronizar perfil do usuário via API:", err);
      }
    }
    syncFromDb();
  }, []);

  const login = async (email: string, pass: string): Promise<User | null> => {
    const lowerEmail = email.toLowerCase().trim();

    // 1. Login do Administrador
    if (lowerEmail === "brasilfrancielli@gmail.com" && pass === "ivanross") {
      const adminUser: User = {
        id: "admin1",
        name: "Francielli",
        email,
        role: "admin",
        phone: "(11) 98888-7777",
        birthDate: "1995-05-15",
        password: pass,
        status: "active"
      };
      setUser(adminUser);
      localStorage.setItem("@agenday:user", JSON.stringify(adminUser));
      return adminUser;
    }

    // 2. Procurar na lista de usuários cadastrados no localStorage
    const usersListStr = localStorage.getItem("@agenday:users_list");
    let usersList: User[] = [];
    if (usersListStr) {
      try { usersList = JSON.parse(usersListStr); } catch (e) {}
    }

    let foundUser = usersList.find(u => u.email.toLowerCase() === lowerEmail);

    // 3. Verificar se é o usuário atualmente armazenado
    if (!foundUser) {
      const storedUserStr = localStorage.getItem("@agenday:user");
      if (storedUserStr) {
        try {
          const storedUser: User = JSON.parse(storedUserStr);
          if (storedUser && storedUser.email.toLowerCase() === lowerEmail && storedUser.name !== "Cliente VIP") {
            foundUser = storedUser;
          }
        } catch (e) {}
      }
    }

    // 4. Buscar no banco de dados PostgreSQL via API
    if (!foundUser) {
      try {
        const res = await fetch("/api/clients");
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const matched = json.data.find((c: any) => c.email && c.email.toLowerCase() === lowerEmail);
          if (matched) {
            foundUser = {
              id: matched.id,
              name: matched.name,
              email: matched.email,
              role: "client",
              phone: matched.phone || "",
              birthDate: matched.birth_date || "",
              photo: matched.photo_url || "",
              status: matched.status || "active",
              password: pass
            };
            // Salvar na lista local para acesso rápido posterior
            usersList.push(foundUser);
            localStorage.setItem("@agenday:users_list", JSON.stringify(usersList));
          }
        }
      } catch (err) {
        console.error("Erro ao consultar cliente no banco de dados durante o login:", err);
      }
    }

    // 5. Se o usuário for encontrado, realiza o login. Caso contrário, retorna NULL sem criar conta!
    if (foundUser) {
      const loggedUser = {
        ...foundUser,
        password: pass || foundUser.password
      };
      setUser(loggedUser);
      localStorage.setItem("@agenday:user", JSON.stringify(loggedUser));
      return loggedUser;
    }

    return null;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("@agenday:user");
  };

  const register = (name: string, email: string, pass: string, birthDate?: string, phone?: string) => {
    const newId = "client_" + Date.now();
    const newUser: User = { 
      id: newId, 
      name, 
      email, 
      role: "client", 
      birthDate: birthDate || "", 
      phone: phone || "", 
      password: pass,
      status: "active" 
    };

    // 1. Atualizar usuário ativo
    setUser(newUser);
    localStorage.setItem("@agenday:user", JSON.stringify(newUser));

    // 2. Salvar na lista de usuários cadastrados
    const usersListStr = localStorage.getItem("@agenday:users_list");
    let usersList: User[] = [];
    if (usersListStr) {
      try { usersList = JSON.parse(usersListStr); } catch (e) {}
    }
    usersList = usersList.filter(u => u.email.toLowerCase() !== email.toLowerCase());
    usersList.push(newUser);
    localStorage.setItem("@agenday:users_list", JSON.stringify(usersList));

    // 3. Salvar no banco PostgreSQL via API
    fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newId,
        name,
        email,
        phone: phone || "",
        birthDate: birthDate || "",
        status: "active"
      })
    }).catch(err => console.error("Erro ao registrar cliente via API:", err));

    return newUser;
  };

  const updateProfile = (data: Partial<User>) => {
    if (!user) return;
    const updated: User = { ...user, ...data };
    setUser(updated);
    localStorage.setItem("@agenday:user", JSON.stringify(updated));

    // Atualizar na lista de usuários cadastrados
    const usersListStr = localStorage.getItem("@agenday:users_list");
    let usersList: User[] = [];
    if (usersListStr) {
      try { usersList = JSON.parse(usersListStr); } catch (e) {}
    }
    const idx = usersList.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      usersList[idx] = updated;
    } else {
      usersList.push(updated);
    }
    localStorage.setItem("@agenday:users_list", JSON.stringify(usersList));

    // Atualizar na API de clientes
    if (user.role === "client") {
      fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          name: updated.name,
          email: updated.email,
          phone: updated.phone || "",
          birthDate: updated.birthDate || "",
          photoUrl: updated.photo || "",
          status: updated.status || "active"
        })
      }).catch(err => console.error("Erro ao atualizar perfil via API:", err));
    }
  };

  const inactivateProfile = () => {
    if (!user) return;
    const newStatus = user.status === "inactive" ? "active" : "inactive";
    updateProfile({ status: newStatus });
  };

  const deleteProfile = () => {
    if (!user) return;
    if (user.role === "client") {
      fetch(`/api/clients?id=${user.id}`, { method: "DELETE" }).catch(() => {});
    }
    logout();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, updateProfile, inactivateProfile, deleteProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
