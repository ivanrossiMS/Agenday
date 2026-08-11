"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, Sparkles } from "lucide-react";
import styles from "../../agendar/page.module.css"; // Reuse form styles

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const { login, user } = useAuth();
  const router = useRouter();

  // If already logged in as admin, redirect
  if (user?.role === "admin") {
    router.push("/admin");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const result = await login(email, password);
    if (!result.success || !result.user || result.user.role !== "admin") {
      setErrorMsg(result.error || "E-mail ou senha incorretos para o painel administrativo.");
      return;
    }
    router.push("/admin");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background)" }}>
      <div style={{ background: "var(--color-surface)", padding: "40px", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)", width: "100%", maxWidth: "400px", border: "1px solid var(--color-border)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px", color: "var(--color-primary-dark)" }}>
          <Sparkles size={32} />
        </div>
        <h1 style={{ textAlign: "center", marginBottom: "32px", fontSize: "1.5rem" }}>Acesso Restrito</h1>
        
        {errorMsg && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 14px", borderRadius: "10px", marginBottom: "20px", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={18} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className={styles.formGroup}>
            <label>E-mail</label>
            <input 
              type="email" 
              placeholder="admin@agenday.com" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className={styles.formGroup}>
            <label>Senha</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Acessar Painel
          </button>
        </form>
      </div>
    </div>
  );
}
