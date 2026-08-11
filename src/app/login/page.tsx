"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Lock, User as UserIcon, CalendarDays, MessageSquare, AlertCircle, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import styles from "./page.module.css";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const { login, register } = useAuth();
  const router = useRouter();

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 11) {
      let formatted = digits;
      if (digits.length > 2) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      if (digits.length > 7) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
      return formatted;
    }
    return val;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    let loggedUser;
    
    if (isLogin) {
      loggedUser = await login(email, password);
      if (!loggedUser) {
        setErrorMsg("Usuário não encontrado. Por favor, faça seu cadastro no botão 'Cadastre-se aqui' abaixo.");
        return;
      }
    } else {
      loggedUser = register(name, email, password, birthDate, phone);
    }
    
    if (loggedUser.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  };


  return (
    <div className={styles.container}>
      {/* Ambient Blobs */}
      <div className={styles.bgBlob1} />
      <div className={styles.bgBlob2} />

      {/* Left side: Premium Image */}
      <div className={styles.imageSection}>
        <div className={styles.imageOverlay} />
        <img 
          src="https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=1200&auto=format&fit=crop" 
          alt="Spa and Beauty" 
          className={styles.image} 
        />
        <div className={styles.quoteWrapper}>
          <div className={styles.quote}>
            "A beleza começa no momento em que você decide ser você mesma."
          </div>
          <div className={styles.quoteAuthor}>— Coco Chanel</div>
        </div>
      </div>

      {/* Right side: Form */}
      <div className={styles.formSection}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={18} /> Voltar para o início
        </Link>
        
        <div className={styles.formWrapper}>
          <div className={styles.brandBadge}>
            <Sparkles size={16} className={styles.brandBadgeIcon} />
            <span>Fran Marinho • Studio de Beleza</span>
          </div>

          <h1 className={styles.title}>{isLogin ? "Bem-vinda de volta" : "Crie sua conta"}</h1>
          <p className={styles.subtitle}>
            {isLogin 
              ? "Entre para gerenciar seus agendamentos e ver seus pontos de fidelidade." 
              : "Cadastre-se para acessar nossos serviços premium e programa de fidelidade."}
          </p>


          {errorMsg && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: "12px", marginBottom: "20px", fontSize: "0.88rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px" }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {!isLogin && (
              <div className={styles.formGroup}>
                <label>Nome Completo</label>
                <div className={styles.inputWrapper}>
                  <UserIcon size={20} className={styles.inputIcon} />
                  <input 
                    type="text" 
                    className={styles.input} 
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                  />
                </div>
              </div>
            )}

            {!isLogin && (
              <div className={styles.formGroup}>
                <label>Tel. WhatsApp</label>
                <div className={styles.inputWrapper}>
                  <MessageSquare size={20} className={styles.inputIcon} />
                  <input 
                    type="tel" 
                    className={styles.input} 
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    required 
                  />
                </div>
              </div>
            )}
            
            {!isLogin && (
              <div className={styles.formGroup}>
                <label>Data de Nascimento</label>
                <div className={styles.inputWrapper}>
                  <CalendarDays size={20} className={styles.inputIcon} />
                  <input 
                    type="date" 
                    className={styles.input} 
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required 
                  />
                </div>
              </div>
            )}
            
            <div className={styles.formGroup}>
              <label>E-mail</label>
              <div className={styles.inputWrapper}>
                <Mail size={20} className={styles.inputIcon} />
                <input 
                  type="email" 
                  className={styles.input} 
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Senha</label>
              <div className={styles.inputWrapper}>
                <Lock size={20} className={styles.inputIcon} />
                <input 
                  type="password" 
                  className={styles.input} 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>

            <button type="submit" className={styles.submitBtn}>
              {isLogin ? "Acessar Conta" : "Criar Minha Conta"}
            </button>
          </form>

          <div className={styles.toggleAuth}>
            {isLogin ? "Ainda não tem conta?" : "Já é nossa cliente?"}{" "}
            <button onClick={() => { setIsLogin(!isLogin); setErrorMsg(""); }} type="button">
              {isLogin ? "Cadastre-se aqui" : "Faça login"}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
