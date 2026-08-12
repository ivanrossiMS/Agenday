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
  login: (email: string, pass: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  loginWithGoogle: (googleUser: { name: string; email: string; picture?: string; sub?: string }) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => void;
  register: (name: string, email: string, pass: string, birthDate?: string, phone?: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  updateProfile: (data: Partial<User>) => void;
  inactivateProfile: () => void;
  deleteProfile: () => void;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string; devUrl?: string }>;
  resetPasswordWithToken: (token: string, newPassword: string, email?: string) => Promise<{ success: boolean; message: string }>;
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
        if (json.configured && Array.isArray(json.data)) {
          const stored = localStorage.getItem("@agenday:user");
          if (stored) {
            const currentUser: User = JSON.parse(stored);
            if (currentUser.role === "client") {
              const matchedClient = json.data.find(
                (c: any) => c.email && c.email.toLowerCase() === currentUser.email.toLowerCase()
              );
              // Se o cliente foi inativado ou excluído do banco de dados, encerra a sessão
              if (!matchedClient || matchedClient.status === "inactive") {
                setUser(null);
                localStorage.removeItem("@agenday:user");
                return;
              }
              const syncedUser: User = {
                ...currentUser,
                name: matchedClient.name || currentUser.name,
                phone: matchedClient.phone || currentUser.phone,
                birthDate: matchedClient.birth_date || currentUser.birthDate,
                photo: matchedClient.photo_url || currentUser.photo,
                password: matchedClient.password || currentUser.password,
                status: matchedClient.status || "active",
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

  const login = async (email: string, pass: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    const lowerEmail = email.toLowerCase().trim();

    // 1. Tentar autenticação via API (valida a senha no banco de dados PostgreSQL)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lowerEmail, password: pass }),
      });
      const json = await res.json();

      if (res.ok && json.success && json.user) {
        const loggedUser: User = {
          ...json.user,
          password: pass
        };
        setUser(loggedUser);
        localStorage.setItem("@agenday:user", JSON.stringify(loggedUser));

        // Atualizar lista local
        const usersListStr = localStorage.getItem("@agenday:users_list");
        let usersList: User[] = [];
        if (usersListStr) {
          try { usersList = JSON.parse(usersListStr); } catch (e) {}
        }
        usersList = usersList.filter(u => u.email.toLowerCase() !== lowerEmail);
        usersList.push(loggedUser);
        localStorage.setItem("@agenday:users_list", JSON.stringify(usersList));

        return { success: true, user: loggedUser };
      }

      // Se a API respondeu
      if (json.message) {
        if (json.message === "USER_NOT_FOUND") {
          return { success: false, error: "Usuário não encontrado. Por favor, faça seu cadastro no botão 'Cadastre-se aqui'." };
        }
        return { success: false, error: json.message };
      }
    } catch (err) {
      console.error("Erro ao autenticar via API:", err);
    }

    // 2. Login de Admin Fallback (Caso sem conexão)
    if (lowerEmail === "brasilfrancielli@gmail.com") {
      if (pass === "ivanross") {
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
        return { success: true, user: adminUser };
      } else {
        return { success: false, error: "Senha incorreta. Por favor, verifique seus dados ou clique em 'Esqueci minha senha'." };
      }
    }

    // 3. Fallback de busca na lista local do localStorage
    const usersListStr = localStorage.getItem("@agenday:users_list");
    let usersList: User[] = [];
    if (usersListStr) {
      try { usersList = JSON.parse(usersListStr); } catch (e) {}
    }

    let foundUser = usersList.find(u => u.email.toLowerCase() === lowerEmail);

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

    if (foundUser) {
      if (foundUser.status === "inactive") {
        return { success: false, error: "Seu cadastro está inativo. O acesso ao sistema foi bloqueado pela administração." };
      }

      // Se o usuário tem senha gravada, VALIDA se a senha bate!
      if (foundUser.password && foundUser.password.trim() !== "") {
        if (foundUser.password !== pass) {
          return { success: false, error: "Senha incorreta. Por favor, verifique a senha digitada ou clique em 'Esqueci minha senha'." };
        }
      }

      const loggedUser = {
        ...foundUser,
        password: pass
      };
      setUser(loggedUser);
      localStorage.setItem("@agenday:user", JSON.stringify(loggedUser));
      return { success: true, user: loggedUser };
    }

    return { success: false, error: "Usuário não encontrado. Por favor, faça seu cadastro no botão 'Cadastre-se aqui'." };
  };

  const loginWithGoogle = async (googleUser: { name: string; email: string; picture?: string; sub?: string }): Promise<{ success: boolean; user?: User; error?: string }> => {
    const lowerEmail = googleUser.email.toLowerCase().trim();
    let matchedUser: User | null = null;

    try {
      const res = await fetch("/api/clients");
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const found = json.data.find((c: any) => c.email && c.email.toLowerCase() === lowerEmail);
        if (found) {
          if (found.status === "inactive") {
            return { success: false, error: "Seu cadastro está inativo. O acesso ao sistema foi bloqueado pela administração." };
          }
          matchedUser = {
            id: found.id,
            name: found.name || googleUser.name,
            email: lowerEmail,
            role: lowerEmail === "brasilfrancielli@gmail.com" ? "admin" : "client",
            phone: found.phone || "",
            birthDate: found.birth_date || "",
            photo: found.photo_url || googleUser.picture || "",
            status: found.status || "active"
          };
        }
      }
    } catch (err) {
      console.error("Erro ao sincronizar cliente Google via API:", err);
    }

    if (!matchedUser) {
      const role = lowerEmail === "brasilfrancielli@gmail.com" ? "admin" : "client";
      const newId = "client_g_" + (googleUser.sub || Date.now());
      matchedUser = {
        id: newId,
        name: googleUser.name,
        email: lowerEmail,
        role: role,
        photo: googleUser.picture || "",
        status: "active"
      };

      fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newId,
          name: googleUser.name,
          email: lowerEmail,
          photoUrl: googleUser.picture || "",
          status: "active"
        })
      }).catch(err => console.error("Erro ao registrar cliente Google via API:", err));
    }

    setUser(matchedUser);
    localStorage.setItem("@agenday:user", JSON.stringify(matchedUser));

    const usersListStr = localStorage.getItem("@agenday:users_list");
    let usersList: User[] = [];
    if (usersListStr) {
      try { usersList = JSON.parse(usersListStr); } catch (e) {}
    }
    usersList = usersList.filter(u => u.email.toLowerCase() !== lowerEmail);
    usersList.push(matchedUser);
    localStorage.setItem("@agenday:users_list", JSON.stringify(usersList));

    return { success: true, user: matchedUser };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("@agenday:user");
  };

  const register = async (name: string, email: string, pass: string, birthDate?: string, phone?: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Validar via API se o e-mail já existe no banco de dados
    try {
      const res = await fetch("/api/clients");
      const json = await res.json();
      if (json.configured && Array.isArray(json.data)) {
        const existsInDb = json.data.some((c: any) => c.email && c.email.trim().toLowerCase() === cleanEmail);
        if (existsInDb) {
          return { success: false, error: "Este e-mail já está cadastrado. Por favor, faça seu login com a sua senha ou recupere o acesso." };
        }
      }
    } catch (err) {
      console.error("Erro ao verificar duplicidade de e-mail via API:", err);
    }

    // 2. Validar se existe na lista local do navegador
    const usersListStr = localStorage.getItem("@agenday:users_list");
    let usersList: User[] = [];
    if (usersListStr) {
      try { usersList = JSON.parse(usersListStr); } catch (e) {}
    }
    const existsLocally = usersList.some(u => u.email.trim().toLowerCase() === cleanEmail);
    if (existsLocally) {
      return { success: false, error: "Este e-mail já está cadastrado. Por favor, faça seu login com a sua senha ou recupere o acesso." };
    }

    const newId = "client_" + Date.now();
    const newUser: User = { 
      id: newId, 
      name, 
      email: cleanEmail, 
      role: "client", 
      birthDate: birthDate || "", 
      phone: phone || "", 
      password: pass,
      status: "active" 
    };

    // 3. Salvar no banco PostgreSQL via API
    try {
      const apiRes = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newId,
          name,
          email: cleanEmail,
          phone: phone || "",
          birthDate: birthDate || "",
          status: "active",
          password: pass
        })
      });
      const apiJson = await apiRes.json();
      if (!apiRes.ok || apiJson.success === false) {
        return { success: false, error: apiJson.message || "Erro ao registrar o e-mail no sistema." };
      }
    } catch (err) {
      console.error("Erro ao registrar cliente via API:", err);
    }

    // 4. Salvar usuário logado e atualizar a lista local
    setUser(newUser);
    localStorage.setItem("@agenday:user", JSON.stringify(newUser));

    usersList = usersList.filter(u => u.email.toLowerCase() !== cleanEmail);
    usersList.push(newUser);
    localStorage.setItem("@agenday:users_list", JSON.stringify(usersList));

    return { success: true, user: newUser };
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

  const requestPasswordReset = async (email: string) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Erro ao solicitar redefinição de senha:", err);
      return { success: false, message: "Erro de conexão ao enviar solicitação." };
    }
  };

  const resetPasswordWithToken = async (token: string, newPassword: string, email?: string) => {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, email }),
      });
      const data = await res.json();

      if (data.success && data.email) {
        const usersListStr = localStorage.getItem("@agenday:users_list");
        if (usersListStr) {
          try {
            const usersList: User[] = JSON.parse(usersListStr);
            const idx = usersList.findIndex(u => u.email.toLowerCase() === data.email.toLowerCase());
            if (idx >= 0) {
              usersList[idx].password = newPassword;
              localStorage.setItem("@agenday:users_list", JSON.stringify(usersList));
            }
          } catch (e) {}
        }
      }

      return data;
    } catch (err) {
      console.error("Erro ao redefinir senha:", err);
      return { success: false, message: "Erro de conexão ao redefinir a senha." };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      loginWithGoogle,
      logout, 
      register, 
      updateProfile, 
      inactivateProfile, 
      deleteProfile,
      requestPasswordReset,
      resetPasswordWithToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
