"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { createPortal } from "react-dom";

import { User as UserIcon, Mail, Lock, Calendar, Camera, X, AlertCircle, Check, Eye, EyeOff, MessageSquare, Power, Trash2, ShieldAlert } from "lucide-react";
import styles from "./EditProfileModal.module.css";
import { compressImage } from "@/lib/imageUtils";

type UserData = {
  name?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  photo?: string;
  password?: string;
  status?: "active" | "inactive";
  role?: "client" | "admin";
};


type EditProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: UserData | null;
  onSave: (data: {
    name: string;
    email: string;
    phone: string;
    birthDate: string;
    password?: string;
    photo?: string;
  }) => void;
  onInactivate?: () => void;
  onDelete?: () => void;
};

export default function EditProfileModal({ isOpen, onClose, user, onSave, onInactivate, onDelete }: EditProfileModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setBirthDate(user.birthDate || "");
      setPassword(user.password || "");
      setPhoto(user.photo || "");
      setErrorMessage("");
      setAttemptedSubmit(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user || !mounted) return null;

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const compressed = await compressImage(e.target.files[0], 400, 400, 0.85);
      setPhoto(compressed);
    }
  };


  const getInitials = (str: string) => {
    if (!str) return "U";
    const parts = str.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return str.substring(0, 2).toUpperCase();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    // Todos os dados são obrigatórios
    if (!name.trim() || !email.trim() || !phone.trim() || !birthDate.trim() || !password.trim()) {
      setErrorMessage("Todos os dados são obrigatórios! Por favor, preencha todos os campos.");
      return;
    }

    setErrorMessage("");
    onSave({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      birthDate: birthDate.trim(),
      password: password.trim(),
      photo,
    });
    onClose();
  };

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

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.accentBar}></div>

        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h2 className={styles.title}>
              <UserIcon size={22} style={{ color: "var(--color-primary, #c16355)" }} />
              Editar Perfil
            </h2>
            <p className={styles.subtitle}>Atualize suas informações pessoais e de acesso</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar modal">
            <X size={20} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {errorMessage && (
            <div className={styles.alertBox}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Avatar Section */}
          <div className={styles.avatarSection}>
            <div className={styles.avatarWrapper}>
              <div className={styles.avatarRing}>
                {photo ? (
                  <img src={photo} alt="Foto de Perfil" className={styles.avatarImage} />
                ) : (
                  <div className={styles.avatarFallback}>{getInitials(name)}</div>
                )}
              </div>
              <label className={styles.cameraButton} title="Alterar Foto">
                <Camera size={16} />
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
              </label>
            </div>
            <span className={styles.avatarHint}>Clique na câmera para alterar a foto</span>
          </div>

          {/* Nome Completo */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              Nome Completo <span className={styles.requiredTag}>* obrigatório</span>
            </label>
            <div className={styles.inputWrapper}>
              <UserIcon size={18} className={styles.inputIcon} />
              <input
                type="text"
                className={`${styles.inputField} ${attemptedSubmit && !name.trim() ? styles.inputError : ""}`}
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* E-mail e Tel WhatsApp */}
          <div className={styles.rowGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                E-mail <span className={styles.requiredTag}>* obrigatório</span>
              </label>
              <div className={styles.inputWrapper}>
                <Mail size={18} className={styles.inputIcon} />
                <input
                  type="email"
                  className={`${styles.inputField} ${attemptedSubmit && !email.trim() ? styles.inputError : ""}`}
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Tel. WhatsApp <span className={styles.requiredTag}>* obrigatório</span>
              </label>
              <div className={styles.inputWrapper}>
                <MessageSquare size={18} className={styles.inputIcon} />
                <input
                  type="text"
                  className={`${styles.inputField} ${attemptedSubmit && !phone.trim() ? styles.inputError : ""}`}
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  required
                />
              </div>
            </div>
          </div>

          {/* Data de Nascimento e Nova Senha */}
          <div className={styles.rowGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Data de Nascimento <span className={styles.requiredTag}>* obrigatório</span>
              </label>
              <div className={styles.inputWrapper}>
                <Calendar size={18} className={styles.inputIcon} />
                <input
                  type="date"
                  className={`${styles.inputField} ${attemptedSubmit && !birthDate.trim() ? styles.inputError : ""}`}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Nova Senha <span className={styles.requiredTag}>* obrigatório</span>
              </label>
              <div className={styles.inputWrapper}>
                <Lock size={18} className={styles.inputIcon} />
                <input
                  type={showPassword ? "text" : "password"}
                  className={`${styles.inputField} ${attemptedSubmit && !password.trim() ? styles.inputError : ""}`}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.togglePasswordBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Ocultar senha" : "Exibir senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Gerenciamento de Status e Exclusão do Perfil (Apenas Visão Admin) */}
          {user?.role === "admin" && (onInactivate || onDelete) && (

            <div style={{ marginTop: "12px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <ShieldAlert size={15} color="#e11d48" /> Gerenciamento do Perfil
              </div>
              
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {onInactivate && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Deseja realmente ${user?.status === 'inactive' ? 'reativar' : 'inativar'} seu perfil?`)) {
                        onInactivate();
                      }
                    }}
                    style={{
                      flex: 1,
                      minWidth: "140px",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      border: "1px solid #cbd5e1",
                      background: user?.status === 'inactive' ? '#f0fdf4' : '#f8fafc',
                      color: user?.status === 'inactive' ? '#166534' : '#475569',
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.2s"
                    }}
                  >
                    <Power size={15} />
                    {user?.status === 'inactive' ? 'Reativar Perfil' : 'Inativar Perfil'}
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Deseja realmente EXCLUIR permanentemente seu perfil? Esta ação apagará seus dados e não poderá ser desfeita.")) {
                        onDelete();
                      }
                    }}
                    style={{
                      flex: 1,
                      minWidth: "140px",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#dc2626",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.2s"
                    }}
                  >
                    <Trash2 size={15} />
                    Excluir Perfil
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.saveBtn}>
              <Check size={18} />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
