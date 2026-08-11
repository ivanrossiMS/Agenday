"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Lock, User as UserIcon, CalendarDays, MessageSquare, AlertCircle, Sparkles, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import styles from "./page.module.css";

type ViewMode = "login" | "register" | "forgot";

export default function LoginPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [devUrl, setDevUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, register, requestPasswordReset } = useAuth();
  const { settings } = useSiteSettings();
  const router = useRouter();

  const heroImgUrl = settings.loginHeroImage || "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=1200&auto=format&fit=crop";
  const quoteText = settings.loginQuote || "A beleza começa no momento em que você decide ser você mesma.";
  const quoteAuthorText = settings.loginQuoteAuthor ? (settings.loginQuoteAuthor.startsWith("—") ? settings.loginQuoteAuthor : `— ${settings.loginQuoteAuthor}`) : "— Coco Chanel";

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
    setSuccessMsg("");
    setDevUrl("");

    if (viewMode === "forgot") {
      setIsSubmitting(true);
      try {
        const result = await requestPasswordReset(email);
        if (result.success) {
          setSuccessMsg(result.message);
          if (result.devUrl) setDevUrl(result.devUrl);
        } else {
          setErrorMsg(result.message || "Erro ao solicitar a redefinição de senha.");
        }
      } catch (err) {
        setErrorMsg("Erro inesperado. Tente novamente.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (viewMode === "login") {
      setIsSubmitting(true);
      try {
        const result = await login(email, password);
        if (!result.success || !result.user) {
          setErrorMsg(result.error || "E-mail ou senha incorretos. Por favor, tente novamente.");
          setIsSubmitting(false);
          return;
        }
        if (result.user.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        setErrorMsg("Erro ao realizar login. Tente novamente.");
        setIsSubmitting(false);
      }
    } else {
      const loggedUser = register(name, email, password, birthDate, phone);
      if (loggedUser.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
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
          src={heroImgUrl} 
          alt="Spa and Beauty" 
          className={styles.image} 
        />
        <div className={styles.quoteWrapper}>
          <div className={styles.quote}>
            "{quoteText.replace(/^["“]|["”]$/g, '')}"
          </div>
          <div className={styles.quoteAuthor}>{quoteAuthorText}</div>
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

          <h1 className={styles.title}>
            {viewMode === "login" && "Bem-vinda de volta"}
            {viewMode === "register" && "Crie sua conta"}
            {viewMode === "forgot" && "Esqueci minha senha"}
          </h1>
          <p className={styles.subtitle}>
            {viewMode === "login" && "Entre para gerenciar seus agendamentos e ver seus pontos de fidelidade."}
            {viewMode === "register" && "Cadastre-se para acessar nossos serviços premium e programa de fidelidade."}
            {viewMode === "forgot" && "Digite o seu e-mail cadastrado abaixo para receber o link de redefinição de senha."}
          </p>

          {errorMsg && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: "12px", marginBottom: "20px", fontSize: "0.88rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px" }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className={styles.successBox}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <CheckCircle2 size={22} style={{ color: "#166534", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "4px" }}>Link Enviado!</div>
                  <div>{successMsg}</div>
                  
                  {devUrl && (
                    <div className={styles.devBanner}>
                      ⚙️ <strong>Modo de Teste Local:</strong><br />
                      Você pode testar clicando diretamente no link abaixo:<br />
                      <a href={devUrl} style={{ color: "#b8574c", fontWeight: 700, textDecoration: "underline" }}>
                        {devUrl}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewMode === "forgot" && successMsg ? (
            <button 
              type="button" 
              className={styles.submitBtn}
              onClick={() => { setViewMode("login"); setErrorMsg(""); setSuccessMsg(""); }}
            >
              Voltar para o Login
            </button>
          ) : (
            <form onSubmit={handleSubmit}>
              {viewMode === "register" && (
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

              {viewMode === "register" && (
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
              
              {viewMode === "register" && (
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

              {viewMode !== "forgot" && (
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

                  {viewMode === "login" && (
                    <div className={styles.forgotPasswordRow}>
                      <button 
                        type="button" 
                        className={styles.forgotPasswordLink}
                        onClick={() => { setViewMode("forgot"); setErrorMsg(""); setSuccessMsg(""); }}
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                    Processando...
                  </span>
                ) : (
                  <>
                    {viewMode === "login" && "Acessar Conta"}
                    {viewMode === "register" && "Criar Minha Conta"}
                    {viewMode === "forgot" && "Enviar Link de Redefinição"}
                  </>
                )}
              </button>
            </form>
          )}

          <div className={styles.toggleAuth}>
            {viewMode === "forgot" ? (
              <span>
                Lembrou a senha?{" "}
                <button onClick={() => { setViewMode("login"); setErrorMsg(""); setSuccessMsg(""); }} type="button">
                  Faça login
                </button>
              </span>
            ) : viewMode === "login" ? (
              <span>
                Ainda não tem conta?{" "}
                <button onClick={() => { setViewMode("register"); setErrorMsg(""); setSuccessMsg(""); }} type="button">
                  Cadastre-se aqui
                </button>
              </span>
            ) : (
              <span>
                Já é nossa cliente?{" "}
                <button onClick={() => { setViewMode("login"); setErrorMsg(""); setSuccessMsg(""); }} type="button">
                  Faça login
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
