"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type User = {
  id: string;
  name: string;
  email: string;
  role: "client" | "admin";
  phone?: string;
  birthDate?: string;
  photo?: string;
  password?: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, pass: string) => User;
  logout: () => void;
  register: (name: string, email: string, pass: string, birthDate?: string, phone?: string) => User;
  updateProfile: (data: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("@agenday:user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser(null);
      }
    }
  }, []);

  const login = (email: string, pass: string) => {
    let loggedUser: User;
    if (email === "brasilfrancielli@gmail.com" && pass === "ivanross") {
      loggedUser = {
        id: "admin1",
        name: "Francielli",
        email,
        role: "admin",
        phone: "(11) 98888-7777",
        birthDate: "1995-05-15",
        password: pass
      };
    } else {
      loggedUser = {
        id: "client_" + Date.now(),
        name: "Cliente VIP",
        email,
        role: "client",
        phone: "(11) 99999-8888",
        birthDate: "1998-10-20",
        password: pass
      };
    }
    setUser(loggedUser);
    localStorage.setItem("@agenday:user", JSON.stringify(loggedUser));
    return loggedUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("@agenday:user");
  };

  const register = (name: string, email: string, pass: string, birthDate?: string, phone?: string) => {
    const newId = "client_" + Date.now();
    const newUser: User = { id: newId, name, email, role: "client", birthDate, phone };
    setUser(newUser);
    localStorage.setItem("@agenday:user", JSON.stringify(newUser));

    if (isSupabaseConfigured() && supabase) {
      supabase.from("clients").insert({
        id: newId,
        name,
        email,
        phone: phone || "",
        birth_date: birthDate || ""
      }).then(({ error }) => {
        if (error) console.error("Erro ao registrar cliente no Supabase:", error);
      });
    }

    return newUser;
  };

  const updateProfile = (data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem("@agenday:user", JSON.stringify(updated));

    if (isSupabaseConfigured() && supabase && user.role === "client") {
      supabase.from("clients").update({
        name: updated.name,
        phone: updated.phone || "",
        birth_date: updated.birthDate || "",
        photo_url: updated.photo || ""
      }).eq("email", updated.email).then(({ error }) => {
        if (error) console.error("Erro ao atualizar perfil no Supabase:", error);
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
