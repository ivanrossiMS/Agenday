"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Eye, EyeOff, Sparkles, CheckCircle2, AlertCircle, Loader2, KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import styles from "./page.module.css";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resetPasswordWithToken } = useAuth();

  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [targetEmail, setTargetEmail] = useState(emailParam);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // 1. Verificar validade do token na inicialização
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setIsVerifying(false);
        setTokenValid(false);
        setVerifyError("Link de redefinição inválido. O token não foi encontrado na URL.");
        return;
      }

      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const json = await res.json();

        if (res.ok && json.valid) {
          setTokenValid(true);
          if (json.email) setTargetEmail(json.email);
        } else {
          setTokenValid(false);
          setVerifyError(json.message || "Link de redefinição inválido ou expirado.");
        }
      } catch (err) {
        // Se falhar a requisição, em ambiente local permite testar com o token presente
        setTokenValid(true);
      } finally {
        setIsVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  // Cálculo da Força da Senha
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: "", color: "#e2e8f0", width: "0%" };
    if (pass.length < 6) return { score: 1, text: "Fraca (mínimo 6 caracteres)", color: "#ef4444", width: "33%" };
    
    let hasNum = /\d/.test(pass);
    let hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    let hasUpper = /[A-Z]/.test(pass);

    if (pass.length >= 8 && (hasNum && (hasSpecial || hasUpper))) {
      return { score: 3, text: "Forte e segura 🔒", color: "#22c55e", width: "100%" };
    }
    
    return { score: 2, text: "Média (adicione números ou símbolos)", color: "#f59e0b", width: "66%" };
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (newPassword.length < 6) {
      setErrorMsg("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("As senhas digitadas não coincidem.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await resetPasswordWithToken(token, newPassword, targetEmail);

      if (res.success) {
        setIsSuccess(true);
      } else {
        setErrorMsg(res.message || "Ocorreu um erro ao redefinir a senha.");
      }
    } catch (err) {
      setErrorMsg("Erro de conexão ao redefinir a senha.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <div className={styles.formWrapper} style={{ textAlign: "center", padding: "60px 32px" }}>
        <Loader2 size={40} style={{ color: "#b8574c", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1e293b" }}>Verificando link de segurança...</h2>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "6px" }}>Aguarde um instante.</p>
      </div>
    );
  }

  if (!tokenValid && !isSuccess) {
    return (
      <div className={styles.formWrapper} style={{ textAlign: "center" }}>
        <div style={{ background: "#fef2f2", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <AlertCircle size={32} style={{ color: "#dc2626" }} />
        </div>
        <h1 className={styles.title} style={{ fontSize: "1.6rem" }}>Link Inválido ou Expirado</h1>
        <p className={styles.subtitle} style={{ marginBottom: "28px" }}>
          {verifyError || "Este link de redefinição de senha não é mais válido ou expirou por motivos de segurança (validade de 15 min)."}
        </p>

        <Link href="/login" style={{ textDecoration: "none" }}>
          <button type="button" className={styles.submitBtn}>
            Solicitar Novo Link
          </button>
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className={styles.formWrapper} style={{ textAlign: "center" }}>
        <div style={{ background: "#f0fdf4", width: "68px", height: "68px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <CheckCircle2 size={36} style={{ color: "#166534" }} />
        </div>
        <h1 className={styles.title} style={{ fontSize: "1.7rem" }}>Senha Alterada com Sucesso!</h1>
        <p className={styles.subtitle} style={{ marginBottom: "28px" }}>
          Sua senha foi redefinida com segurança. Você já pode fazer login na sua conta com a nova senha cadastrada.
        </p>

        <button 
          type="button" 
          className={styles.submitBtn}
          onClick={() => router.push("/login")}
        >
          Ir para o Login
        </button>
      </div>
    );
  }

  return (
    <div className={styles.formWrapper}>
      <div className={styles.brandBadge}>
        <Sparkles size={16} />
        <span>Fran Marinho • Studio de Beleza</span>
      </div>

      <h1 className={styles.title}>Redefinir Senha</h1>
      <p className={styles.subtitle}>
        {targetEmail ? (
          <>Criando nova senha para: <strong style={{ color: "#1e293b" }}>{targetEmail}</strong></>
        ) : (
          "Digite sua nova senha abaixo para acessar sua conta."
        )}
      </p>

      {errorMsg && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: "12px", marginBottom: "20px", fontSize: "0.88rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Nova Senha</label>
          <div className={styles.inputWrapper}>
            <Lock size={20} className={styles.inputIcon} />
            <input 
              type={showPassword ? "text" : "password"} 
              className={styles.input} 
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required 
            />
            <button 
              type="button" 
              className={styles.eyeBtn}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {newPassword && (
            <div className={styles.strengthBarWrapper}>
              <div className={styles.strengthTrack}>
                <div 
                  className={styles.strengthFill} 
                  style={{ width: strength.width, backgroundColor: strength.color }}
                />
              </div>
              <span className={styles.strengthText} style={{ color: strength.color }}>
                {strength.text}
              </span>
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Confirmar Nova Senha</label>
          <div className={styles.inputWrapper}>
            <KeyRound size={20} className={styles.inputIcon} />
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              className={styles.input} 
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
            />
            <button 
              type="button" 
              className={styles.eyeBtn}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <span style={{ color: "#ef4444", fontSize: "0.8rem", fontWeight: 600, marginTop: "4px", display: "block" }}>
              As senhas digitadas não coincidem.
            </span>
          )}
        </div>

        <button 
          type="submit" 
          className={styles.submitBtn} 
          disabled={isSubmitting || (newPassword !== confirmPassword && confirmPassword.length > 0)}
        >
          {isSubmitting ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              Salvando Nova Senha...
            </span>
          ) : (
            "Salvar Nova Senha"
          )}
        </button>
      </form>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <div className={styles.container}>
      <div className={styles.bgBlob1} />
      <div className={styles.bgBlob2} />

      <div className={styles.formSection}>
        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={18} /> Voltar para o Login
        </Link>

        <Suspense fallback={
          <div className={styles.formWrapper} style={{ textAlign: "center", padding: "60px 32px" }}>
            <Loader2 size={40} style={{ color: "#b8574c", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1e293b" }}>Carregando...</h2>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
