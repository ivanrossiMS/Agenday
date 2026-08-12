"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useAuth } from "@/context/AuthContext";
import { useServices, ServiceItem } from "@/context/ServicesContext";
import { useSiteSettings, SiteSettings } from "@/context/SiteSettingsContext";
import { 
  CalendarDays, Users, Gift, MessageCircle, MessageSquare, Ban, 

  CheckCircle2, DollarSign, FileText, QrCode, Plus, Trash2, Edit3, Image as ImageIcon, Layout, X,
  TrendingUp, PieChart, CreditCard, Filter, Sparkles, ChevronDown, Grid, Palette, Cake, LogOut, UserCircle, Camera, Search, User,
  Star, RefreshCw, Clock, Send, Eye, Settings, UploadCloud, Lock, Unlock, XCircle, Bell, Power, UserX, UserCheck, Mail, Phone, AlertCircle
} from "lucide-react";
import styles from "./page.module.css";
import { useAppointments, Appointment } from "@/context/AppointmentsContext";
import { useClients, ClientItem } from "@/context/ClientsContext";
import Calendar from "@/components/Calendar";
import { useLoyalty } from "@/context/LoyaltyContext";
import EditProfileModal from "@/components/EditProfileModal";
import { compressImage } from "@/lib/imageUtils";


const timeToMins = (t: string) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const minsToTime = (m: number) => {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}`;
};

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const getFirstName = (name: string) => name ? name.split(" ")[0] : "";

export default function AdminDashboard() {
  const { user, logout, updateProfile, inactivateProfile, deleteProfile } = useAuth();
  const { services, addService, updateService, deleteService } = useServices();
  const { settings, updateSettings } = useSiteSettings();
  const { appointments, updateStatus, updatePayment, updateAppointment, deleteAppointment, addAppointment, closedDates, toggleDateClosed, blockedTimeSlots, toggleTimeSlot, blockTimeSlots } = useAppointments();
  const { clients, updateClient, deleteClient, addClient } = useClients();
  const { settings: loyaltySettings, updateSettings: updateLoyaltySettings, claims: loyaltyClaims, getAllStats, getUserStats, claimPrize } = useLoyalty();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"dashboard" | "services" | "appearance" | "finance" | "loyalty" | "users" | "birthdays">("dashboard");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [agendaFilter, setAgendaFilter] = useState<"all" | "confirmed" | "pending">("all");
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("12:00");
  const [confirmPaymentAppt, setConfirmPaymentAppt] = useState<Appointment | null>(null);
  const [selectedDetailAppt, setSelectedDetailAppt] = useState<Appointment | null>(null);
  
  // Profile State
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [clientForm, setClientForm] = useState<Partial<ClientItem>>({});
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    password: "",
    address: "",
    birthDate: "",
    photo: ""
  });
  
  // Service Form State
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  
  const [srvName, setSrvName] = useState("");
  const [srvDesc, setSrvDesc] = useState("");
  const [srvPrice, setSrvPrice] = useState("");
  const [srvDuration, setSrvDuration] = useState("");
  const [srvImage, setSrvImage] = useState("");
  const [srvProfName, setSrvProfName] = useState("");
  const [srvProfPhoto, setSrvProfPhoto] = useState("");

  // Site Settings Form State
  const [siteForm, setSiteForm] = useState<SiteSettings>({
    heroTitle: "",
    heroSubtitle: "",
    heroImage: "",
    aboutTitle: "",
    aboutText: "",
    aboutImage: "",
    businessStart: "09:00",
    businessEnd: "18:00",
    workDays: [1, 2, 3, 4, 5, 6],
    whatsappNumber: "",

    salonAddress: "",
    mapsLink: "",
    preparationSteps: [],
    logoUrl: "",
  });

  const [birthdayFilter, setBirthdayFilter] = useState<"month" | "day" | "all">("month");
  const [bdaySelectedMonth, setBdaySelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [bdaySearch, setBdaySearch] = useState<string>("");

  // Financial Filters & Pagination State
  const [finDateFilter, setFinDateFilter] = useState<"all" | "today" | "yesterday" | "last_7_days" | "last_30_days" | "this_month" | "last_month" | "this_year">("all");
  const [finStatusFilter, setFinStatusFilter] = useState<"all" | "paid" | "pending" | "paid_pix" | "paid_credit" | "paid_debit" | "open">("all");
  const [finClientFilter, setFinClientFilter] = useState<string>("all");
  const [visibleFinancesCount, setVisibleFinancesCount] = useState<number>(10);
  const [isLoadingMoreFinances, setIsLoadingMoreFinances] = useState<boolean>(false);

  // Mercado Pago & Finance Subtabs State
  const [finSubTab, setFinSubTab] = useState<"transactions" | "mp_config" | "mp_guide">("transactions");
  const [mpAccessToken, setMpAccessToken] = useState("");
  const [mpPublicKey, setMpPublicKey] = useState("");
  const [mpSandbox, setMpSandbox] = useState(true);
  const [mpAutoConfirm, setMpAutoConfirm] = useState(true);
  const [mpIsConfigured, setMpIsConfigured] = useState(false);
  const [mpSaveLoading, setMpSaveLoading] = useState(false);
  const [mpSaveMsg, setMpSaveMsg] = useState("");
  const [mpActionId, setMpActionId] = useState<number | null>(null);

  // Load MP settings on mount
  useEffect(() => {
    fetch("/api/mercadopago/settings")
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.accessToken) setMpAccessToken(data.accessToken);
          if (data.publicKey) setMpPublicKey(data.publicKey);
          if (typeof data.sandbox === "boolean") setMpSandbox(data.sandbox);
          if (typeof data.autoConfirm === "boolean") setMpAutoConfirm(data.autoConfirm);
          setMpIsConfigured(data.isConfigured || false);
        }
      })
      .catch(err => console.error("Error fetching MP settings:", err));
  }, []);

  const handleSaveMpSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMpSaveLoading(true);
    setMpSaveMsg("");
    try {
      const res = await fetch("/api/mercadopago/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: mpAccessToken,
          publicKey: mpPublicKey,
          sandbox: mpSandbox,
          autoConfirm: mpAutoConfirm
        })
      });
      const data = await res.json();
      setMpSaveLoading(false);
      if (res.ok && data.success) {
        setMpSaveMsg("✅ Configurações do Mercado Pago salvas com sucesso!");
        setMpIsConfigured(Boolean(mpAccessToken && mpAccessToken.length > 10));
      } else {
        setMpSaveMsg(`❌ ${data.error || "Erro ao salvar"}`);
      }
    } catch (err: any) {
      setMpSaveLoading(false);
      setMpSaveMsg("❌ Erro ao conectar com o servidor.");
    }
  };

  // Notice & Confirmation Modal State (replaces browser alerts & confirm popups)
  const [noticeModal, setNoticeModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    type?: "success" | "error" | "info";
  } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "primary";
    onConfirm: () => void;
  } | null>(null);

  const handleSyncMpStatus = async (apptId: number, mpPaymentId?: string) => {
    setMpActionId(apptId);
    try {
      const res = await fetch(`/api/mercadopago/status?appointment_id=${apptId}&payment_id=${mpPaymentId || ''}`);
      const data = await res.json();
      setMpActionId(null);
      if (data.status) {
        updatePayment(apptId, data.status as any);
        if (data.isPaid) {
          updateStatus(apptId, 'confirmed');
        }

        let statusTitle = "Status Verificado";
        let statusMsg = "O status do pagamento foi consultado no Mercado Pago.";
        let modalType: "success" | "info" | "error" = "info";

        if (data.status === "paid_pix") {
          statusTitle = "Pagamento Confirmado!";
          statusMsg = "O pagamento via Pix foi recebido e aprovado pelo Mercado Pago. O agendamento está confirmado!";
          modalType = "success";
        } else if (data.status === "paid_credit" || data.status === "paid_card") {
          statusTitle = "Pagamento Confirmado!";
          statusMsg = "O pagamento via Cartão de Crédito foi aprovado com sucesso. O agendamento está confirmado!";
          modalType = "success";
        } else if (data.status === "refunded") {
          statusTitle = "Pagamento Estornado";
          statusMsg = "Este pagamento foi reembolsado ao cliente no Mercado Pago.";
          modalType = "info";
        } else {
          statusTitle = "Pagamento em Aberto";
          statusMsg = "O pagamento ainda está aguardando confirmação do cliente ou do banco.";
          modalType = "info";
        }

        setNoticeModal({ open: true, title: statusTitle, message: statusMsg, type: modalType });
      }
    } catch (err) {
      setMpActionId(null);
      setNoticeModal({ open: true, title: "Falha na Consulta", message: "Não foi possível conectar com o Mercado Pago no momento.", type: "error" });
    }
  };

  const handleRefundMp = async (apptId: number, mpPaymentId?: string) => {
    setConfirmModal({
      open: true,
      title: "Estornar Pagamento",
      message: "Tem certeza que deseja estornar e reembolsar este pagamento no Mercado Pago? O valor retornará ao cliente.",
      confirmText: "Sim, Estornar",
      variant: "danger",
      onConfirm: async () => {
        setMpActionId(apptId);
        try {
          const res = await fetch("/api/mercadopago/refund", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appointmentId: apptId, paymentId: mpPaymentId })
          });
          const data = await res.json();
          setMpActionId(null);
          if (res.ok && data.success) {
            updatePayment(apptId, 'refunded' as any);
            updateStatus(apptId, 'canceled');
            setNoticeModal({ open: true, title: "Estorno Realizado!", message: "O valor do agendamento foi estornado com sucesso pelo Mercado Pago.", type: "success" });
          } else {
            setNoticeModal({ open: true, title: "Falha no Estorno", message: data.error || "Não foi possível estornar esta cobrança.", type: "error" });
          }
        } catch (err: any) {
          setMpActionId(null);
          setNoticeModal({ open: true, title: "Erro de Conexão", message: "Falha ao conectar com o serviço de estorno.", type: "error" });
        }
      }
    });
  };

  const handleConfirmAndSendWhatsApp = (appt: any) => {
    if (!appt) return;

    const newStatus = appt.status === 'confirmed' ? 'pending' : 'confirmed';
    updateStatus(appt.id, newStatus);

    if (selectedDetailAppt && selectedDetailAppt.id === appt.id) {
      setSelectedDetailAppt(prev => prev ? { ...prev, status: newStatus } : null);
    }

    if (newStatus === 'confirmed') {
      const clientObj = clients.find(c => (c.email && appt.clientEmail && c.email.toLowerCase() === appt.clientEmail.toLowerCase()) || c.name === appt.clientName);
      const rawPhone = clientObj?.phone || (appt as any).clientPhone || (appt as any).phone || "";
      const cleanPhone = rawPhone.replace(/\D/g, "");

      let paymentText = "Pagar no Salão";
      if (appt.paymentStatus === "paid_pix") {
        paymentText = "Pago via Pix";
      } else if (appt.paymentStatus === "paid_credit") {
        paymentText = "Pago no Cartão de Crédito";
      } else if (appt.paymentStatus?.includes("paid")) {
        paymentText = "Pago Online";
      }

      const clientName = appt.clientName || clientObj?.name || "Cliente";
      const service = appt.service || "Serviço";
      const date = appt.date || "";
      const time = appt.time ? `${appt.time}${appt.endTime ? ` às ${appt.endTime}` : ''}` : "";
      const price = appt.price ? Number(appt.price).toFixed(2).replace('.', ',') : "0,00";

      const message = `Olá, ${clientName}! ✨\n\nSeu agendamento no *Fran Marinho | Studio de Beleza* foi *CONFIRMADO* com sucesso! 🎉\n\n📅 *Data:* ${date}\n⏰ *Horário:* ${time}\n💅 *Serviço:* ${service}\n💰 *Valor:* R$ ${price} (${paymentText})\n📍 *Endereço:* Rua Abrão Júlio Rahe, 1801\n\nEstamos te aguardando para te proporcionar uma experiência incrível! 💖\nSe precisar de algo ou remarcar, entre em contato conosco.`;

      const phoneWithDdi = cleanPhone ? (cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone) : "";

      if (phoneWithDdi) {
        const encodedMsg = encodeURIComponent(message);
        window.open(`https://wa.me/${phoneWithDdi}?text=${encodedMsg}`, '_blank');
      } else {
        const encodedMsg = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
      }
    }
  };

  // Receipt PDF State & Functions
  const [receiptAppt, setReceiptAppt] = useState<Appointment | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const buildReceiptPdf = async (receiptElem: HTMLElement) => {
    const canvas = await html2canvas(receiptElem, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: receiptElem.scrollWidth,
      height: receiptElem.scrollHeight,
      windowWidth: receiptElem.scrollWidth + 100,
      windowHeight: receiptElem.scrollHeight + 100
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pdfPageWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();

    const margin = 10;
    const contentWidth = pdfPageWidth - (margin * 2);
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    if (contentHeight <= pdfPageHeight - (margin * 2)) {
      pdf.addImage(imgData, "PNG", margin, margin, contentWidth, contentHeight);
    } else {
      let heightLeft = contentHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, contentWidth, contentHeight);
      heightLeft -= (pdfPageHeight - margin);

      while (heightLeft > 0) {
        position = heightLeft - contentHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, contentWidth, contentHeight);
        heightLeft -= pdfPageHeight;
      }
    }

    return pdf;
  };

  const handleDownloadReceiptPdf = async (appt: Appointment) => {
    const receiptElem = document.getElementById("receipt-print-container");
    if (!receiptElem) return;

    setIsGeneratingPdf(true);
    try {
      const pdf = await buildReceiptPdf(receiptElem);
      pdf.save(`Recibo_FranMarinho_${(appt.clientName || 'Cliente').replace(/\s+/g, '_')}_${appt.id}.pdf`);
    } catch (err) {
      console.error("Error generating PDF receipt:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareReceiptWhatsApp = async (appt: Appointment) => {
    const receiptElem = document.getElementById("receipt-print-container");
    if (!receiptElem) return;

    setIsGeneratingPdf(true);
    try {
      const pdf = await buildReceiptPdf(receiptElem);
      const pdfBlob = pdf.output("blob");
      const clientObj = clients.find(c => (c.email && appt.clientEmail && c.email.toLowerCase() === appt.clientEmail.toLowerCase()) || c.name === appt.clientName);
      const rawPhone = clientObj?.phone || (appt as any).clientPhone || (appt as any).phone || "";
      const cleanPhone = rawPhone.replace(/\D/g, "");
      const phoneWithDdi = cleanPhone ? (cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone) : "";

      const fileName = `Recibo_FranMarinho_${appt.id}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      if (typeof navigator !== "undefined" && (navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({
          files: [file],
          title: "Recibo de Pagamento - Fran Marinho Studio de Beleza",
          text: `Olá ${appt.clientName || 'Cliente'}! Segue o seu Recibo Oficial de Pagamento.`
        });
      } else {
        pdf.save(fileName);

        const msg = `Olá, ${appt.clientName || 'Cliente'}! 📄✨\n\nAcabei de gerar o seu *Recibo Oficial de Pagamento em PDF* referente ao atendimento do dia *${appt.date}* (${appt.service}).\n\nO PDF do recibo foi baixado e você também pode armazená-lo para seus comprovantes!`;
        const encodedMsg = encodeURIComponent(msg);

        if (phoneWithDdi) {
          window.open(`https://wa.me/${phoneWithDdi}?text=${encodedMsg}`, '_blank');
        } else {
          window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
        }
      }
    } catch (err) {
      console.error("Error sharing PDF receipt:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    setVisibleFinancesCount(10);
  }, [finDateFilter, finStatusFilter, finClientFilter]);

  // Loyalty Tab State
  const [loyaltySearch, setLoyaltySearch] = useState("");
  const [loyaltySort, setLoyaltySort] = useState("closest");
  const [showLoyaltySettings, setShowLoyaltySettings] = useState(false);
  const [showLoyaltyPreview, setShowLoyaltyPreview] = useState(false);
  const [showAllLoyaltyClients, setShowAllLoyaltyClients] = useState(false);
  const [loyaltyForm, setLoyaltyForm] = useState({ prizeName: "", stampsRequired: 7, expirationDays: 90 });

  const handleEditLoyaltyClick = () => {
    setLoyaltyForm({
      prizeName: loyaltySettings.prizeName || "",
      stampsRequired: loyaltySettings.stampsRequired || 7,
      expirationDays: loyaltySettings.expirationDays || 90,
    });
    setShowLoyaltySettings(true);
  };

  const handleSaveLoyaltySettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateLoyaltySettings({
      prizeName: loyaltyForm.prizeName,
      stampsRequired: loyaltyForm.stampsRequired,
      expirationDays: loyaltyForm.expirationDays,
    });
    setShowLoyaltySettings(false);
  };

  const filteredLoyaltyClients = getAllStats()
    .filter(c => c.clientName.toLowerCase().includes(loyaltySearch.toLowerCase()))
    .sort((a, b) => {
      if (loyaltySort === "closest") {
        return b.stamps - a.stamps;
      }
      return 0;
    });

  const displayLoyaltyClients = showAllLoyaltyClients ? filteredLoyaltyClients : filteredLoyaltyClients.slice(0, 4);

  const currentMonthNum = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();

  const allBirthdays = clients
    .filter(c => c.birthDate)
    .map(c => {
      const parts = c.birthDate!.split("-");
      let y=0, m=0, d=0;
      if (parts.length === 3) {
        y = Number(parts[0]); m = Number(parts[1]); d = Number(parts[2]);
      } else {
        d = Number(parts[0]); m = Number(parts[1]); y = Number(parts[2]);
      }
      const currentYear = new Date().getFullYear();
      const age = (y > 1900 && y <= currentYear) ? currentYear - y : null;

      return {
        name: c.name,
        dateStr: `${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}`,
        day: d,
        month: m,
        year: y,
        age: age,
        phone: c.phone || "",
        dateObj: new Date(new Date().getFullYear(), m - 1, d)
      };
    })
    .sort((a, b) => {
       if (a.month !== b.month) return a.month - b.month;
       return a.day - b.day;
    });


  const upcomingBirthdays = allBirthdays
    .filter(b => (b.month === currentMonthNum && b.day >= currentDay) || (b.month > currentMonthNum))
    .slice(0, 3)
    .map(b => {
      let label = `${b.dateStr}`;
      if (b.month === currentMonthNum && b.day === currentDay) label = `Hoje, ${b.dateStr}`;
      else if (b.month === currentMonthNum && b.day === currentDay + 1) label = `Amanhã, ${b.dateStr}`;
      return { ...b, date: label };
    });

  const allLoyaltyStats = getAllStats();
  const loyaltyParticipantsCount = allLoyaltyStats.length;
  const closeToPrizeCount = allLoyaltyStats.filter(s => s.stamps > 0 && s.stamps >= (loyaltySettings.stampsRequired || 7) - 2).length;
  const claimsThisMonth = loyaltyClaims.length; 
  const clientsWithPrizes = allLoyaltyStats.filter(s => s.availablePrizes > 0 || loyaltyClaims.some(c => c.clientEmail === s.clientEmail)).length;
  const completionRate = loyaltyParticipantsCount > 0 ? Math.round((clientsWithPrizes / loyaltyParticipantsCount) * 100) : 0;

  // CRM / Users Tab State

  useEffect(() => {
    if (user === undefined) return;
    if (!user || user.role !== "admin") {
      router.push("/login");
    }
  }, [user, router]);

  
  useEffect(() => {
    if (settings) {
      setSiteForm({
        heroTitle: settings.heroTitle || "",
        heroSubtitle: settings.heroSubtitle || "",
        heroImage: settings.heroImage || "",
        aboutTitle: settings.aboutTitle || "",
        aboutText: settings.aboutText || "",
        aboutImage: settings.aboutImage || "",
        businessStart: settings.businessStart || "09:00",
        businessEnd: settings.businessEnd || "18:00",
        workDays: settings.workDays || [1, 2, 3, 4, 5, 6],
        whatsappNumber: settings.whatsappNumber || "",
        salonAddress: settings.salonAddress || "",
        mapsLink: settings.mapsLink || "",
        preparationSteps: settings.preparationSteps || [],
        logoUrl: settings.logoUrl || "",
        loginHeroImage: settings.loginHeroImage || "",
        loginQuote: settings.loginQuote || "",
        loginQuoteAuthor: settings.loginQuoteAuthor || "",
        testimonials: settings.testimonials || [],
      });
    }
  }, [settings]);



  const handleEditProfileOpen = () => {
    setShowProfileDropdown(false);
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = (data: { name: string; email: string; phone: string; birthDate: string; password?: string; photo?: string }) => {
    updateProfile(data);
    setShowEditProfileModal(false);
  };

  const handleOpenNewClientModal = () => {
    setClientForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      birthDate: "",
      photoUrl: "",
      password: ""
    });
    setShowEditClientModal(true);
  };

  const handleEditClientClick = (client: ClientItem) => {
    let pass = client.password || "";
    if (!pass && client.email) {
      const usersListStr = localStorage.getItem("@agenday:users_list");
      if (usersListStr) {
        try {
          const list = JSON.parse(usersListStr);
          const matched = list.find((u: any) => u.email.toLowerCase() === client.email.toLowerCase());
          if (matched && matched.password) pass = matched.password;
        } catch (e) {}
      }
    }
    setClientForm({ ...client, password: pass });
    setShowEditClientModal(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name || !clientForm.email) {
      alert("Por favor, preencha o Nome e E-mail do cliente.");
      return;
    }

    let res: { success: boolean; error?: string };
    if (clientForm.id) {
      res = await updateClient(clientForm.id, clientForm);
    } else {
      res = await addClient({
        name: clientForm.name,
        email: clientForm.email,
        phone: clientForm.phone || "",
        address: clientForm.address || "",
        birthDate: clientForm.birthDate || "",
        photoUrl: clientForm.photoUrl || "",
        password: clientForm.password || ""
      });
    }

    if (!res.success) {
      alert(res.error || "Erro ao salvar cliente.");
      return;
    }

    // Sincronizar com lista de usuários de autenticação para permitir login do cliente
    if (clientForm.email && clientForm.password) {
      const usersListStr = localStorage.getItem("@agenday:users_list");
      let usersList: any[] = [];
      if (usersListStr) {
        try { usersList = JSON.parse(usersListStr); } catch (e) {}
      }
      const idx = usersList.findIndex((u: any) => u.email.toLowerCase() === clientForm.email!.toLowerCase());
      const userObj = {
        id: clientForm.id || ("client_" + Date.now()),
        name: clientForm.name,
        email: clientForm.email,
        role: "client",
        phone: clientForm.phone || "",
        birthDate: clientForm.birthDate || "",
        password: clientForm.password,
        status: clientForm.status || "active"
      };
      if (idx >= 0) {
        usersList[idx] = { ...usersList[idx], ...userObj };
      } else {
        usersList.push(userObj);
      }
      localStorage.setItem("@agenday:users_list", JSON.stringify(usersList));
    }

    setShowEditClientModal(false);
  };



  const handleDeleteClient = (id: string) => {
    const client = clients.find(c => c.id === id);
    setConfirmModal({
      open: true,
      title: "Excluir Cliente",
      message: `Tem certeza que deseja excluir o perfil de ${client?.name || "este cliente"} e cancelar seus agendamentos?`,
      confirmText: "Sim, Excluir",
      variant: "danger",
      onConfirm: () => {
        if (client) {
          appointments.forEach(apt => {
            if ((client.email && apt.clientEmail?.toLowerCase() === client.email.toLowerCase()) || apt.clientName === client.name) {
              deleteAppointment(apt.id);
            }
          });
        }
        deleteClient(id);
        setSelectedClientId(null);
        setNoticeModal({ open: true, title: "Cliente Excluído", message: "O perfil do cliente foi removido com sucesso.", type: "info" });
      }
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const compressed = await compressImage(e.target.files[0], 400, 400, 0.85);
      setProfileForm(prev => ({ ...prev, photo: compressed }));
    }
  };

  const handleServiceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const compressed = await compressImage(e.target.files[0], 800, 800, 0.82);
      setSrvImage(compressed);
    }
  };

  const handleProfPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const compressed = await compressImage(e.target.files[0], 400, 400, 0.85);
      setSrvProfPhoto(compressed);
    }
  };



  const handleSendReminder = (phone: string, clientName: string) => {
    const msg = `Olá ${clientName}! Passando para lembrar do nosso agendamento amanhã. Podemos confirmar? ✨`;
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleSendReminderForAppt = (apt: any) => {
    const matchedClient = clients.find(c => 
      c.name.toLowerCase() === apt.clientName?.toLowerCase() || 
      (c.email && apt.clientEmail && c.email.toLowerCase() === apt.clientEmail.toLowerCase())
    );

    let rawPhone = matchedClient?.phone || (apt as any).phone || (apt as any).clientPhone || "";
    let digits = rawPhone.replace(/\D/g, "");

    if (digits && digits.length <= 11) {
      if (!digits.startsWith("55")) {
        digits = "55" + digits;
      }
    }

    const salonName = (settings as any).salonName || "Nosso Salão";
    const msg = `Olá, ${apt.clientName}! 🌸%0A%0APassando para lembrar do seu agendamento no *${salonName}*:%0A📅 *Data:* ${apt.date}%0A⏰ *Horário:* ${apt.time}%0A💅 *Serviço:* ${apt.service}%0A%0APodemos confirmar a sua presença? Aguardamos você! ✨`;

    if (digits) {
      window.open(`https://wa.me/${digits}?text=${msg}`, '_blank');
    } else {
      const targetPhone = prompt(`Digite o WhatsApp do(a) cliente ${apt.clientName}:`, "");
      if (targetPhone) {
        let cleanDigits = targetPhone.replace(/\D/g, "");
        if (cleanDigits.length <= 11 && !cleanDigits.startsWith("55")) {
          cleanDigits = "55" + cleanDigits;
        }
        window.open(`https://wa.me/${cleanDigits}?text=${msg}`, '_blank');
      }
    }
  };

  const handleSendCancellationForAppt = (apt: any) => {
    const matchedClient = clients.find(c => 
      c.name.toLowerCase() === apt.clientName?.toLowerCase() || 
      (c.email && apt.clientEmail && c.email.toLowerCase() === apt.clientEmail.toLowerCase())
    );

    let rawPhone = matchedClient?.phone || (apt as any).phone || (apt as any).clientPhone || "";
    let digits = rawPhone.replace(/\D/g, "");

    if (digits && digits.length <= 11) {
      if (!digits.startsWith("55")) {
        digits = "55" + digits;
      }
    }

    const salonName = (settings as any).salonName || "Nosso Salão";
    const msg = `Olá, ${apt.clientName}! 🌸%0A%0AConfirmamos o *cancelamento* do seu agendamento no *${salonName}*:%0A📅 *Data:* ${apt.date}%0A⏰ *Horário:* ${apt.time}%0A💅 *Serviço:* ${apt.service}%0A%0AO seu agendamento foi cancelado com sucesso. Se desejar reagendar em outro momento, estamos à disposição! ✨`;

    if (digits) {
      window.open(`https://wa.me/${digits}?text=${msg}`, '_blank');
    } else {
      const targetPhone = prompt(`Digite o WhatsApp do(a) cliente ${apt.clientName} para enviar a confirmação do cancelamento:`, "");
      if (targetPhone) {
        let cleanDigits = targetPhone.replace(/\D/g, "");
        if (cleanDigits.length <= 11 && !cleanDigits.startsWith("55")) {
          cleanDigits = "55" + cleanDigits;
        }
        window.open(`https://wa.me/${cleanDigits}?text=${msg}`, '_blank');
      }
    }
  };

  const handleSendBirthday = (phone: string, clientName: string) => {
    let targetPhone = phone ? phone.replace(/\D/g, "") : "";
    if (!targetPhone) {
      const inputPhone = prompt(`Digite o WhatsApp do(a) cliente ${clientName}:`, "");
      if (!inputPhone) return;
      targetPhone = inputPhone.replace(/\D/g, "");
    }
    const salonName = "Fran Marinho | Studio de Beleza";


    const msg = `Olá ${clientName}! 🥳🎂🎉%0A%0AToda a nossa equipe do *${salonName}* deseja a você um Feliz Aniversário repleto de saúde, paz, alegria e muitas realizações! ✨%0A%0APara celebrar esse dia tão especial com você, preparamos um presente exclusivo no seu próximo atendimento conosco! 🎁💖%0A%0AVenha comemorar sua beleza com a gente! 🥰✨`;
    window.open(`https://wa.me/${targetPhone}?text=${msg}`, '_blank');
  };


  const handleSendReceipt = (phone: string, clientName: string, service: string, price: number) => {
    const msg = `Olá ${clientName}! Segue o comprovante do seu agendamento.%0A%0A*Serviços:* ${service}%0A*Total:* R$ ${price},00%0A*Status:* PAGO%0A%0AAgradecemos a preferência! ✨`;
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleCharge = (phone: string, clientName: string, price: number) => {
    const msg = `Olá ${clientName}! Para confirmar seu agendamento, por favor realize o pagamento do valor de R$ ${price},00 pela nossa chave Pix: CNPJ 00.000.000/0001-00.`;
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleBlockDay = () => {
    toggleDateClosed(selectedDateStr);
  };
  
  // Appointment Edit State
  const [showApptModal, setShowApptModal] = useState(false);
  const [editingAppt, setEditingAppt] = useState<any>(null);
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [apptEndTime, setApptEndTime] = useState("");
  const [apptSelectedServices, setApptSelectedServices] = useState<string[]>([]);
  const [apptPrice, setApptPrice] = useState("");
  const [apptClientName, setApptClientName] = useState("");
  const [apptPaymentStatus, setApptPaymentStatus] = useState("open");
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  // Lock background scrolling when any modal is active
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      selectedDetailAppt || 
      confirmPaymentAppt || 
      showBlockModal || 
      showEditProfileModal || 
      showLoyaltySettings || 
      showLoyaltyPreview ||
      showApptModal ||
      showServiceForm ||
      showEditClientModal
    );

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [
    selectedDetailAppt, 
    confirmPaymentAppt, 
    showBlockModal, 
    showEditProfileModal, 
    showLoyaltySettings, 
    showLoyaltyPreview,
    showApptModal,
    showServiceForm,
    showEditClientModal
  ]);

  // Lista unificada de clientes cadastrados no banco de dados
  const allClientSuggestions = useMemo(() => {
    const list: { name: string; email?: string; phone?: string }[] = [];
    const seen = new Set<string>();

    clients.forEach(c => {
      if (c.name && !seen.has(c.name.toLowerCase())) {
        seen.add(c.name.toLowerCase());
        list.push({ name: c.name, email: c.email, phone: c.phone });
      }
    });

    appointments.forEach(a => {
      if (a.clientName && !seen.has(a.clientName.toLowerCase())) {
        seen.add(a.clientName.toLowerCase());
        list.push({ name: a.clientName, email: a.clientEmail, phone: (a as any).phone || (a as any).clientPhone });
      }
    });

    return list;
  }, [clients, appointments]);

  // Recalcular tempo e preço quando serviços ou hora mudam
  useEffect(() => {
    if (!showApptModal) return;

    let totalDuration = 0;
    let totalPrice = 0;
    
    apptSelectedServices.forEach(srvName => {
      const serviceObj = services.find(s => s.name === srvName);
      if (serviceObj) {
        totalDuration += parseInt(serviceObj.duration.toString()) || 60;
        totalPrice += serviceObj.price;
      }
    });

    if (totalDuration === 0) totalDuration = 60; // default

    if (apptTime && apptTime.includes(':')) {
      const [h, m] = apptTime.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const totalMins = h * 60 + m + totalDuration;
        const newH = Math.floor(totalMins / 60);
        const newM = totalMins % 60;
        setApptEndTime(`${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`);
      }
    }
    
    if (apptSelectedServices.length > 0) {
      setApptPrice(totalPrice.toString());
    }
  }, [apptSelectedServices, apptTime, services, showApptModal]);

  if (!user || user.role !== "admin") return <div style={{ padding: "120px", textAlign: "center" }}>Verificando credenciais...</div>;

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApptTime(e.target.value);
  };

  const handleOpenEditAppt = (apt: any) => {
    setEditingAppt(apt);
    setApptDate(apt.date);
    setApptTime(apt.time);
    setApptEndTime(apt.endTime || "");
    const srvs = apt.service ? apt.service.split(', ').map((s: string) => s.trim()) : [];
    setApptSelectedServices(srvs);
    setApptPrice(apt.price.toString());
    setApptClientName(apt.clientName || "");
    setApptPaymentStatus(apt.paymentStatus || "open");
    setShowApptModal(true);
  };

  const handleOpenNewAppt = (timeStr?: string) => {
    setEditingAppt(null);
    setApptDate(selectedDateStr);
    setApptTime(typeof timeStr === 'string' ? timeStr : "");
    setApptEndTime("");
    setApptSelectedServices([]);
    setApptPrice("");
    setApptClientName("");
    setApptPaymentStatus("open");
    setShowApptModal(true);
  };

  const handleSaveApptEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedClient = clients.find(c => c.name === apptClientName);
    const resolvedEmail = resolvedClient ? resolvedClient.email : "avulso@salao.com";

    if (editingAppt) {
      updateAppointment(editingAppt.id, {
        date: apptDate,
        time: apptTime,
        endTime: apptEndTime,
        service: apptSelectedServices.join(', '),
        price: Number(apptPrice),
        clientName: apptClientName || "Cliente Avulso",
        clientEmail: resolvedEmail,
        paymentStatus: apptPaymentStatus as any,
        status: (apptDate !== editingAppt.date || apptTime !== editingAppt.time) ? 'rescheduled' : editingAppt.status
      });
    } else {
      addAppointment({
        date: apptDate,
        time: apptTime,
        endTime: apptEndTime,
        service: apptSelectedServices.join(', '),
        price: Number(apptPrice),
        status: 'confirmed',
        paymentStatus: apptPaymentStatus as any,
        clientName: apptClientName || "Cliente Avulso",
        clientEmail: resolvedEmail
      });
    }
    setShowApptModal(false);
    setEditingAppt(null);
  };

  const generateTimeline = () => {
    const start = timeToMins(siteForm.businessStart || "09:00");
    const end = timeToMins(siteForm.businessEnd || "18:00");
    const slots = [];
    for (let i = start; i < end; i += 30) {
      slots.push(minsToTime(i));
    }
    return slots;
  };

  // Function to filter appointments that fall in a specific 30min block
  // This considers an appointment inside a block if it starts within this block
  const getApptsForSlot = (time: string) => {
    const slotStart = timeToMins(time);
    const slotEnd = slotStart + 30;
    return dayAppointments.filter(a => {
      const aptTime = timeToMins(a.time);
      return aptTime >= slotStart && aptTime < slotEnd;
    });
  };

  const getOngoingApptForSlot = (time: string) => {
    const slotStart = timeToMins(time);
    return dayAppointments.find(a => {
      if (!a.endTime || a.status === 'canceled') return false;
      const aptStart = timeToMins(a.time);
      const aptEnd = timeToMins(a.endTime);
      return slotStart > aptStart && slotStart < aptEnd;
    });
  };
  
  const handleEditService = (service: ServiceItem) => {
    setEditingServiceId(service.id);
    setSrvName(service.name);
    setSrvDesc(service.description);
    setSrvPrice(service.price.toString());
    setSrvDuration(service.duration.toString());
    setSrvImage(service.imageUrl);
    setSrvProfName(service.professionalName || "");
    setSrvProfPhoto(service.professionalPhotoUrl || "");
    setShowServiceForm(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: srvName,
      description: srvDesc,
      price: Number(srvPrice),
      duration: Number(srvDuration),
      imageUrl: srvImage || "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=800&auto=format&fit=crop",
      professionalName: srvProfName,
      professionalPhotoUrl: srvProfPhoto
    };

    if (editingServiceId) {
      updateService(editingServiceId, data);
    } else {
      addService(data);
    }

    setSrvName("");
    setSrvDesc("");
    setSrvPrice("");
    setSrvDuration("");
    setSrvImage("");
    setSrvProfName("");
    setSrvProfPhoto("");
    setShowServiceForm(false);
    setEditingServiceId(null);
  };

  const handleSaveAppearance = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(siteForm);
    alert("Configurações de aparência salvas com sucesso!");
  };

  const selectedDateStr = `${String(selectedDate.getDate()).padStart(2, '0')}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${selectedDate.getFullYear()}`;
  const activeWorkDays = settings?.workDays || [1, 2, 3, 4, 5, 6];
  const isWorkDay = activeWorkDays.includes(selectedDate.getDay());
  const isSelectedDateClosed = closedDates.includes(selectedDateStr) || !isWorkDay;
  const agendaAberta = !isSelectedDateClosed;

  
  const parsedClosedDates = closedDates.map(dStr => {
    const [dd, mm, yyyy] = dStr.split('/');
    return new Date(Number(yyyy), Number(mm)-1, Number(dd));
  });
  
  // Format selected date to match string format DD/MM/YYYY
  const currentMonthStr = `/${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${selectedDate.getFullYear()}`;
  
  // Agendamentos filtrados pela data no Dashboard Principal
  const dayAppointments = appointments.filter(a => a.date === selectedDateStr);
  const totalRevenue = dayAppointments.reduce((acc, curr) => acc + curr.price, 0);
  const paidRevenue = dayAppointments.filter(a => a.paymentStatus.includes('paid')).reduce((acc, curr) => acc + curr.price, 0);

  // Extrair clientes únicos para o select e CRM
  const uniqueClientsList = Array.from(new Set(appointments.map(a => a.clientEmail))).map(email => {
    return {
      email,
      name: appointments.find(a => a.clientEmail === email)?.clientName || "Cliente"
    };
  });

  // Filtros de Financeiro
  const filteredFinances = appointments.filter(a => {
    if (a.status === 'canceled') return false; // Ignorar cancelados no faturamento
    
    // Filtro de Cliente
    if (finClientFilter !== 'all' && a.clientEmail !== finClientFilter) return false;

    // Filtro de Data / Período
    if (finDateFilter !== 'all') {
      const parts = a.date.split('/');
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts.map(Number);
        const apptDate = new Date(yyyy, mm - 1, dd);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (finDateFilter === 'today') {
          if (a.date !== selectedDateStr && (apptDate.getDate() !== now.getDate() || apptDate.getMonth() !== now.getMonth() || apptDate.getFullYear() !== now.getFullYear())) return false;
        } else if (finDateFilter === 'yesterday') {
          const yesterday = new Date(todayStart);
          yesterday.setDate(yesterday.getDate() - 1);
          if (apptDate.getDate() !== yesterday.getDate() || apptDate.getMonth() !== yesterday.getMonth() || apptDate.getFullYear() !== yesterday.getFullYear()) return false;
        } else if (finDateFilter === 'last_7_days') {
          const sevenDaysAgo = new Date(todayStart);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
          const endOfToday = new Date(todayStart.getTime() + 86400000 - 1);
          if (apptDate < sevenDaysAgo || apptDate > endOfToday) return false;
        } else if (finDateFilter === 'last_30_days') {
          const thirtyDaysAgo = new Date(todayStart);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
          const endOfToday = new Date(todayStart.getTime() + 86400000 - 1);
          if (apptDate < thirtyDaysAgo || apptDate > endOfToday) return false;
        } else if (finDateFilter === 'this_month') {
          if (apptDate.getMonth() !== now.getMonth() || apptDate.getFullYear() !== now.getFullYear()) return false;
        } else if (finDateFilter === 'last_month') {
          const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          if (apptDate.getMonth() !== lastMonthDate.getMonth() || apptDate.getFullYear() !== lastMonthDate.getFullYear()) return false;
        } else if (finDateFilter === 'this_year') {
          if (apptDate.getFullYear() !== now.getFullYear()) return false;
        }
      }
    }
    
    // Filtro de Status Avançado
    if (finStatusFilter !== 'all') {
      if (finStatusFilter === 'paid') return a.paymentStatus.includes('paid');
      if (finStatusFilter === 'pending' || finStatusFilter === 'open') return a.paymentStatus === 'open';
      if (finStatusFilter === 'paid_pix') return a.paymentStatus === 'paid_pix';
      if (finStatusFilter === 'paid_credit') return a.paymentStatus === 'paid_credit';
      if (finStatusFilter === 'paid_debit') return a.paymentStatus === 'paid_debit';
    }
    
    return true;
  });

  const finTotal = filteredFinances.reduce((acc, curr) => acc + curr.price, 0);
  const finPaid = filteredFinances.filter(a => a.paymentStatus.includes('paid')).reduce((acc, curr) => acc + curr.price, 0);
  const finPixTotal = filteredFinances.filter(a => a.paymentStatus === 'paid_pix').reduce((acc, curr) => acc + curr.price, 0);
  const finCardTotal = filteredFinances.filter(a => a.paymentStatus === 'paid_credit' || (a.paymentStatus as string) === 'paid_card' || a.paymentStatus === 'paid_debit').reduce((acc, curr) => acc + curr.price, 0);
  const finPending = filteredFinances.filter(a => a.paymentStatus === 'open' || (a.paymentStatus as string) === 'pending').reduce((acc, curr) => acc + curr.price, 0);
  const finRefundTotal = filteredFinances.filter(a => (a.paymentStatus as string) === 'refunded').reduce((acc, curr) => acc + curr.price, 0);
  const activeDayAppointments = dayAppointments.filter(a => a.status !== 'canceled');

  const occupiedMins = activeDayAppointments.reduce((acc, curr) => {
    if (curr.endTime && curr.time) {
      const duration = timeToMins(curr.endTime) - timeToMins(curr.time);
      return acc + (duration > 0 ? duration : 30);
    }
    return acc + 30;
  }, 0);

  const bStart = timeToMins(siteForm.businessStart || "09:00");
  const bEnd = timeToMins(siteForm.businessEnd || "18:00");
  const totalBusinessMins = Math.max(0, bEnd - bStart);

  const timelineSlots = generateTimeline();
  const effectiveBlockedSlots = timelineSlots.filter(slot => {
    if (!blockedTimeSlots.includes(`${selectedDateStr}-${slot}`)) return false;
    const hasAppts = getApptsForSlot(slot).length > 0;
    const isOngoing = !!getOngoingApptForSlot(slot);
    return !hasAppts && !isOngoing;
  });
  const blockedSlotsCount = effectiveBlockedSlots.length;
  const blockedMins = blockedSlotsCount * 30;

  const freeMins = isSelectedDateClosed 
    ? 0 
    : Math.max(0, totalBusinessMins - occupiedMins - blockedMins);

  const occupiedHours = (occupiedMins / 60).toFixed(1).replace('.0', '');
  const freeHours = (freeMins / 60).toFixed(1).replace('.0', '');

  return (
    <div className={styles.adminLayout}>
      {/* Sidebar Ultra Moderna */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className={styles.sidebarLogoImg} />
          ) : (
            <div className={styles.sidebarLogoBadge}>
              <Sparkles size={18} color="#ffffff" />
            </div>
          )}
          <span className={styles.sidebarLogoText}>
            Fran <span className={styles.sidebarLogoHighlight}>Marinho</span>
          </span>
        </div>

        
        <nav className={styles.sidebarNav}>
          <button className={`${styles.sidebarTab} ${activeTab === 'dashboard' ? styles.sidebarTabActive : ''}`} onClick={() => setActiveTab('dashboard')}>
            <CalendarDays size={20} /> <span>Agenda</span>
          </button>
          <button className={`${styles.sidebarTab} ${activeTab === 'finance' ? styles.sidebarTabActive : ''}`} onClick={() => setActiveTab('finance')}>
            <DollarSign size={20} /> <span>Financeiro</span>
          </button>
          <button className={`${styles.sidebarTab} ${activeTab === 'loyalty' ? styles.sidebarTabActive : ''}`} onClick={() => setActiveTab('loyalty')}>
            <Gift size={20} /> <span>Fidelidade</span>
          </button>
          <button className={`${styles.sidebarTab} ${activeTab === 'users' ? styles.sidebarTabActive : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={20} /> <span>CRM</span>
          </button>
          <button className={`${styles.sidebarTab} ${activeTab === 'birthdays' ? styles.sidebarTabActive : ''}`} onClick={() => setActiveTab('birthdays')}>
            <Cake size={20} /> <span>Aniversários</span>
          </button>
          <button className={`${styles.sidebarTab} ${activeTab === 'services' ? styles.sidebarTabActive : ''}`} onClick={() => setActiveTab('services')}>
            <Grid size={20} /> <span>Serviços</span>
          </button>
          <button className={`${styles.sidebarTab} ${activeTab === 'appearance' ? styles.sidebarTabActive : ''}`} onClick={() => setActiveTab('appearance')}>
            <Palette size={20} /> <span>Aparência</span>
          </button>
        </nav>
      </aside>

      {/* Área Principal */}
      <main className={styles.mainArea}>
        <div className={styles.adminHeader}>
          <div className={styles.headerTopRow}>
            <div className={styles.mobileHeaderBrand}>
              <Sparkles size={22} color="var(--color-primary)" />
              <span>Fran Marinho</span>
            </div>

            <div className={styles.headerUser}>
              <div style={{ position: "relative" }}>
                <div 
                  className={styles.userCard} 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  style={{ cursor: "pointer", transition: "all 0.2s" }}
                >
                  {user?.photo ? (
                    <img src={user.photo} alt="Avatar" className={styles.avatar} style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className={styles.avatar}>{getInitials(user?.name || "Admin")}</div>
                  )}
                  <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{getFirstName(user?.name || "Admin")}</span>
                  <ChevronDown size={16} style={{ color: "#64748b", marginRight: 8, transform: showProfileDropdown ? 'rotate(180deg)' : 'rotate(0)' }} />
                </div>

                {showProfileDropdown && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "220px", background: "#fff", borderRadius: "12px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0", zIndex: 1000, overflow: "hidden" }}>
                    <button 
                      onClick={handleEditProfileOpen}
                      style={{ width: "100%", padding: "12px 16px", background: "transparent", border: "none", borderBottom: "1px solid #f1f5f9", textAlign: "left", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: "0.95rem", color: "#334155" }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <UserCircle size={18} /> Editar Perfil
                    </button>
                    <button 
                      onClick={() => { logout(); router.push('/login'); }}
                      style={{ width: "100%", padding: "12px 16px", background: "transparent", border: "none", textAlign: "left", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: "0.95rem", color: "#e11d48" }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff1f2'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <LogOut size={18} /> Sair do Sistema
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {activeTab === "dashboard" && (
            <div className={styles.headerStats}>
              <div className={styles.headerStatBadge}>
                <div className={styles.headerStatIcon}><DollarSign size={20} /></div>
                <div className={styles.headerStatText}>
                  <div className={styles.headerStatValue}>R$ {totalRevenue},00</div>
                  <div className={styles.headerStatLabel}>Receita prevista ({selectedDateStr})</div>
                </div>
              </div>
              <div className={styles.headerStatBadge}>
                <div className={styles.headerStatIconGreen}><CheckCircle2 size={20} /></div>
                <div className={styles.headerStatText}>
                  <div className={styles.headerStatValue}>R$ {paidRevenue},00</div>
                  <div className={styles.headerStatLabel}>Pagamentos aprovados (IA)</div>
                </div>
              </div>
              <div className={styles.headerStatBadge}>
                <div className={styles.headerStatIcon} style={{background: '#fef2f2', color: 'var(--color-primary)'}}><Users size={20} /></div>
                <div className={styles.headerStatText}>
                  <div className={styles.headerStatValue}>{dayAppointments.length}</div>
                  <div className={styles.headerStatLabel}>Clientes agendados ({selectedDateStr})</div>
                </div>
              </div>
            </div>
          )}
        </div>

      {activeTab === "dashboard" && (
        <div className={styles.mainContent}>
          <div className={styles.grid}>
            {/* Left Column */}
            <div className={styles.card} style={{ padding: 0 }}>
              <div style={{ padding: 24 }}>
                <div className={styles.agendaHeaderArea}>
                  <div className={styles.agendaDateSelector}>
                    <CalendarDays size={24} color="var(--color-primary-dark)" />
                    <div>
                      <div className={styles.agendaDateTitleRow}>
                        <span className={styles.agendaDateTitle}>Agenda do Dia</span>
                        <div className={styles.dayApptsPill}>
                          <Sparkles size={13} className={styles.sparkleIcon} />
                          <span>{dayAppointments.length} {dayAppointments.length === 1 ? 'agendamento' : 'agendamentos'}</span>
                        </div>
                      </div>
                      <div className={styles.agendaDateSubtitle}>
                        {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' }).charAt(0).toUpperCase() + selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' }).slice(1)}, {selectedDate.getDate()} de {selectedDate.toLocaleDateString('pt-BR', { month: 'long' })}
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.mobileWrap}>
                    <div className={styles.agendaNavContainer}>
                      <button className={styles.agendaNavBtn} onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}>&lt;</button>
                      <button className={`${styles.agendaNavBtn} ${styles.agendaNavBtnToday}`} onClick={() => setSelectedDate(new Date())}>Hoje</button>
                      <button className={styles.agendaNavBtn} onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}>&gt;</button>
                    </div>
                    
                    <div className={styles.agendaFilters}>
                      <button className={`${styles.filterBtn} ${agendaFilter === 'all' ? styles.filterBtnActive : ''}`} onClick={() => setAgendaFilter('all')}>Todos</button>
                      <button className={`${styles.filterBtn} ${agendaFilter === 'confirmed' ? styles.filterBtnActive : ''}`} onClick={() => setAgendaFilter('confirmed')}>Confirmados</button>
                      <button className={`${styles.filterBtn} ${agendaFilter === 'pending' ? styles.filterBtnActive : ''}`} onClick={() => setAgendaFilter('pending')}>Pendentes</button>
                    </div>
                    
                    <button 
                      className={isSelectedDateClosed ? "btn-secondary" : "btn-primary"} 
                      onClick={() => !isSelectedDateClosed && handleOpenNewAppt()} 
                      style={{ padding: '10px 16px', borderRadius: '12px', opacity: isSelectedDateClosed ? 0.6 : 1, cursor: isSelectedDateClosed ? 'not-allowed' : 'pointer', width: '100%', justifyContent: 'center' }}
                      disabled={isSelectedDateClosed}
                    >
                      {isSelectedDateClosed ? <Ban size={16} /> : <Plus size={16} />} {isSelectedDateClosed ? "Agenda Fechada" : "Novo agendamento"}
                    </button>
                  </div>
                </div>
                
                <div className={styles.agendaSummary}>
                  <div className={styles.summaryItem}>
                    <CalendarDays size={18} className={styles.summaryIcon} /> {dayAppointments.length} agendamentos
                  </div>
                  <div className={styles.summaryItem}>
                    <TrendingUp size={18} className={styles.summaryIcon} /> {occupiedHours}h ocupadas
                  </div>
                  <div className={styles.summaryItem}>
                    <CheckCircle2 size={18} className={styles.summaryIcon} style={{color: '#22c55e'}} /> {freeHours}h livres
                  </div>
                  {blockedSlotsCount > 0 && (
                    <div className={styles.summaryItemBlocked}>
                      <Ban size={16} className={styles.summaryIconBlocked} />
                      {blockedSlotsCount} {blockedSlotsCount === 1 ? 'bloqueado' : 'bloqueados'}
                    </div>
                  )}
                </div>

                <div className={styles.timelineContainer}>
                  {generateTimeline().map((timeSlot) => {
                    const aptsInSlot = getApptsForSlot(timeSlot);
                    const activeAptsInSlot = aptsInSlot.filter(apt => apt.status !== 'canceled');
                    const canceledAptsInSlot = aptsInSlot.filter(apt => apt.status === 'canceled');
                    const ongoingAppt = activeAptsInSlot.length === 0 ? getOngoingApptForSlot(timeSlot) : null;
                    
                    // Se não tiver agendamentos ativos começando aqui E tiver um em andamento, não renderiza para não poluir
                    if (ongoingAppt && activeAptsInSlot.length === 0) return null;
                    
                    // Filter handling
                    const filteredApts = activeAptsInSlot.filter(apt => {
                      if (agendaFilter === 'all') return true;
                      if (agendaFilter === 'confirmed') return apt.status === 'confirmed';
                      if (agendaFilter === 'pending') return apt.status === 'pending';
                      return true;
                    });
                    
                    // Current time logic for the red line
                    const now = new Date();
                    const currentHours = now.getHours();
                    const currentMinutes = now.getMinutes();
                    const [slotHours, slotMinutes] = timeSlot.split(':').map(Number);
                    const isCurrentSlot = selectedDate.toDateString() === now.toDateString() && currentHours === slotHours && (currentMinutes >= slotMinutes && currentMinutes < slotMinutes + 30);

                    return (
                      <div key={timeSlot} className={styles.timelineRow}>
                        <div className={styles.timelineTime}>{timeSlot}</div>
                        
                        <div className={styles.timelineContent}>
                          {isCurrentSlot && (
                            <div className={styles.timelineRedLine} style={{ top: `${(currentMinutes % 30) / 30 * 100}%` }}>
                              <div className={styles.timelineRedDot}></div>
                              <div className={styles.timelineRedText}>{now.getHours().toString().padStart(2, '0')}:{now.getMinutes().toString().padStart(2, '0')}</div>
                            </div>
                          )}
                          
                          {filteredApts.length > 0 ? (
                            <div>
                              {filteredApts.map(apt => {
                                const clientObj = clients.find(c => c.email === apt.clientEmail || c.name.toLowerCase() === apt.clientName.toLowerCase());
                                const clientPhoto = clientObj?.photoUrl || (clientObj as any)?.photo;

                                return (
                                  <div 
                                    key={apt.id} 
                                    className={`${styles.agendaItemTimeline} ${apt.status === 'confirmed' ? styles.confirmed : apt.status === 'completed' ? styles.completed : styles.pending}`}
                                    onClick={() => setSelectedDetailAppt(apt)}
                                    title="Clique para ver os detalhes completos do agendamento"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <div className={styles.cardLeft}>
                                      <div className={styles.cardAvatar}>
                                        {clientPhoto ? (
                                          <img src={clientPhoto} alt={apt.clientName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                          getInitials(apt.clientName)
                                        )}
                                      </div>
                                      <div className={styles.cardDetails}>
                                        <div className={styles.clientName}>
                                          {apt.clientName}
                                          {!clientObj && (
                                            <span style={{ marginLeft: 8, fontSize: "0.7rem", backgroundColor: "#fef2f2", color: "#ef4444", padding: "2px 6px", borderRadius: "12px", border: "1px solid #fecaca", fontWeight: 600 }}>Excluído</span>
                                          )}
                                        </div>
                                        
                                        {/* Serviços agendados em texto normal lado a lado */}
                                        {apt.service && (
                                          <div className={styles.cardServicesText}>
                                            {apt.service.split(",").map(s => s.trim()).filter(Boolean).join(" • ")}
                                          </div>
                                        )}

                                        <div className={styles.cardMetaRow}>
                                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1e293b', fontWeight: 600 }}>
                                            <CalendarDays size={14} color="#64748b" /> {apt.time} - {apt.endTime || "N/A"}
                                          </span>
                                          <span style={{ color: '#64748b' }}>•</span>
                                          <span style={{ color: '#1e293b', fontWeight: 600 }}>R$ {apt.price},00</span>
                                        </div>
                                        <div className={styles.cardBadges}>
                                          {apt.status === 'confirmed' && <span className={`${styles.badge} ${styles.badgeGreen}`}>Confirmado</span>}
                                          {apt.status === 'pending' && <span className={`${styles.badge} ${styles.badgeYellow}`}>Pendente</span>}
                                          {apt.status === 'completed' && <span className={`${styles.badge} ${styles.badgeGray}`}>Concluído</span>}
                                          
                                          {apt.paymentStatus.includes('paid') ? (
                                            <span className={`${styles.badge} ${styles.badgeGreen}`}>Pago via {apt.paymentStatus.replace('paid_', '')}</span>
                                          ) : (
                                            <span className={`${styles.badge} ${styles.badgeYellow}`}>Pagamento pendente</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Tag discreta para agendamentos cancelados no mesmo horário */}
                              {canceledAptsInSlot.map(cancAppt => (
                                <div 
                                  key={cancAppt.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDetailAppt(cancAppt);
                                  }}
                                  style={{
                                    marginTop: "6px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    background: "#FEF2F2",
                                    border: "1px dashed #FCA5A5",
                                    borderRadius: "10px",
                                    padding: "4px 10px",
                                    fontSize: "0.76rem",
                                    fontWeight: 600,
                                    color: "#991B1B",
                                    cursor: "pointer"
                                  }}
                                  title="Clique para ver os detalhes do agendamento cancelado"
                                >
                                  <XCircle size={13} color="#EF4444" />
                                  <span>Cancelado: <strong>{cancAppt.clientName}</strong> ({cancAppt.time})</span>
                                  <span style={{ fontSize: "0.7rem", textDecoration: "underline", color: "#DC2626", marginLeft: "4px" }}>Ver detalhes</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            isSelectedDateClosed ? (
                              <div className={styles.closedSlotCard}>
                                <div className={styles.closedSlotIconBadge}>
                                  <Ban size={16} />
                                </div>
                                <div className={styles.closedSlotInfo}>
                                  <div className={styles.closedSlotTitle}>Agenda Fechada Neste Dia</div>
                                  <div className={styles.closedSlotSub}>Abra a agenda no controle lateral para aceitar agendamentos</div>
                                </div>
                              </div>
                            ) : (
                              blockedTimeSlots.includes(`${selectedDateStr}-${timeSlot}`) ? (
                                <div className={styles.blockedSlotCard}>
                                  <div className={styles.blockedSlotLeft}>
                                    <div className={styles.blockedSlotIconBadge}>
                                      <Lock size={18} />
                                    </div>
                                    <div className={styles.blockedSlotInfo}>
                                      <div className={styles.blockedSlotTitle}>
                                        Horário Bloqueado
                                        <span className={styles.blockedSlotPill}>Indisponível</span>
                                      </div>
                                      <div className={styles.blockedSlotSub}>
                                        Bloqueado manualmente no controle da agenda
                                      </div>
                                    </div>
                                  </div>
                                  <button 
                                    className={styles.unblockSlotBtn} 
                                    onClick={() => toggleTimeSlot(selectedDateStr, timeSlot)} 
                                    title="Desbloquear este horário"
                                  >
                                    <Unlock size={14} /> Reabrir Horário
                                  </button>
                                </div>
                              ) : (
                                <div className={styles.emptySlotWrapper} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                    <div className={styles.emptySlotCard} onClick={() => handleOpenNewAppt(timeSlot)}>
                                      <div className={styles.emptySlotText}>
                                        <Plus size={15} className={styles.plusIcon} /> Adicionar agendamento
                                      </div>
                                    </div>
                                    <button 
                                      className={styles.blockSlotBtn} 
                                      onClick={() => toggleTimeSlot(selectedDateStr, timeSlot)} 
                                      title="Bloquear este horário"
                                    >
                                      <Ban size={14} />
                                      <span className={styles.blockSlotBtnText}>Bloquear</span>
                                    </button>
                                  </div>

                                  {/* Tag discreta para agendamentos cancelados no horário liberado */}
                                  {canceledAptsInSlot.map(cancAppt => (
                                    <div 
                                      key={cancAppt.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedDetailAppt(cancAppt);
                                      }}
                                      style={{
                                        marginTop: "6px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        background: "#FEF2F2",
                                        border: "1px dashed #FCA5A5",
                                        borderRadius: "10px",
                                        padding: "4px 10px",
                                        fontSize: "0.76rem",
                                        fontWeight: 600,
                                        color: "#991B1B",
                                        cursor: "pointer"
                                      }}
                                      title="Clique para ver os detalhes do agendamento cancelado"
                                    >
                                      <XCircle size={13} color="#EF4444" />
                                      <span>Cancelado: <strong>{cancAppt.clientName}</strong> ({cancAppt.time})</span>
                                      <span style={{ fontSize: "0.7rem", textDecoration: "underline", color: "#DC2626", marginLeft: "4px" }}>Ver detalhes</span>
                                    </div>
                                  ))}
                                </div>
                              )
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div className={styles.card} style={{ padding: 24 }}>
                <div className={styles.agendaControlRow}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>Controle da agenda</div>
                  <button className={styles.blockBtn} onClick={() => setShowBlockModal(true)}>
                    <Ban size={16} /> Bloquear horários
                  </button>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div 
                    className={styles.agendaToggle}
                    onClick={() => toggleDateClosed(selectedDateStr)}
                    title={agendaAberta ? "Clique para fechar a agenda nesta data" : "Clique para abrir a agenda nesta data"}
                  >
                    <div 
                      className={styles.switch} 
                      style={{ background: agendaAberta ? '#22c55e' : '#cbd5e1' }}
                    >
                      <div 
                        className={styles.switchKnob}
                        style={{ transform: agendaAberta ? 'translateX(20px)' : 'translateX(0px)' }}
                      />
                    </div>
                    <span>{agendaAberta ? 'Agenda aberta' : 'Agenda fechada'}</span>
                  </div>
                </div>

                <div style={{ transform: "scale(1)", width: '100%' }}>
                   <Calendar 
                     selectedDate={selectedDate} 
                     onSelectDate={setSelectedDate} 
                     disabledDaysOfWeek={[0, 1]}
                     closedDates={parsedClosedDates}
                     adminMode={true}
                     appointments={appointments}
                   />
                </div>
              </div>

              {/* Card de Fidelidade Especial */}
              <div className={styles.card} style={{ padding: 24, background: 'linear-gradient(135deg, var(--color-accent), #e3b687)', color: '#fff', border: 'none', boxShadow: '0 10px 25px -5px rgba(194, 147, 103, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ padding: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 12 }}>
                    <Gift size={24} color="#fff" />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>Programa de Fidelidade</div>
                </div>
                <div style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: 20 }}>
                  Acompanhe e recompense as clientes que mais visitam o salão.
                </div>
                <button 
                  onClick={() => setActiveTab('loyalty')}
                  style={{ width: '100%', padding: '12px', background: '#fff', color: 'var(--color-accent)', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Gerenciar Pontos
                </button>
              </div>

              {/* Card de Aniversariantes Especial */}
              <div className={styles.card} style={{ padding: 24, background: 'linear-gradient(135deg, #fb7185, #e11d48)', color: '#fff', border: 'none', boxShadow: '0 10px 25px -5px rgba(225, 29, 72, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ padding: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 12 }}>
                    <Sparkles size={24} color="#fff" />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>Aniversariantes do Dia</div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {upcomingBirthdays.map((b, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: 12, backdropFilter: 'blur(4px)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {getInitials(b.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{b.name}</div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Faz aniversário hoje!</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleSendBirthday(b.phone, b.name)}
                        style={{ padding: '6px 14px', background: '#fff', color: '#e11d48', border: 'none', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        Felicitar 🎉
                      </button>

                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "finance" && (
        <div className={styles.mainContent}>
          {/* Subtabs Bar */}
          <div className={styles.finSubTabsRow}>
            <button
              onClick={() => setFinSubTab("transactions")}
              className={`${styles.finSubTabBtn} ${finSubTab === "transactions" ? styles.finSubTabBtnActive : ""}`}
            >
              <PieChart size={18} /> Transações & Cobranças
            </button>

            <button
              onClick={() => setFinSubTab("mp_config")}
              className={`${styles.finSubTabBtn} ${finSubTab === "mp_config" ? styles.finSubTabBtnActive : ""}`}
            >
              <CreditCard size={18} /> Configuração Mercado Pago
              {mpIsConfigured && (
                <span style={{ background: "#10b981", color: "#fff", fontSize: "0.7rem", padding: "2px 6px", borderRadius: "8px" }}>Ativo</span>
              )}
            </button>

            <button
              onClick={() => setFinSubTab("mp_guide")}
              className={`${styles.finSubTabBtn} ${finSubTab === "mp_guide" ? styles.finSubTabBtnActive : ""}`}
            >
              <Sparkles size={18} /> Passo a Passo da API
            </button>
          </div>

          {/* Metrics Overview */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: "var(--color-primary-light)", color: "var(--color-primary-dark)" }}><TrendingUp size={26} /></div>
              <div className={styles.statText}>
                <div className={styles.statValue}>R$ {finTotal},00</div>
                <div className={styles.statLabel}>Faturamento Total</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: "#e6f4ea", color: "#059669" }}><QrCode size={26} /></div>
              <div className={styles.statText}>
                <div className={styles.statValue}>R$ {finPixTotal},00</div>
                <div className={styles.statLabel}>Recebido via Pix</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: "#e0f2fe", color: "#0284c7" }}><CreditCard size={26} /></div>
              <div className={styles.statText}>
                <div className={styles.statValue}>R$ {finCardTotal},00</div>
                <div className={styles.statLabel}>Recebido via Cartão</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: "#FFF3E0", color: "#E65100" }}><Clock size={26} /></div>
              <div className={styles.statText}>
                <div className={styles.statValue}>R$ {finPending},00</div>
                <div className={styles.statLabel}>A Receber (Pendente)</div>
              </div>
            </div>
          </div>

          {/* SUBTAB 1: TRANSAÇÕES */}
          {finSubTab === "transactions" && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <div className={styles.titleIcon}>
                  <PieChart size={24} color="var(--color-primary-dark)" />
                  Gestão de Transações & Cobranças
                </div>
                
                <div className={styles.finFilters}>
                  <div className={styles.finFilterBox}>
                    <Users size={16} color="var(--color-text-muted)" />
                    <select 
                      value={finClientFilter}
                      onChange={(e) => setFinClientFilter(e.target.value)}
                      style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.9rem", color: "var(--color-text-main)", cursor: "pointer" }}
                    >
                      <option value="all">Clientes</option>
                      {uniqueClientsList.map(c => (
                        <option key={c.email} value={c.email}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.finFilterBox}>
                    <Filter size={16} color="var(--color-text-muted)" />
                    <select 
                      value={finDateFilter}
                      onChange={(e) => setFinDateFilter(e.target.value as any)}
                      style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.9rem", color: "var(--color-text-main)", cursor: "pointer" }}
                    >
                      <option value="all">Período</option>
                      <option value="today">Hoje ({selectedDateStr})</option>
                      <option value="yesterday">Ontem</option>
                      <option value="last_7_days">Últimos 7 dias</option>
                      <option value="last_30_days">Últimos 30 dias</option>
                      <option value="this_month">Este Mês</option>
                      <option value="last_month">Mês Passado</option>
                      <option value="this_year">Este Ano</option>
                    </select>
                  </div>
                  
                  <div className={styles.finFilterBox}>
                    <Filter size={16} color="var(--color-text-muted)" />
                    <select 
                      value={finStatusFilter}
                      onChange={(e) => setFinStatusFilter(e.target.value as any)}
                      style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.9rem", color: "var(--color-text-main)", cursor: "pointer" }}
                    >
                      <option value="all">Status</option>
                      <option value="paid">Todos Pagos</option>
                      <option value="paid_pix">Pago no Pix</option>
                      <option value="paid_credit">Pago no Crédito</option>
                      <option value="pending">Em Aberto (Pendente)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.agendaList} style={{ marginTop: "24px" }}>
                {filteredFinances.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)" }}>
                    Nenhuma transação encontrada com os filtros atuais.
                  </div>
                ) : (
                  <>
                    {filteredFinances.slice(0, visibleFinancesCount).map(apt => {
                      const isPaid = apt.paymentStatus.includes('paid');
                      const isRefunded = (apt.paymentStatus as string) === 'refunded';
                      const mpPaymentId = (apt as any).mp_payment_id;

                      return (
                        <div key={apt.id} className={styles.agendaItem} style={{ gridTemplateColumns: "110px 1fr auto", gap: "16px", alignItems: "center" }}>
                          <div className={styles.timeBadge} style={{ fontSize: "0.85rem", background: "var(--color-background)", border: "1px solid var(--color-border)", textAlign: "center" }}>
                            {apt.date}<br/>{apt.time}
                          </div>
                          
                          <div>
                            <div className={styles.clientName} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span>{apt.clientName}</span>
                              {mpPaymentId && (
                                <span style={{ fontSize: "0.72rem", background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                                  MP #{mpPaymentId}
                                </span>
                              )}
                            </div>

                            <div className={styles.serviceInfo} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginTop: "4px" }}>
                              <span style={{ fontWeight: 500 }}>{apt.service}</span>

                              {/* Status Badge */}
                              <span style={{ 
                                color: isRefunded ? '#dc2626' : isPaid ? '#059669' : '#e65100',
                                fontWeight: 700,
                                background: isRefunded ? '#fef2f2' : isPaid ? '#e6f4ea' : '#fff3e0',
                                border: `1px solid ${isRefunded ? '#fecaca' : isPaid ? '#a7f3d0' : '#ffe0b2'}`,
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}>
                                {isRefunded ? 'Reembolsado / Estornado' : apt.paymentStatus === 'paid_pix' ? '⚡ Pago no Pix' : (apt.paymentStatus === 'paid_credit' || apt.paymentStatus === 'paid_debit' || (apt.paymentStatus as string) === 'paid_card') ? '💳 Pago no Cartão' : '⏳ Pendente (A Receber)'}
                              </span>
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--color-primary-dark)" }}>
                              R$ {apt.price},00
                            </div>

                            <div style={{ display: "flex", gap: "6px" }}>
                              {/* Sync Button */}
                              <button
                                type="button"
                                title="Verificar status online no Mercado Pago"
                                disabled={mpActionId === apt.id}
                                onClick={() => handleSyncMpStatus(apt.id, mpPaymentId)}
                                style={{
                                  background: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  color: "#334155",
                                  padding: "4px 10px",
                                  borderRadius: "8px",
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}
                              >
                                <RefreshCw size={12} className={mpActionId === apt.id ? styles.spinner : ""} />
                                <span>Verificar Status</span>
                              </button>

                              {/* Refund Button */}
                              {isPaid && (
                                <button
                                  type="button"
                                  title="Estornar valor no Mercado Pago"
                                  disabled={mpActionId === apt.id}
                                  onClick={() => handleRefundMp(apt.id, mpPaymentId)}
                                  style={{
                                    background: "#fef2f2",
                                    border: "1px solid #fecaca",
                                    color: "#dc2626",
                                    padding: "4px 10px",
                                    borderRadius: "8px",
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    cursor: "pointer"
                                  }}
                                >
                                  Estornar
                                </button>
                              )}

                              {/* Mark as paid toggle if pending */}
                              {!isPaid && !isRefunded && (
                                <button
                                  type="button"
                                  title="Marcar como pago manualmente"
                                  onClick={() => {
                                    updatePayment(apt.id, 'paid_pix');
                                    handleConfirmAndSendWhatsApp(apt);
                                  }}
                                  style={{
                                    background: "#e6f4ea",
                                    border: "1px solid #a7f3d0",
                                    color: "#059669",
                                    padding: "4px 10px",
                                    borderRadius: "8px",
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    cursor: "pointer"
                                  }}
                                >
                                  Marcar Pago
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {filteredFinances.length > visibleFinancesCount && (
                      <div className={styles.loadMoreContainer}>
                        <button
                          className={styles.loadMoreBtn}
                          disabled={isLoadingMoreFinances}
                          onClick={() => {
                            setIsLoadingMoreFinances(true);
                            setTimeout(() => {
                              setVisibleFinancesCount(prev => prev + 10);
                              setIsLoadingMoreFinances(false);
                            }, 600);
                          }}
                        >
                          {isLoadingMoreFinances ? (
                            <>
                              <RefreshCw size={18} className={styles.spinner} />
                              <span>Carregando mais transações...</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown size={18} />
                              <span>Carregar mais ({filteredFinances.length - visibleFinancesCount} restantes)</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* SUBTAB 2: CONFIGURAÇÃO MERCADO PAGO */}
          {finSubTab === "mp_config" && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <div className={styles.titleIcon}>
                  <CreditCard size={24} color="var(--color-primary-dark)" />
                  Credenciais e Configurações da API do Mercado Pago
                </div>
              </div>

              {mpSaveMsg && (
                <div style={{ padding: "14px 18px", borderRadius: "14px", background: mpSaveMsg.includes("✅") ? "#e6f4ea" : "#fef2f2", color: mpSaveMsg.includes("✅") ? "#059669" : "#dc2626", border: "1px solid currentColor", marginBottom: "20px", fontWeight: 600, fontSize: "0.92rem" }}>
                  {mpSaveMsg}
                </div>
              )}

              <form onSubmit={handleSaveMpSettings}>
                <div className={styles.formGrid} style={{ display: "grid", gap: "20px" }}>
                  <div className={styles.formGroup}>
                    <label style={{ fontWeight: 700, color: "#0f172a", marginBottom: "8px", display: "block" }}>
                      Access Token do Mercado Pago (Prod ou Teste)
                    </label>
                    <input
                      type="password"
                      placeholder="APP_USR-0000000000000000-000000-00000000000000000000000000000000-000000000"
                      value={mpAccessToken}
                      onChange={(e) => setMpAccessToken(e.target.value)}
                      style={{ width: "100%", padding: "14px 16px", borderRadius: "14px", border: "1.5px solid #cbd5e1", fontSize: "0.95rem", fontFamily: "monospace" }}
                    />
                    <small style={{ color: "#64748b", marginTop: "6px", display: "block" }}>
                      Obtido em <strong>developers.mercadopago.com</strong> na sua aplicação na aba "Credenciais de Produção" ou "Credenciais de Teste".
                    </small>
                  </div>

                  <div className={styles.formGroup}>
                    <label style={{ fontWeight: 700, color: "#0f172a", marginBottom: "8px", display: "block" }}>
                      Public Key do Mercado Pago
                    </label>
                    <input
                      type="text"
                      placeholder="APP_USR-00000000-0000-0000-0000-000000000000"
                      value={mpPublicKey}
                      onChange={(e) => setMpPublicKey(e.target.value)}
                      style={{ width: "100%", padding: "14px 16px", borderRadius: "14px", border: "1.5px solid #cbd5e1", fontSize: "0.95rem", fontFamily: "monospace" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", background: "#f8fafc", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: 700, color: "#0f172a" }}>
                      <input
                        type="checkbox"
                        checked={mpSandbox}
                        onChange={(e) => setMpSandbox(e.target.checked)}
                        style={{ width: "20px", height: "20px", accentColor: "#b8574c" }}
                      />
                      <span>Modo Sandbox (Ambiente de Testes)</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: 700, color: "#0f172a" }}>
                      <input
                        type="checkbox"
                        checked={mpAutoConfirm}
                        onChange={(e) => setMpAutoConfirm(e.target.checked)}
                        style={{ width: "20px", height: "20px", accentColor: "#b8574c" }}
                      />
                      <span>Confirmar Agendamento Automaticamente ao Pagar</span>
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                    <button
                      type="submit"
                      disabled={mpSaveLoading}
                      className="btn-primary"
                      style={{ padding: "14px 28px", borderRadius: "14px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "8px" }}
                    >
                      {mpSaveLoading ? "Salvando..." : "Salvar Configurações MP"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* SUBTAB 3: PASSO A PASSO DA API DO MERCADO PAGO */}
          {finSubTab === "mp_guide" && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <div className={styles.titleIcon}>
                  <Sparkles size={24} color="var(--color-primary-dark)" />
                  Guia Completo: Como Configurar a API do Mercado Pago
                </div>
              </div>

              <div style={{ display: "grid", gap: "24px", marginTop: "12px" }}>
                {/* Passo 1 */}
                <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#b8574c", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.1rem" }}>
                      1
                    </div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                      Acesse o Portal de Desenvolvedores do Mercado Pago
                    </h3>
                  </div>
                  <p style={{ color: "#475569", lineHeight: 1.6, fontSize: "0.95rem" }}>
                    Acesse <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noreferrer" style={{ color: "#b8574c", fontWeight: 700, textDecoration: "underline" }}>developers.mercadopago.com</a> com sua conta do Mercado Pago onde você deseja receber as vendas.
                  </p>
                </div>

                {/* Passo 2 */}
                <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#b8574c", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.1rem" }}>
                      2
                    </div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                      Crie uma Nova Aplicação
                    </h3>
                  </div>
                  <p style={{ color: "#475569", lineHeight: 1.6, fontSize: "0.95rem", marginBottom: "12px" }}>
                    Clique no botão <strong>"Criar aplicação"</strong> e preencha com as opções:
                  </p>
                  <ul style={{ color: "#334155", paddingLeft: "20px", lineHeight: 1.7, fontSize: "0.92rem" }}>
                    <li><strong>Nome da Aplicação:</strong> Agenday Beauty (ou nome do seu estabelecimento).</li>
                    <li><strong>Tipo de Solução de Pagamento:</strong> Pagamentos Checkout / API Transparente.</li>
                    <li><strong>Modelo de Integração:</strong> Acessar dados da sua conta (Produção).</li>
                  </ul>
                </div>

                {/* Passo 3 */}
                <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#b8574c", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.1rem" }}>
                      3
                    </div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                      Obtenha o Access Token e a Public Key
                    </h3>
                  </div>
                  <p style={{ color: "#475569", lineHeight: 1.6, fontSize: "0.95rem", marginBottom: "12px" }}>
                    No menu lateral da sua aplicação criada, clique em <strong>"Credenciais de Produção"</strong> (ou "Credenciais de Teste" para ambiente Sandbox) e copie os campos:
                  </p>
                  <div style={{ background: "#ffffff", padding: "16px", borderRadius: "14px", border: "1px solid #cbd5e1", fontFamily: "monospace", fontSize: "0.88rem", color: "#0f172a" }}>
                    • Access Token: APP_USR-xxxxxxxxxxxxxxxx...<br/>
                    • Public Key: APP_USR-xxxxxxxx-xxxx-xxxx...
                  </div>
                  <p style={{ color: "#475569", lineHeight: 1.6, fontSize: "0.92rem", marginTop: "12px" }}>
                    Cole estas chaves na aba <strong>"Configuração Mercado Pago"</strong> no formulário acima e clique em salvar!
                  </p>
                </div>

                {/* Passo 4 */}
                <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#b8574c", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.1rem" }}>
                      4
                    </div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                      Configurar Webhooks (Notificações de Pagamento Instantâneo)
                    </h3>
                  </div>
                  <p style={{ color: "#475569", lineHeight: 1.6, fontSize: "0.95rem", marginBottom: "12px" }}>
                    Para que o sistema receba a confirmação do Pix e do Cartão automaticamente mesmo que o cliente feche o navegador, configure a URL de Webhooks nas configurações da sua aplicação no Mercado Pago:
                  </p>
                  <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: "14px", border: "1.5px solid #10b981", fontWeight: 700, color: "#059669", fontFamily: "monospace", fontSize: "0.92rem", wordBreak: "break-all" }}>
                    {typeof window !== "undefined" ? window.location.origin : "https://seu-dominio.com"}/api/mercadopago/webhook
                  </div>
                  <p style={{ color: "#475569", lineHeight: 1.6, fontSize: "0.88rem", marginTop: "10px" }}>
                    Marque os eventos: <code>Pagamentos (payment)</code> e <code>payment.updated</code>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "services" && (
        <div className={styles.mainContent}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <div className={styles.titleIcon}>
                <Layout size={24} color="var(--color-primary-dark)" />
                Catálogo de Serviços
              </div>
              {!showServiceForm && (
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    setEditingServiceId(null);
                    setSrvName("");
                    setSrvDesc("");
                    setSrvPrice("");
                    setSrvDuration("");
                    setSrvImage("");
                    setShowServiceForm(true);
                  }}
                  style={{ fontSize: "0.9rem", padding: "8px 16px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Plus size={18} /> Novo Serviço
                </button>
              )}
            </div>

            {showServiceForm && (
              <div style={{ background: "var(--color-background)", padding: "24px", borderRadius: "20px", marginBottom: "32px", border: "1px solid var(--color-border)", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}>
                <h3 style={{ marginBottom: "16px", color: "var(--color-text-main)", fontSize: "1.2rem", fontWeight: 800 }}>
                  {editingServiceId ? "Editar Serviço" : "Adicionar Novo Serviço"}
                </h3>
                <form onSubmit={handleSaveService} style={{ display: "grid", gap: "16px", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 600 }}>Nome do Serviço</label>
                    <input type="text" value={srvName} onChange={e => setSrvName(e.target.value)} required style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--color-border)" }} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 600 }}>Descrição</label>
                    <textarea value={srvDesc} onChange={e => setSrvDesc(e.target.value)} required style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--color-border)", minHeight: "80px" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 600 }}>Preço (R$)</label>
                    <input type="number" value={srvPrice} onChange={e => setSrvPrice(e.target.value)} required style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--color-border)" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 600 }}>Duração (Minutos)</label>
                    <input type="number" value={srvDuration} onChange={e => setSrvDuration(e.target.value)} required style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--color-border)" }} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 600 }}>Imagem do Serviço</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      {srvImage && (
                        <img src={srvImage} alt="Preview do serviço" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "10px" }} />
                      )}
                      <label style={{ cursor: "pointer", background: "#ffffff", border: "1px solid var(--color-border)", padding: "12px 24px", borderRadius: "10px", fontSize: "0.9rem", color: "var(--color-text-main)", display: "inline-block", fontWeight: 600 }}>
                        <Camera size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "8px" }} />
                        Fazer upload da imagem
                        <input type="file" accept="image/*" onChange={handleServiceImageUpload} style={{ display: "none" }} />
                      </label>
                    </div>
                  </div>
                  <div style={{ gridColumn: "1 / 2" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 600 }}>Nome do(a) Profissional</label>
                    <input type="text" value={srvProfName} onChange={e => setSrvProfName(e.target.value)} placeholder="Ex: Ana Silva" style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--color-border)" }} />
                  </div>
                  <div style={{ gridColumn: "2 / -1" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 600 }}>Foto do(a) Profissional</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      {srvProfPhoto && (
                        <img src={srvProfPhoto} alt="Preview do profissional" style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "50%" }} />
                      )}
                      <label style={{ cursor: "pointer", background: "#ffffff", border: "1px solid var(--color-border)", padding: "12px 24px", borderRadius: "10px", fontSize: "0.9rem", color: "var(--color-text-main)", display: "inline-block", fontWeight: 600 }}>
                        <Camera size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "8px" }} />
                        Fazer upload da foto
                        <input type="file" accept="image/*" onChange={handleProfPhotoUpload} style={{ display: "none" }} />
                      </label>
                    </div>
                  </div>

                  {/* Botoes Lado a Lado: Cancelar e Salvar Serviço */}
                  <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowServiceForm(false);
                        setEditingServiceId(null);
                      }}
                      style={{
                        padding: "14px",
                        borderRadius: "14px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#475569",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <X size={18} /> Cancelar
                    </button>
                    
                    <button 
                      type="submit" 
                      className="btn-primary"
                      style={{
                        padding: "14px",
                        borderRadius: "14px",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px"
                      }}
                    >
                      <CheckCircle2 size={18} /> Salvar Serviço
                    </button>
                  </div>
                </form>
              </div>
            )}


            <div className={styles.serviceCardList}>
              {services.map(service => (
                <div key={service.id} className={styles.adminServiceCard}>
                  <div className={styles.serviceCardLeft}>
                    <img src={service.imageUrl} alt={service.name} className={styles.serviceCardImg} />
                    <div className={styles.serviceCardInfo}>
                      <h3 className={styles.serviceCardTitle}>{service.name}</h3>
                      {service.description && (
                        <p className={styles.serviceCardDesc}>{service.description}</p>
                      )}
                      <div className={styles.serviceCardMetaRow}>
                        <span className={styles.servicePriceBadge}>R$ {service.price},00</span>
                        <span className={styles.serviceDurationBadge}>
                          <Clock size={14} color="#64748b" /> {service.duration} min
                        </span>
                        {service.professionalName && (
                          <span className={styles.serviceProfBadge}>
                            {service.professionalPhotoUrl ? (
                              <img src={service.professionalPhotoUrl} alt={service.professionalName} style={{ width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
                              <UserCircle size={16} />
                            )}
                            {service.professionalName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={styles.serviceCardActions}>
                    <button className={styles.serviceEditBtn} onClick={() => handleEditService(service)} title="Editar serviço">
                      <Edit3 size={18} />
                    </button>
                    <button className={styles.serviceDeleteBtn} onClick={() => deleteService(service.id)} title="Excluir serviço">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {activeTab === "appearance" && (
        <div className={styles.mainContent}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <div className={styles.titleIcon}>
                <ImageIcon size={24} color="var(--color-primary-dark)" />
                Configurações da Página Principal
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSaveAppearance}>
            <div className={styles.settingsGrid}>
              
              {/* Card 1: Informações Básicas */}
              <div className={styles.settingsCard}>
                <div className={styles.settingsHeader}>
                  <div className={styles.settingsHeaderIcon}><Clock size={20} /></div>
                  Informações Básicas
                </div>
                
                <div>
                  <label className={styles.modernLabel}>Horário de Funcionamento</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>Abertura (HH:MM)</span>
                      <input type="text" className={styles.modernInput} value={siteForm.businessStart} onChange={e => setSiteForm({...siteForm, businessStart: e.target.value})} required />
                    </div>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>Fechamento (HH:MM)</span>
                      <input type="text" className={styles.modernInput} value={siteForm.businessEnd} onChange={e => setSiteForm({...siteForm, businessEnd: e.target.value})} required />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "14px" }}>
                  <label className={styles.modernLabel}>Dias de Funcionamento na Semana</label>
                  <div className={styles.workDaysSelector}>
                    {[
                      { id: 1, label: "Seg" },
                      { id: 2, label: "Ter" },
                      { id: 3, label: "Qua" },
                      { id: 4, label: "Qui" },
                      { id: 5, label: "Sex" },
                      { id: 6, label: "Sáb" },
                      { id: 0, label: "Dom" },
                    ].map(day => {
                      const currentDays = siteForm.workDays || [1, 2, 3, 4, 5, 6];
                      const isSelected = currentDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => {
                            const updated = isSelected 
                              ? currentDays.filter(d => d !== day.id)
                              : [...currentDays, day.id];
                            setSiteForm({ ...siteForm, workDays: updated });
                          }}
                          className={`${styles.workDayBtn} ${isSelected ? styles.workDayBtnActive : ""}`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>


                <div style={{ marginTop: "8px" }}>
                  <label className={styles.modernLabel}>WhatsApp (Apenas números)</label>
                  <input type="text" className={styles.modernInput} value={siteForm.whatsappNumber} onChange={e => setSiteForm({...siteForm, whatsappNumber: e.target.value})} placeholder="Ex: 5511999999999" required />
                </div>

                <div style={{ marginTop: "8px" }}>
                  <label className={styles.modernLabel}>Endereço do Salão</label>
                  <input type="text" className={styles.modernInput} value={siteForm.salonAddress} onChange={e => setSiteForm({...siteForm, salonAddress: e.target.value})} placeholder="Ex: Agenday Beauty • Av. Afonso Pena, 1234" required />
                </div>

                <div style={{ marginTop: "8px" }}>
                  <label className={styles.modernLabel}>Link do Google Maps</label>
                  <input type="url" className={styles.modernInput} value={siteForm.mapsLink} onChange={e => setSiteForm({...siteForm, mapsLink: e.target.value})} placeholder="Ex: https://maps.google.com/?q=..." required />
                </div>
              </div>

              {/* Card 2: Identidade Visual */}
              <div className={styles.settingsCard}>
                <div className={styles.settingsHeader}>
                  <div className={styles.settingsHeaderIcon}><Palette size={20} /></div>
                  Identidade Visual
                </div>

                <div>
                  <label className={styles.modernLabel}>Logomarca do Site</label>
                  <div className={styles.imageUploader} onClick={() => document.getElementById('logoImageInput')?.click()} style={{ padding: "16px", minHeight: "120px" }}>
                    {siteForm.logoUrl ? (
                      <>
                        <img src={siteForm.logoUrl} alt="Preview Logo" className={styles.imagePreview} style={{ height: "100px", objectFit: "contain", background: "transparent" }} />
                        <button type="button" className={styles.removeImageBtn} onClick={(e) => { e.stopPropagation(); setSiteForm({...siteForm, logoUrl: ""}); }}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={24} color="#94a3b8" />
                        <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Clique para adicionar a Logo</span>
                      </>
                    )}
                    <input id="logoImageInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const compressed = await compressImage(file, 600, 600, 0.85);
                        setSiteForm(prev => ({ ...prev, logoUrl: compressed }));
                      }
                    }} />
                  </div>
                </div>

                <div>
                  <label className={styles.modernLabel}>Título do Banner</label>
                  <input type="text" className={styles.modernInput} value={siteForm.heroTitle} onChange={e => setSiteForm({...siteForm, heroTitle: e.target.value})} required />
                </div>

                <div>
                  <label className={styles.modernLabel}>Subtítulo do Banner</label>
                  <textarea className={styles.modernInput} style={{ minHeight: "80px", resize: "vertical" }} value={siteForm.heroSubtitle} onChange={e => setSiteForm({...siteForm, heroSubtitle: e.target.value})} required />
                </div>

                <div>
                  <label className={styles.modernLabel}>Imagem de Fundo (Banner)</label>
                  <div className={styles.imageUploader} onClick={() => document.getElementById('heroImageInput')?.click()}>
                    {siteForm.heroImage ? (
                      <>
                        <img src={siteForm.heroImage} alt="Preview Banner" className={styles.imagePreview} />
                        <button type="button" className={styles.removeImageBtn} onClick={(e) => { e.stopPropagation(); setSiteForm({...siteForm, heroImage: ""}); }}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={32} color="#94a3b8" />
                        <span style={{ fontSize: "0.95rem", color: "#64748b", fontWeight: 500 }}>Clique para selecionar</span>
                      </>
                    )}
                    <input id="heroImageInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const compressed = await compressImage(file, 1200, 1200, 0.82);
                        setSiteForm(prev => ({ ...prev, heroImage: compressed }));
                      }
                    }} />
                  </div>
                </div>
              </div>

              {/* Card 3: Conteúdo Adicional */}
              <div className={styles.settingsCard}>
                <div className={styles.settingsHeader}>
                  <div className={styles.settingsHeaderIcon}><Layout size={20} /></div>
                  Conteúdo Adicional
                </div>

                <div>
                  <label className={styles.modernLabel}>Título da Seção "Sobre"</label>
                  <input type="text" className={styles.modernInput} value={siteForm.aboutTitle} onChange={e => setSiteForm({...siteForm, aboutTitle: e.target.value})} required />
                </div>

                <div>
                  <label className={styles.modernLabel}>Texto "Sobre o Espaço"</label>
                  <textarea className={styles.modernInput} style={{ minHeight: "100px", resize: "vertical" }} value={siteForm.aboutText} onChange={e => setSiteForm({...siteForm, aboutText: e.target.value})} required />
                </div>

                <div>
                  <label className={styles.modernLabel}>Imagem "Sobre" (Ao lado do texto)</label>
                  <div className={styles.imageUploader} onClick={() => document.getElementById('aboutImageInput')?.click()}>
                    {siteForm.aboutImage ? (
                      <>
                        <img src={siteForm.aboutImage} alt="Preview Sobre" className={styles.imagePreview} style={{ height: "120px" }} />
                        <button type="button" className={styles.removeImageBtn} onClick={(e) => { e.stopPropagation(); setSiteForm({...siteForm, aboutImage: ""}); }}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={24} color="#94a3b8" />
                        <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 500 }}>Upload de imagem</span>
                      </>
                    )}
                    <input id="aboutImageInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const compressed = await compressImage(file, 1000, 1000, 0.82);
                        setSiteForm(prev => ({ ...prev, aboutImage: compressed }));
                      }
                    }} />

                  </div>
                </div>

                <div style={{ marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                  <label className={styles.modernLabel} style={{ marginBottom: "12px" }}>Passos de Preparação</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {(siteForm.preparationSteps || []).map((step, index) => (
                      <div key={index} className={styles.stepRow}>
                        <div style={{ color: "#cbd5e1", fontWeight: 600, fontSize: "0.9rem", paddingLeft: "4px" }}>{index + 1}.</div>
                        <input 
                          type="text" 
                          className={styles.stepInput}
                          value={step} 
                          onChange={e => {
                            const newSteps = [...(siteForm.preparationSteps || [])];
                            newSteps[index] = e.target.value;
                            setSiteForm({...siteForm, preparationSteps: newSteps});
                          }} 
                          placeholder="Ex: Venha sem maquiagem" 
                        />
                        <button 
                          type="button"
                          className={styles.deleteStepBtn}
                          onClick={() => {
                            const newSteps = [...(siteForm.preparationSteps || [])];
                            newSteps.splice(index, 1);
                            setSiteForm({...siteForm, preparationSteps: newSteps});
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button 
                      type="button" 
                      className={styles.addStepBtn}
                      onClick={() => setSiteForm({...siteForm, preparationSteps: [...(siteForm.preparationSteps || []), ""]})}
                    >
                      <Plus size={16} /> Adicionar Novo Passo
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 4: Tela de Login & Cadastro */}
              <div className={styles.settingsCard}>
                <div className={styles.settingsHeader}>
                  <div className={styles.settingsHeaderIcon}><Sparkles size={20} /></div>
                  Tela de Login & Cadastro
                </div>

                <div>
                  <label className={styles.modernLabel}>Imagem de Fundo da Tela de Login</label>
                  <div className={styles.imageUploader} onClick={() => document.getElementById('loginHeroImageInput')?.click()}>
                    {siteForm.loginHeroImage ? (
                      <>
                        <img src={siteForm.loginHeroImage} alt="Preview Banner Login" className={styles.imagePreview} style={{ height: "120px" }} />
                        <button type="button" className={styles.removeImageBtn} onClick={(e) => { e.stopPropagation(); setSiteForm({...siteForm, loginHeroImage: ""}); }}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={24} color="#94a3b8" />
                        <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 500 }}>Upload de imagem de fundo da tela de login</span>
                      </>
                    )}
                    <input id="loginHeroImageInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const compressed = await compressImage(file, 1200, 1200, 0.85);
                        setSiteForm(prev => ({ ...prev, loginHeroImage: compressed }));
                      }
                    }} />
                  </div>
                </div>

                <div style={{ marginTop: "12px" }}>
                  <label className={styles.modernLabel}>Frase de Destaque da Tela de Login</label>
                  <textarea 
                    className={styles.modernInput} 
                    style={{ minHeight: "80px", resize: "vertical" }} 
                    value={siteForm.loginQuote || ""} 
                    onChange={e => setSiteForm({...siteForm, loginQuote: e.target.value})} 
                    placeholder="Ex: A beleza começa no momento em que você decide ser você mesma."
                  />
                </div>

                <div style={{ marginTop: "12px" }}>
                  <label className={styles.modernLabel}>Autor da Frase</label>
                  <input 
                    type="text" 
                    className={styles.modernInput} 
                    value={siteForm.loginQuoteAuthor || ""} 
                    onChange={e => setSiteForm({...siteForm, loginQuoteAuthor: e.target.value})} 
                    placeholder="Ex: Coco Chanel"
                  />
                </div>
              </div>

              {/* Card 5: Depoimentos de Clientes */}
              <div className={styles.settingsCard}>
                <div className={styles.settingsHeader}>
                  <div className={styles.settingsHeaderIcon}><MessageSquare size={20} /></div>
                  Depoimentos de Clientes
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {(siteForm.testimonials || []).map((testim, index) => (
                    <div key={index} style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", position: "relative" }}>
                      <button 
                        type="button" 
                        onClick={() => {
                          const newT = [...(siteForm.testimonials || [])];
                          newT.splice(index, 1);
                          setSiteForm({...siteForm, testimonials: newT});
                        }} 
                        style={{ position: "absolute", top: "12px", right: "12px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                        title="Excluir Depoimento"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div style={{ marginBottom: "12px", paddingRight: "40px" }}>
                        <label className={styles.modernLabel}>Depoimento / Texto #{index + 1}</label>
                        <textarea 
                          className={styles.modernInput} 
                          style={{ minHeight: "70px", resize: "vertical" }} 
                          value={testim.quote} 
                          onChange={e => {
                            const newT = [...(siteForm.testimonials || [])];
                            newT[index] = { ...newT[index], quote: e.target.value };
                            setSiteForm({...siteForm, testimonials: newT});
                          }} 
                          placeholder="Digite o depoimento da cliente..."
                        />
                      </div>

                      <div>
                        <label className={styles.modernLabel}>Nome da Cliente / Autor</label>
                        <input 
                          type="text" 
                          className={styles.modernInput} 
                          value={testim.author} 
                          onChange={e => {
                            const newT = [...(siteForm.testimonials || [])];
                            newT[index] = { ...newT[index], author: e.target.value };
                            setSiteForm({...siteForm, testimonials: newT});
                          }} 
                          placeholder="Ex: Amanda Guimarães"
                        />
                      </div>
                    </div>
                  ))}

                  <button 
                    type="button" 
                    className={styles.addStepBtn}
                    onClick={() => setSiteForm({
                      ...siteForm, 
                      testimonials: [...(siteForm.testimonials || []), { id: "t_" + Date.now(), quote: "", author: "" }]
                    })}
                  >
                    <Plus size={16} /> Adicionar Novo Depoimento
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.saveActionBar}>


              <button type="submit" className="btn-primary" style={{ padding: "16px 40px", fontSize: "1rem", borderRadius: "14px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 4px 16px rgba(var(--color-primary-rgb), 0.3)" }}>
                <CheckCircle2 size={20} /> Salvar Configurações
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Modal de Edição de Agendamento */}
      {showApptModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className={styles.modal} style={{ background: "var(--color-surface)", padding: "32px", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "500px", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "1.25rem", color: "var(--color-text-main)" }}>
                {editingAppt ? "Editar Agendamento" : "Novo Agendamento"}
              </h2>
              <button onClick={() => setShowApptModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={24} color="var(--color-text-muted)" /></button>
            </div>
            
            <form onSubmit={handleSaveApptEdit} style={{ display: "grid", gap: "16px" }}>
              <div style={{ position: "relative" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 500 }}>
                  Nome do Cliente <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(Buscar no banco ou digitar avulso)</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input 
                    type="text" 
                    value={apptClientName} 
                    onChange={e => {
                      setApptClientName(e.target.value);
                      setShowClientSuggestions(true);
                    }} 
                    onFocus={() => setShowClientSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                    placeholder="Digite para buscar cliente ou criar novo..."
                    required 
                    style={{ 
                      width: "100%", 
                      padding: "12px 36px 12px 14px", 
                      borderRadius: "8px", 
                      border: "1px solid var(--color-border)",
                      fontSize: "0.95rem",
                      background: "var(--color-surface)",
                      color: "var(--color-text-main)",
                      outline: "none"
                    }} 
                    autoComplete="off"
                  />
                  {apptClientName ? (
                    <button
                      type="button"
                      onClick={() => { setApptClientName(""); setShowClientSuggestions(true); }}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-text-muted)",
                        padding: 0
                      }}
                    >
                      <X size={16} />
                    </button>
                  ) : (
                    <Search 
                      size={16} 
                      style={{ 
                        position: "absolute", 
                        right: "12px", 
                        top: "50%", 
                        transform: "translateY(-50%)", 
                        color: "var(--color-text-muted)",
                        pointerEvents: "none"
                      }} 
                    />
                  )}
                </div>

                {showClientSuggestions && (
                  (() => {
                    const query = apptClientName.trim().toLowerCase();
                    const filtered = allClientSuggestions.filter(c => {
                      if (!query) return true;
                      return (
                        c.name.toLowerCase().includes(query) ||
                        (c.email && c.email.toLowerCase().includes(query)) ||
                        (c.phone && c.phone.includes(query))
                      );
                    });

                    if (filtered.length === 0) {
                      return (
                        <div style={{ 
                          position: "absolute", 
                          top: "100%", 
                          left: 0, 
                          right: 0, 
                          background: "var(--color-surface)", 
                          border: "1px solid var(--color-border)", 
                          borderRadius: "8px", 
                          marginTop: "6px", 
                          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", 
                          zIndex: 100,
                          padding: "12px",
                          fontSize: "0.85rem",
                          color: "var(--color-text-muted)",
                          textAlign: "center"
                        }}>
                          Nenhum cliente cadastrado com esse nome. Pode continuar digitando para cadastrar avulso.
                        </div>
                      );
                    }

                    return (
                      <div style={{ 
                        position: "absolute", 
                        top: "100%", 
                        left: 0, 
                        right: 0, 
                        background: "var(--color-surface)", 
                        border: "1px solid var(--color-border)", 
                        borderRadius: "10px", 
                        marginTop: "6px", 
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)", 
                        zIndex: 100,
                        maxHeight: "220px",
                        overflowY: "auto"
                      }}>
                        <div style={{ padding: "8px 12px 4px", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-primary-dark)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {query ? "Resultados no Banco de Dados" : "Clientes Cadastrados"}
                        </div>
                        {filtered.map(client => (
                          <div 
                            key={client.name}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setApptClientName(client.name);
                              setShowClientSuggestions(false);
                            }}
                            style={{ 
                              padding: "10px 12px", 
                              cursor: "pointer", 
                              borderBottom: "1px solid var(--color-border)", 
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "10px",
                              transition: "background 0.15s ease"
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = "var(--color-primary-light)")}
                            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{ 
                                width: "30px", 
                                height: "30px", 
                                borderRadius: "50%", 
                                background: "var(--color-primary-light)", 
                                color: "var(--color-primary-dark)", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                fontWeight: 600,
                                fontSize: "0.85rem",
                                flexShrink: 0
                              }}>
                                <User size={15} />
                              </div>
                              <div>
                                <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--color-text-main)" }}>
                                  {client.name}
                                </div>
                                {(client.email || client.phone) && (
                                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                                    {[client.phone, client.email].filter(Boolean).join(" • ")}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span style={{ fontSize: "0.8rem", color: "var(--color-primary-dark)", fontWeight: 500 }}>Selecionar</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Data (DD/MM/AAAA)</label>
                  <input type="text" value={apptDate} onChange={e => setApptDate(e.target.value)} required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Início</label>
                    <input type="text" value={apptTime} onChange={handleTimeChange} required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Final</label>
                    <input type="text" value={apptEndTime} onChange={e => setApptEndTime(e.target.value)} required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }} />
                  </div>
                </div>
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Serviço(s)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                  {services.length === 0 && <span style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>Nenhum serviço cadastrado.</span>}
                  {services.map(s => {
                    const isSelected = apptSelectedServices.includes(s.name);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setApptSelectedServices(prev => prev.filter(name => name !== s.name));
                          } else {
                            setApptSelectedServices(prev => [...prev, s.name]);
                          }
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          border: `1px solid ${isSelected ? "var(--color-primary-dark)" : "var(--color-border)"}`,
                          background: isSelected ? "var(--color-primary-light)" : "var(--color-surface)",
                          color: isSelected ? "var(--color-primary-dark)" : "var(--color-text)",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          fontWeight: isSelected ? 600 : 400,
                          transition: "all 0.2s"
                        }}
                      >
                        {s.name} (R$ {s.price})
                      </button>
                    )
                  })}
                </div>
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Valor Total (R$)</label>
                <input type="number" value={apptPrice} onChange={e => setApptPrice(e.target.value)} required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }} />
              </div>
              
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Status do Pagamento</label>
                <select value={apptPaymentStatus} onChange={e => setApptPaymentStatus(e.target.value)} required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-main)" }}>
                  <option value="open">Aguardando Pagamento / No Salão</option>
                  <option value="paid_pix">Pago (Pix)</option>
                  <option value="paid_credit">Pago (Cartão de Crédito)</option>
                  <option value="paid_debit">Pago (Cartão de Débito)</option>
                </select>
              </div>
              
              <div style={{ textAlign: "right", marginTop: "16px" }}>
                <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {activeTab === "loyalty" && (
        <div className={styles.loyaltyWrapper}>
          
          {/* Main Header Row */}
          <div className={styles.loyaltyHeaderRow}>
            <div className={styles.loyaltyHeaderLeft}>
              <div style={{ width: "48px", height: "48px", backgroundColor: "#fff0eb", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Gift size={28} color="#f97316" />
              </div>
              <div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Programa de Fidelidade</h1>
                <p style={{ fontSize: "0.95rem", color: "#6b7280", margin: "4px 0 0 0" }}>Transforme visitas em clientes recorrentes.</p>
              </div>
            </div>
            <div className={styles.loyaltyHeaderRight}>
              <button 
                onClick={() => updateLoyaltySettings({ isActive: !loyaltySettings.isActive })}
                style={{ 
                  display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", 
                  backgroundColor: loyaltySettings.isActive !== false ? "#f0fdf4" : "#fef2f2", 
                  borderRadius: "24px", 
                  color: loyaltySettings.isActive !== false ? "#15803d" : "#b91c1c", 
                  fontWeight: 500, fontSize: "0.9rem", 
                  border: loyaltySettings.isActive !== false ? "1px solid #bbf7d0" : "1px solid #fecaca", 
                  whiteSpace: "nowrap", cursor: "pointer", transition: "all 0.2s" 
                }}
              >
                <div style={{ 
                  width: "8px", height: "8px", 
                  backgroundColor: loyaltySettings.isActive !== false ? "#22c55e" : "#ef4444", 
                  borderRadius: "50%",
                  boxShadow: loyaltySettings.isActive !== false ? "0 0 6px rgba(34, 197, 94, 0.4)" : "none"
                }}></div>
                {loyaltySettings.isActive !== false ? "Programa ativo" : "Programa pausado"}
              </button>
              <button 
                onClick={handleEditLoyaltyClick}
                style={{ backgroundColor: "#fb7185", color: "#ffffff", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(251, 113, 133, 0.2)" }}>
                <Edit3 size={18} /> Editar regras
              </button>
            </div>
          </div>

          {/* KPI Cards Row */}
          <div className={styles.loyaltyKpiGrid}>
            {[
              { title: "Clientes participantes", value: loyaltyParticipantsCount.toString(), sub: "Total de clientes ativos", subColor: "#6b7280", icon: <Users size={24} color="#f97316" /> },
              { title: "Próximos do prêmio", value: closeToPrizeCount.toString(), sub: "1 ou 2 visitas", subColor: "#6b7280", icon: <Star size={24} color="#f97316" /> },
              { title: "Resgates totais", value: claimsThisMonth.toString(), sub: "Prêmios resgatados", subColor: "#16a34a", icon: <RefreshCw size={24} color="#f97316" /> },
              { title: "Taxa de conclusão", value: `${completionRate}%`, sub: "Clientes premiados", subColor: "#6b7280", icon: <PieChart size={24} color="#f97316" /> },
            ].map((kpi, idx) => (
              <div key={idx} className={styles.loyaltyKpiCard}>
                <div className={styles.loyaltyKpiIconContainer}>
                  {kpi.icon}
                </div>
                <div className={styles.loyaltyKpiContent}>
                  <span className={styles.loyaltyKpiTitle}>{kpi.title}</span>
                  <div className={styles.loyaltyKpiValueWrapper}>
                    <span className={styles.loyaltyKpiValue}>{kpi.value}</span>
                  </div>
                  <span className={styles.loyaltyKpiSub} style={{ color: kpi.subColor }}>{kpi.sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Middle Row: Active Reward & Quick Config */}
          <div className={styles.loyaltyMiddleGrid}>
            
            {/* Recompensa ativa */}
            <div className={styles.loyaltyCard}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", marginBottom: "24px", marginTop: 0 }}>Recompensa ativa</h3>
              
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#ef4444", margin: "0 0 8px 0" }}>{loyaltySettings.prizeName || "50% de desconto"}</h2>
                <p style={{ color: "#6b7280", margin: 0, fontSize: "0.95rem" }}>Liberado após {loyaltySettings.stampsRequired || 7} serviços concluídos</p>
              </div>

              {/* Progress Bar Visual */}
              <div style={{ position: "relative", display: "flex", justifyContent: "space-between", marginBottom: "32px", padding: "0 16px", overflowX: "auto", minHeight: "80px", gap: "16px" }}>
                <div style={{ position: "absolute", top: "50%", left: "32px", right: "32px", height: "4px", backgroundColor: "#fecaca", transform: "translateY(-50%)", zIndex: 1, minWidth: "100%" }}></div>
                
                {/* Dots */}
                {[...Array(loyaltySettings.stampsRequired || 7)].map((_, i) => {
                  const isCompleted = i < Math.floor((loyaltySettings.stampsRequired || 7) / 2);
                  const isCurrent = i === Math.floor((loyaltySettings.stampsRequired || 7) / 2);
                  const isPrize = i === (loyaltySettings.stampsRequired || 7) - 1;
                  
                  return (
                    <div key={i} style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <div style={{ 
                        width: "36px", height: "36px", borderRadius: "50%", 
                        backgroundColor: isCompleted ? "#f97316" : "#ffffff", 
                        border: isCompleted ? "none" : `2px solid ${isPrize ? "#9ca3af" : "#f97316"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: isCompleted ? "#ffffff" : "#f97316",
                        fontWeight: 700
                      }}>
                        {isCompleted && <CheckCircle2 size={20} />}
                        {isCurrent && "6"}
                        {isPrize && <Gift size={18} color="#9ca3af" />}
                      </div>
                      <span style={{ fontSize: "0.8rem", color: "#6b7280", position: "absolute", top: "44px", whiteSpace: "nowrap" }}>
                        {i === 0 ? "Início" : isCurrent ? `${i + 1} carimbos` : isPrize ? "Prêmio" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Info pills */}
              <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "32px", marginTop: "48px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#fff5f0", padding: "8px 16px", borderRadius: "24px", color: "#57534e", fontSize: "0.85rem", fontWeight: 500 }}>
                  <Users size={14} color="#f97316" /> 1 serviço = 1 carimbo
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#fff5f0", padding: "8px 16px", borderRadius: "24px", color: "#57534e", fontSize: "0.85rem", fontWeight: 500 }}>
                  <CalendarDays size={14} color="#f97316" /> Validade: {loyaltySettings.expirationDays || 90} dias
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#fff5f0", padding: "8px 16px", borderRadius: "24px", color: "#57534e", fontSize: "0.85rem", fontWeight: 500 }}>
                  <RefreshCw size={14} color="#f97316" /> Resgate automático
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <button onClick={() => setShowLoyaltyPreview(true)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", color: "#374151", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                  <Eye size={18} /> Ver prévia do cliente
                </button>
              </div>
            </div>

            {/* Configuração rápida */}
            <div className={styles.loyaltyCard} style={{ display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", marginBottom: "24px", marginTop: 0 }}>Configuração rápida</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6", paddingBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#4b5563", fontSize: "0.95rem" }}>
                    <Gift size={18} /> Prêmio
                  </div>
                  <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.95rem" }}>{loyaltySettings.prizeName || "50% de desconto"}</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6", paddingBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#4b5563", fontSize: "0.95rem" }}>
                    <Users size={18} /> Carimbos necessários
                  </div>
                  <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.95rem" }}>{loyaltySettings.stampsRequired || 7}</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6", paddingBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#4b5563", fontSize: "0.95rem" }}>
                    <Clock size={18} /> Quando contabilizar
                  </div>
                  <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.95rem" }}>Serviço concluído</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6", paddingBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#4b5563", fontSize: "0.95rem" }}>
                    <CalendarDays size={18} /> Expiração
                  </div>
                  <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.95rem" }}>{loyaltySettings.expirationDays || 90} dias</div>
                </div>
              </div>

              <div style={{ marginTop: "24px" }}>
                <button 
                  onClick={handleEditLoyaltyClick}
                  style={{ padding: "10px 24px", backgroundColor: "#ffffff", border: "1px solid #fb923c", borderRadius: "8px", color: "#f97316", fontWeight: 600, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff7ed'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                  <Settings size={18} /> Alterar configuração
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#16a34a", fontSize: "0.85rem", marginTop: "16px", fontWeight: 500 }}>
                  <CheckCircle2 size={14} /> Salvamento automático
                </div>
              </div>
            </div>
          </div>

          {/* Clientes mais próximos do prêmio */}
          <div className={styles.loyaltyCard} style={{ marginBottom: "32px" }}>
            <div className={styles.loyaltyHeaderRow} style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", margin: 0 }}>Clientes mais próximos do prêmio</h3>
              <div className={styles.loyaltySearchFilter}>
                <div style={{ position: "relative" }}>
                  <Search size={16} color="#9ca3af" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                  <input 
                    type="text" 
                    placeholder="Buscar cliente" 
                    value={loyaltySearch}
                    onChange={(e) => setLoyaltySearch(e.target.value)}
                    style={{ padding: "8px 16px 8px 36px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "0.9rem", width: "200px" }} 
                  />
                </div>
                <select 
                  value={loyaltySort}
                  onChange={(e) => setLoyaltySort(e.target.value)}
                  style={{ padding: "8px 16px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "0.9rem", color: "#374151", backgroundColor: "#ffffff", cursor: "pointer" }}>
                  <option value="closest">Mais próximos</option>
                  <option value="recent">Mais recentes</option>
                </select>
                <button 
                  onClick={() => setShowAllLoyaltyClients(!showAllLoyaltyClients)}
                  style={{ background: "none", border: "none", color: "#f97316", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
                  {showAllLoyaltyClients ? "Ver menos" : "Ver todos"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {displayLoyaltyClients.map((client, idx) => (
                <div key={idx} className={styles.loyaltyClientRow} style={{ borderBottom: idx < displayLoyaltyClients.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                  <div className={styles.loyaltyClientRowLeft}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#e0e7ff", color: "#4338ca", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0 }}>
                      {getInitials(client.clientName)}
                    </div>
                    <span style={{ fontWeight: 600, color: "#111827", fontSize: "0.95rem" }}>{client.clientName}</span>
                  </div>
                  
                  <div className={styles.loyaltyClientRowMiddle}>
                    {client.completedAppointments} serviços
                  </div>

                  <div className={styles.loyaltyClientRowRight}>
                    {client.availablePrizes > 0 ? (
                      <>
                        <div style={{ flex: 1, height: "8px", backgroundColor: "#f3f4f6", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: "100%", height: "100%", backgroundColor: "#10b981", borderRadius: "4px" }}></div>
                        </div>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#10b981", minWidth: "40px", whiteSpace: "nowrap" }}>Prêmio!</span>
                      </>
                    ) : (
                      <>
                        <div style={{ flex: 1, height: "8px", backgroundColor: "#f3f4f6", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${(client.stamps / (loyaltySettings.stampsRequired || 7)) * 100}%`, height: "100%", backgroundColor: "#f97316", borderRadius: "4px" }}></div>
                        </div>
                        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151", minWidth: "40px", whiteSpace: "nowrap" }}>{client.stamps} de {loyaltySettings.stampsRequired || 7}</span>
                      </>
                    )}
                  </div>

                  {client.availablePrizes > 0 ? (
                    <button 
                      onClick={() => {
                        claimPrize(client.clientEmail, client.clientName);
                      }}
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", border: "1px solid #10b981", borderRadius: "8px", backgroundColor: "#ecfdf5", color: "#059669", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d1fae5'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ecfdf5'}>
                      <Gift size={14} /> Resgatar Prêmio
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        const clientPhone = clients.find(c => c.email === client.clientEmail)?.phone || "5511999999999";
                        const remaining = (loyaltySettings.stampsRequired || 7) - client.stamps;
                        window.open(`https://wa.me/${clientPhone}?text=Olá ${client.clientName}! Faltam apenas ${remaining} visitas para seu prêmio!`, '_blank');
                      }}
                      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", border: "1px solid #fcd34d", borderRadius: "8px", backgroundColor: "#fffbeb", color: "#d97706", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef3c7'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fffbeb'}>
                      <Send size={14} /> Enviar lembrete
                    </button>
                  )}
                </div>
              ))}
              {displayLoyaltyClients.length === 0 && (
                <div style={{ padding: "16px 0", color: "#6b7280", textAlign: "center" }}>Nenhum cliente encontrado.</div>
              )}
            </div>
          </div>

          {/* Bottom Row */}
          <div className={styles.loyaltyBottomGrid}>
            
            {/* Resgates recentes */}
            <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f3f4f6" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", marginBottom: "20px", marginTop: 0 }}>Resgates recentes</h3>
              <div className={styles.loyaltyTableWrapper}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "400px" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", paddingBottom: "12px", color: "#6b7280", fontSize: "0.85rem", fontWeight: 600, borderBottom: "1px solid #f3f4f6" }}>Cliente</th>
                    <th style={{ textAlign: "left", paddingBottom: "12px", color: "#6b7280", fontSize: "0.85rem", fontWeight: 600, borderBottom: "1px solid #f3f4f6" }}>Recompensa</th>
                    <th style={{ textAlign: "left", paddingBottom: "12px", color: "#6b7280", fontSize: "0.85rem", fontWeight: 600, borderBottom: "1px solid #f3f4f6" }}>Data</th>
                    <th style={{ textAlign: "left", paddingBottom: "12px", color: "#6b7280", fontSize: "0.85rem", fontWeight: 600, borderBottom: "1px solid #f3f4f6" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loyaltyClaims.slice(0, 3).map((claim, idx) => (
                    <tr key={claim.id}>
                      <td style={{ padding: "16px 0", borderBottom: idx < 2 ? "1px solid #f3f4f6" : "none", fontSize: "0.9rem", color: "#374151" }}>{claim.clientName}</td>
                      <td style={{ padding: "16px 0", borderBottom: idx < 2 ? "1px solid #f3f4f6" : "none", fontSize: "0.9rem", color: "#6b7280" }}>{claim.prizeName}</td>
                      <td style={{ padding: "16px 0", borderBottom: idx < 2 ? "1px solid #f3f4f6" : "none", fontSize: "0.9rem", color: "#6b7280" }}>{claim.date}</td>
                      <td style={{ padding: "16px 0", borderBottom: idx < 2 ? "1px solid #f3f4f6" : "none" }}>
                        <span style={{ padding: "4px 8px", backgroundColor: "#dcfce7", color: "#16a34a", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600 }}>Resgatado</span>
                      </td>
                    </tr>
                  ))}
                  {loyaltyClaims.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: "16px 0", color: "#6b7280", textAlign: "center", fontSize: "0.9rem" }}>Nenhum resgate recente.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>

            {/* Automação inteligente */}
            <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f3f4f6", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
              <div style={{ width: "56px", height: "56px", backgroundColor: "#fff5f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
                <Sparkles size={28} color="#f97316" />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", marginBottom: "12px", marginTop: 0 }}>Automação inteligente</h3>
              <p style={{ color: "#6b7280", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "24px", marginTop: 0 }}>
                12 clientes estão perto de ganhar. Envie um lembrete para aumentar o retorno.
              </p>
              <button style={{ backgroundColor: "#fb7185", color: "#ffffff", padding: "12px 24px", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(251, 113, 133, 0.2)" }}>
                <Send size={18} /> Criar campanha
              </button>
            </div>

          </div>


        </div>
      )}

      {activeTab === "users" && (
        <div className={styles.mainContent}>
          <div className={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 className={styles.cardTitle} style={{ margin: 0 }}>CRM de Clientes</h2>
              <button 
                onClick={handleOpenNewClientModal} 
                className="btn-primary" 
                style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, borderRadius: "8px", background: "var(--color-primary)", color: "white", border: "none", cursor: "pointer" }}
              >
                <Plus size={18} /> Novo Cliente
              </button>
            </div>


            <div className={styles.agendaList}>
              {clients.length === 0 ? (
                <div className={styles.emptyState}>Nenhum cliente registrado ainda.</div>
              ) : (
                clients.map(client => {
                  const clientAppts = appointments.filter(a => a.clientEmail?.toLowerCase() === client.email?.toLowerCase());
                  const ltv = clientAppts.filter(a => a.status !== 'canceled' && (a.status === 'completed' || a.paymentStatus.includes('paid'))).reduce((acc, curr) => acc + curr.price, 0);

                  return (
                    <div key={client.id} className={styles.clientCardItem}>
                      <div className={styles.clientMainInfo}>
                        {client.photoUrl ? (
                          <img src={client.photoUrl} alt={client.name} className={styles.clientAvatar} />
                        ) : (
                          <div className={styles.clientAvatarFallback}>
                            {getInitials(client.name)}
                          </div>
                        )}

                        <div className={styles.clientDetails}>
                          <div className={styles.clientNameRow}>
                            <span className={styles.clientNameText}>{client.name}</span>
                            <span className={client.status === 'inactive' ? styles.clientStatusInactive : styles.clientStatusActive}>
                              {client.status === 'inactive' ? 'Inativo' : 'Ativo'}
                            </span>
                          </div>

                          <div className={styles.clientMetaRow}>
                            <span className={styles.clientMetaItem}>
                              <Mail size={13} color="#64748b" /> {client.email}
                            </span>
                            {client.phone && (
                              <span className={styles.clientMetaItem}>
                                <Phone size={13} color="#64748b" /> {client.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={styles.clientCardFooter}>
                        <div className={styles.clientMetricsContainer}>
                          <div className={styles.clientMetricChip}>
                            <CalendarDays size={14} color="#64748b" />
                            <span><strong>{clientAppts.length}</strong> {clientAppts.length === 1 ? 'agendamento' : 'agendamentos'}</span>
                          </div>
                          <div className={styles.clientMetricChip}>
                            <DollarSign size={14} color="#16a34a" />
                            <span style={{ color: '#15803d' }}><strong>R$ {ltv},00</strong> gastos</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => setSelectedClientId(client.id)}
                          className={styles.clientProfileBtn}
                        >
                          <span>Ver Perfil</span>
                          <User size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {selectedClientId && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div className={styles.modal} style={{ background: "var(--color-background)", padding: "32px", borderRadius: "16px", width: "90%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            {(() => {
              const client = clients.find(c => c.id === selectedClientId);
              if (!client) return null;
              
              const parseDateString = (dStr?: string, tStr?: string) => {
                if (!dStr) return 0;
                const p = dStr.split('/');
                if (p.length !== 3) return 0;
                const [h, m] = (tStr && tStr.includes(':')) ? tStr.split(':').map(Number) : [0, 0];
                return new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10), h || 0, m || 0).getTime();
              };
              const clientAppts = appointments
                .filter(a => a.clientEmail?.toLowerCase() === client.email?.toLowerCase())
                .sort((a, b) => parseDateString(b.date, b.time) - parseDateString(a.date, a.time));

              const ltv = clientAppts.filter(a => a.status !== 'canceled' && (a.status === 'completed' || a.paymentStatus.includes('paid'))).reduce((acc, curr) => acc + curr.price, 0);
              const stats = getUserStats(client.email);

              return (
                <>
                  <div style={{ position: "relative", marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid #e2e8f0" }}>
                    {/* Botão de Fechar no topo superior direito */}
                    <button 
                      onClick={() => setSelectedClientId(null)} 
                      style={{ 
                        position: "absolute", 
                        top: 0, 
                        right: 0, 
                        background: "#f1f5f9", 
                        border: "none", 
                        borderRadius: "50%", 
                        width: "36px", 
                        height: "36px", 
                        cursor: "pointer", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        color: "#64748b",
                        transition: "all 0.2s ease"
                      }}
                      title="Fechar"
                    >
                      <X size={20} />
                    </button>

                    {/* Dados do Cliente */}
                    <div style={{ display: "flex", gap: "16px", alignItems: "center", paddingRight: "44px" }}>
                      {client.photoUrl ? (
                        <img src={client.photoUrl} alt={client.name} style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }} />
                      ) : (
                        <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, var(--color-primary-light, #fdf2f0), #ffffff)", color: "var(--color-primary-dark, #a85145)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1.8rem", border: "2px solid rgba(200, 109, 81, 0.3)" }}>
                          {getInitials(client.name)}
                        </div>
                      )}
                      <div>
                        <h2 style={{ fontSize: "1.35rem", color: "#1e293b", margin: 0, fontWeight: 800, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          {client.name}
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "3px 8px", borderRadius: "10px", background: client.status === 'inactive' ? '#f1f5f9' : '#dcfce7', color: client.status === 'inactive' ? '#64748b' : '#15803d', border: client.status === 'inactive' ? '1px solid #cbd5e1' : '1px solid #bbf7d0' }}>
                            {client.status === 'inactive' ? 'Inativo' : 'Ativo'}
                          </span>
                        </h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "6px", fontSize: "0.85rem", color: "#64748b" }}>
                          {client.email && <span>📧 {client.email}</span>}
                          {client.phone && <span>📱 {client.phone}</span>}
                          {client.address && <span>📍 {client.address}</span>}
                          {client.birthDate && <span>🎂 {new Date(client.birthDate).toLocaleDateString("pt-BR")}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Botoes de Acao Organizados em Grid Ultra Moderno */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "20px" }}>
                      <button 
                        onClick={() => {
                          const newStatus = client.status === 'inactive' ? 'active' : 'inactive';
                          setConfirmModal({
                            open: true,
                            title: `${newStatus === 'inactive' ? 'Inativar' : 'Reativar'} Perfil`,
                            message: `Deseja realmente ${newStatus === 'inactive' ? 'inativar' : 'reativar'} o perfil de ${client.name}?`,
                            confirmText: `Sim, ${newStatus === 'inactive' ? 'Inativar' : 'Reativar'}`,
                            variant: newStatus === 'inactive' ? 'warning' : 'primary',
                            onConfirm: () => {
                              updateClient(client.id, { status: newStatus });
                            }
                          });
                        }} 
                        style={{ 
                          padding: "10px 8px", 
                          borderRadius: "12px", 
                          border: client.status === 'inactive' ? "1px solid #bbf7d0" : "1px solid #e2e8f0", 
                          background: client.status === 'inactive' ? "#f0fdf4" : "#f8fafc", 
                          color: client.status === 'inactive' ? "#166534" : "#475569", 
                          fontWeight: 700, 
                          fontSize: "0.85rem", 
                          cursor: "pointer", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center", 
                          gap: "6px",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <Power size={15} /> {client.status === 'inactive' ? 'Ativar' : 'Inativar'}
                      </button>

                      <button 
                        onClick={() => handleEditClientClick(client)} 
                        style={{ 
                          padding: "10px 8px", 
                          borderRadius: "12px", 
                          border: "1px solid #93c5fd", 
                          background: "#eff6ff", 
                          color: "#1d4ed8", 
                          fontWeight: 700, 
                          fontSize: "0.85rem", 
                          cursor: "pointer", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center", 
                          gap: "6px",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <Edit3 size={15} /> Editar
                      </button>

                      <button 
                        onClick={() => handleDeleteClient(client.id)} 
                        style={{ 
                          padding: "10px 8px", 
                          borderRadius: "12px", 
                          border: "1px solid #fecaca", 
                          background: "#fef2f2", 
                          color: "#dc2626", 
                          fontWeight: 700, 
                          fontSize: "0.85rem", 
                          cursor: "pointer", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center", 
                          gap: "6px",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <Trash2 size={15} /> Excluir
                      </button>
                    </div>
                  </div>


                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
                    <div style={{ padding: "20px", background: "var(--color-surface)", borderRadius: "12px", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>Total Gasto (LTV)</div>
                      <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--color-primary-dark)" }}>R$ {ltv},00</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "4px" }}>em {clientAppts.length} agendamento(s)</div>
                    </div>
                    
                    <div style={{ padding: "20px", background: "var(--color-primary-light)", borderRadius: "12px", border: "1px solid var(--color-primary)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div style={{ fontSize: "0.9rem", color: "var(--color-primary-dark)", marginBottom: "4px", fontWeight: 600 }}>Status de Fidelidade</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary-dark)" }}>{stats.stamps} / {loyaltySettings.stampsRequired} <span style={{ fontSize: "1rem" }}>Carimbos</span></div>
                      <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "4px" }}>{stats.availablePrizes} Prêmio(s) Disponível(eis)</div>
                    </div>
                  </div>

                  <h3 style={{ fontSize: "1.2rem", color: "var(--color-text)", marginBottom: "16px" }}>Histórico de Agendamentos</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {clientAppts.length === 0 && (
                      <div className={styles.emptyState}>Nenhum agendamento encontrado para este cliente.</div>
                    )}
                    {clientAppts.map(apt => (
                      <div key={apt.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", border: "1px solid var(--color-border)", borderRadius: "8px", background: "var(--color-surface)" }}>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "1.1rem" }}>{apt.service}</div>
                          <div style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", marginTop: "4px" }}>{apt.date} às {apt.time}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "1.1rem" }}>R$ {apt.price},00</div>
                          <div style={{ fontSize: "0.75rem", padding: "4px 8px", borderRadius: "4px", display: "inline-block", marginTop: "8px", fontWeight: 600, textTransform: "uppercase",
                            background: apt.status === 'completed' ? '#E8F5E9' : apt.status === 'confirmed' ? '#DCFCE7' : apt.status === 'canceled' ? '#FFEBEE' : '#FEF3C7',
                            color: apt.status === 'completed' ? '#2E7D32' : apt.status === 'confirmed' ? '#15803D' : apt.status === 'canceled' ? '#C62828' : '#B45309'
                          }}>
                            {apt.status === 'completed' ? 'Concluído' : apt.status === 'canceled' ? 'Cancelado' : apt.status === 'confirmed' ? 'Confirmado' : apt.status === 'rescheduled' ? 'Remarcado' : 'Pendente'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {showEditClientModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1100 }}>
          <div className={styles.modal} style={{ background: "var(--color-background)", padding: "32px", borderRadius: "16px", width: "90%", maxWidth: "500px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "1.5rem", color: "var(--color-text)", margin: 0 }}>
                {clientForm.id ? "Editar Cliente" : "Novo Cliente"}
              </h2>
              <button onClick={() => setShowEditClientModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                <X size={24} color="var(--color-text-muted)" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <div style={{ position: "relative", width: "100px", height: "100px" }}>
                  {clientForm.photoUrl ? (
                    <img src={clientForm.photoUrl} alt="Foto" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--color-primary-light)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: "bold" }}>
                      {getInitials(clientForm.name || "C")}
                    </div>
                  )}
                  <label style={{ position: "absolute", bottom: 0, right: 0, background: "var(--color-primary)", color: "white", padding: "8px", borderRadius: "50%", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
                    <Camera size={16} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: "none" }} 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setClientForm({...clientForm, photoUrl: reader.result as string});
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 500 }}>Nome Completo *</label>
                <input type="text" value={clientForm.name || ""} onChange={e => setClientForm({...clientForm, name: e.target.value})} required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 500 }}>E-mail *</label>
                <input type="email" value={clientForm.email || ""} onChange={e => setClientForm({...clientForm, email: e.target.value})} required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 500 }}>Senha de Acesso *</label>
                <input 
                  type="password" 
                  value={clientForm.password || ""} 
                  onChange={e => setClientForm({...clientForm, password: e.target.value})} 
                  required={!clientForm.id} 
                  placeholder="Defina a senha do cliente" 
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }} 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 500 }}>Telefone / WhatsApp *</label>
                  <input type="text" value={clientForm.phone || ""} onChange={e => setClientForm({...clientForm, phone: e.target.value})} required placeholder="(11) 99999-9999" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 500 }}>Data de Nascimento *</label>
                  <input type="date" value={clientForm.birthDate || ""} onChange={e => setClientForm({...clientForm, birthDate: e.target.value})} required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 500 }}>Status do Perfil</label>
                <select 
                  value={clientForm.status || "active"} 
                  onChange={e => setClientForm({...clientForm, status: e.target.value as "active" | "inactive"})}
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-background)", color: "var(--color-text)" }}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--color-border)", textAlign: "right" }}>
                <button type="submit" className="btn-primary" style={{ padding: "12px 24px" }}>
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {activeTab === "birthdays" && (
        <div className={styles.mainContent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Cabeçalho Moderno */}
            <div style={{ background: 'linear-gradient(135deg, #fb7185, #e11d48)', padding: '32px', borderRadius: '24px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(225, 29, 72, 0.4)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-5%', top: '-20%', opacity: 0.1, transform: 'rotate(-15deg)' }}>
                <Cake size={250} />
              </div>
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
                <div>
                  <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 12, color: '#ffffff' }}>
                    <Sparkles size={32} /> Aniversariantes
                  </h2>
                  <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '1.1rem' }}>Celebre com seus clientes e ofereça mimos especiais.</p>
                </div>
                
                {/* Seletor de Mês Moderno */}
                <div style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)', padding: '10px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(255,255,255,0.3)' }}>
                  <CalendarDays size={20} />
                  <select 
                    value={bdaySelectedMonth}
                    onChange={(e) => {
                      setBdaySelectedMonth(Number(e.target.value));
                      if (birthdayFilter === 'day') setBirthdayFilter('month');
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.15rem', fontWeight: 700, outline: 'none', cursor: 'pointer', appearance: 'none', paddingRight: '8px' }}
                  >
                    <option value={1} style={{color: '#333'}}>Janeiro</option>
                    <option value={2} style={{color: '#333'}}>Fevereiro</option>
                    <option value={3} style={{color: '#333'}}>Março</option>
                    <option value={4} style={{color: '#333'}}>Abril</option>
                    <option value={5} style={{color: '#333'}}>Maio</option>
                    <option value={6} style={{color: '#333'}}>Junho</option>
                    <option value={7} style={{color: '#333'}}>Julho</option>
                    <option value={8} style={{color: '#333'}}>Agosto</option>
                    <option value={9} style={{color: '#333'}}>Setembro</option>
                    <option value={10} style={{color: '#333'}}>Outubro</option>
                    <option value={11} style={{color: '#333'}}>Novembro</option>
                    <option value={12} style={{color: '#333'}}>Dezembro</option>
                  </select>
                  <ChevronDown size={18} />
                </div>
              </div>
            </div>

            {/* Filtros e Busca */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: '4px' }}>
                <button 
                  onClick={() => setBirthdayFilter('month')}
                  style={{ padding: '10px 20px', borderRadius: '24px', border: 'none', background: birthdayFilter === 'month' ? 'var(--color-primary-dark)' : '#f1f5f9', color: birthdayFilter === 'month' ? '#fff' : '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: birthdayFilter === 'month' ? '0 4px 10px rgba(0,0,0,0.1)' : 'none' }}
                >
                  Mês Selecionado
                </button>
                <button 
                  onClick={() => setBirthdayFilter('day')}
                  style={{ padding: '10px 20px', borderRadius: '24px', border: 'none', background: birthdayFilter === 'day' ? 'var(--color-primary-dark)' : '#f1f5f9', color: birthdayFilter === 'day' ? '#fff' : '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: birthdayFilter === 'day' ? '0 4px 10px rgba(0,0,0,0.1)' : 'none' }}
                >
                  Hoje
                </button>
                <button 
                  onClick={() => setBirthdayFilter('all')}
                  style={{ padding: '10px 20px', borderRadius: '24px', border: 'none', background: birthdayFilter === 'all' ? 'var(--color-primary-dark)' : '#f1f5f9', color: birthdayFilter === 'all' ? '#fff' : '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: birthdayFilter === 'all' ? '0 4px 10px rgba(0,0,0,0.1)' : 'none' }}
                >
                  Todos do Ano
                </button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '10px 20px', flex: '1', maxWidth: '350px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <Search size={18} color="#94a3b8" />
                <input 
                  type="text" 
                  placeholder="Buscar aniversariante..." 
                  value={bdaySearch}
                  onChange={(e) => setBdaySearch(e.target.value)}
                  style={{ border: 'none', outline: 'none', background: 'transparent', padding: '0 8px', width: '100%', fontSize: '0.95rem' }}
                />
              </div>
            </div>

            {/* Lista de Aniversariantes */}
            <div className={styles.mobileGrid1Col} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
              {allBirthdays.filter(b => {
                if (bdaySearch && !b.name.toLowerCase().includes(bdaySearch.toLowerCase())) return false;
                
                const now = new Date();
                if (birthdayFilter === 'day') return b.day === now.getDate() && b.month === now.getMonth() + 1;
                if (birthdayFilter === 'month') return b.month === bdaySelectedMonth;
                return true;
              }).sort((a, b) => {
                if (a.month !== b.month) return a.month - b.month;
                return a.day - b.day;
              }).map((b, i) => {
                const now = new Date();
                const isToday = b.day === now.getDate() && b.month === now.getMonth() + 1;
                
                return (
                  <div key={i} style={{ padding: 24, borderRadius: 20, background: '#fff', border: isToday ? '2px solid #e11d48' : '1px solid #e2e8f0', boxShadow: isToday ? '0 10px 25px -5px rgba(225, 29, 72, 0.2)' : '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 20, transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                    {isToday && (
                      <div style={{ position: 'absolute', top: 12, right: 12, background: '#e11d48', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        É Hoje!
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #fb7185, #e11d48)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.4rem', boxShadow: '0 4px 10px rgba(225, 29, 72, 0.3)' }}>
                        {getInitials(b.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1e293b' }}>{b.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700 }}>
                            <Cake size={14} /> {b.dateStr}
                          </span>
                          {b.age !== null && b.age > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, border: '1px solid #bfdbfe' }}>
                              🎈 {b.age} anos
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleSendBirthday(b.phone, b.name)}
                      style={{ 
                        width: '100%', 
                        padding: '14px 18px', 
                        borderRadius: 16, 
                        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', 
                        color: '#fff', 
                        border: 'none', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: 10, 
                        fontWeight: 800, 
                        fontSize: '0.95rem',
                        cursor: 'pointer', 
                        boxShadow: '0 6px 16px rgba(37, 211, 102, 0.3)',
                        transition: 'all 0.2s ease' 
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(37, 211, 102, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 211, 102, 0.3)';
                      }}
                    >
                      <MessageCircle size={20} />
                      <span>Felicitar Aniversariante via WhatsApp 🎉</span>
                    </button>
                  </div>

                );
              })}
            </div>
            
            {allBirthdays.filter(b => {
              if (bdaySearch && !b.name.toLowerCase().includes(bdaySearch.toLowerCase())) return false;
              const now = new Date();
              if (birthdayFilter === 'day') return b.day === now.getDate() && b.month === now.getMonth() + 1;
              if (birthdayFilter === 'month') return b.month === bdaySelectedMonth;
              return true;
            }).length === 0 && (
              <div style={{ textAlign: 'center', padding: '64px 0', color: '#94a3b8', background: '#f8fafc', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
                <Cake size={64} style={{ opacity: 0.3, margin: '0 auto 20px', color: '#e11d48' }} />
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#475569' }}>Nenhum aniversariante encontrado</div>
                <div style={{ fontSize: '0.95rem', marginTop: '8px' }}>Tente alterar os filtros ou o mês selecionado.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmPaymentAppt && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, backdropFilter: "blur(4px)" }}>
          <div className={styles.modal} style={{ background: "white", padding: "32px", borderRadius: "20px", width: "450px", maxWidth: "90%", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#DCFCE7", color: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <DollarSign size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.25rem", color: "#1e293b", margin: 0, fontWeight: 700 }}>Confirmar Pagamento</h2>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{confirmPaymentAppt.clientName}</span>
                </div>
              </div>
              <button onClick={() => setConfirmPaymentAppt(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px", marginBottom: "20px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Serviço: <strong style={{ color: "#1e293b" }}>{confirmPaymentAppt.service}</strong></div>
              <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "8px" }}>Data & Horário: <strong style={{ color: "#1e293b" }}>{confirmPaymentAppt.date} às {confirmPaymentAppt.time}</strong></div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-primary-dark, #a85145)" }}>R$ {confirmPaymentAppt.price},00</div>
            </div>

            <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#334155", marginBottom: "12px" }}>Selecione a forma de pagamento:</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
              <button
                onClick={() => {
                  updatePayment(confirmPaymentAppt.id, "paid_pix");
                  setSelectedDetailAppt(prev => prev && prev.id === confirmPaymentAppt.id ? { ...prev, paymentStatus: "paid_pix" } : prev);
                  setConfirmPaymentAppt(null);
                }}
                style={{
                  padding: "14px 18px",
                  borderRadius: "12px",
                  border: confirmPaymentAppt.paymentStatus === 'paid_pix' ? "2px solid #16a34a" : "1px solid #e2e8f0",
                  background: confirmPaymentAppt.paymentStatus === 'paid_pix' ? "#f0fdf4" : "white",
                  color: "#1e293b",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <QrCode size={20} color="#16a34a" />
                  <span>Pago no Pix</span>
                </div>
                {confirmPaymentAppt.paymentStatus === 'paid_pix' && <CheckCircle2 size={18} color="#16a34a" />}
              </button>

              <button
                onClick={() => {
                  updatePayment(confirmPaymentAppt.id, "paid_credit");
                  setSelectedDetailAppt(prev => prev && prev.id === confirmPaymentAppt.id ? { ...prev, paymentStatus: "paid_credit" } : prev);
                  setConfirmPaymentAppt(null);
                }}
                style={{
                  padding: "14px 18px",
                  borderRadius: "12px",
                  border: confirmPaymentAppt.paymentStatus === 'paid_credit' ? "2px solid #2563eb" : "1px solid #e2e8f0",
                  background: confirmPaymentAppt.paymentStatus === 'paid_credit' ? "#eff6ff" : "white",
                  color: "#1e293b",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CreditCard size={20} color="#2563eb" />
                  <span>Pago no Cartão de Crédito</span>
                </div>
                {confirmPaymentAppt.paymentStatus === 'paid_credit' && <CheckCircle2 size={18} color="#2563eb" />}
              </button>

              <button
                onClick={() => {
                  updatePayment(confirmPaymentAppt.id, "paid_debit");
                  setSelectedDetailAppt(prev => prev && prev.id === confirmPaymentAppt.id ? { ...prev, paymentStatus: "paid_debit" } : prev);
                  setConfirmPaymentAppt(null);
                }}
                style={{
                  padding: "14px 18px",
                  borderRadius: "12px",
                  border: confirmPaymentAppt.paymentStatus === 'paid_debit' ? "2px solid #0891b2" : "1px solid #e2e8f0",
                  background: confirmPaymentAppt.paymentStatus === 'paid_debit' ? "#ecfeff" : "white",
                  color: "#1e293b",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CreditCard size={20} color="#0891b2" />
                  <span>Pago no Cartão de Débito</span>
                </div>
                {confirmPaymentAppt.paymentStatus === 'paid_debit' && <CheckCircle2 size={18} color="#0891b2" />}
              </button>

              {confirmPaymentAppt.paymentStatus.includes('paid') && (
                <button
                  onClick={() => {
                    updatePayment(confirmPaymentAppt.id, "open");
                    setSelectedDetailAppt(prev => prev && prev.id === confirmPaymentAppt.id ? { ...prev, paymentStatus: "open" } : prev);
                    setConfirmPaymentAppt(null);
                  }}
                  style={{
                    padding: "12px 18px",
                    borderRadius: "12px",
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    color: "#dc2626",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    marginTop: "4px"
                  }}
                >
                  <XCircle size={16} /> Marcar como Pendente (Não Pago)
                </button>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <button 
                onClick={() => setConfirmPaymentAppt(null)}
                style={{ padding: "10px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontWeight: 600, cursor: "pointer" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showBlockModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, backdropFilter: "blur(4px)" }}>

          <div className={styles.modal} style={{ background: "white", padding: "32px", borderRadius: "16px", width: "400px", maxWidth: "90%", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <h2 style={{ fontSize: "1.25rem", color: "#1e293b", marginBottom: "8px", fontWeight: 700 }}>Bloquear Horários</h2>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "24px" }}>Selecione o intervalo de horário que deseja bloquear para o dia {selectedDateStr}. Nenhum agendamento poderá ser marcado neste período.</p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>Horário Inicial</label>
                <input type="time" value={blockStart} onChange={e => setBlockStart(e.target.value)} style={{ width: "100%", padding: "10px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc", color: "#1e293b" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "8px" }}>Horário Final</label>
                <input type="time" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} style={{ width: "100%", padding: "10px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc", color: "#1e293b" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "32px" }}>
              <button 
                onClick={() => setShowBlockModal(false)}
                style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontWeight: 600, cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const startMins = timeToMins(blockStart);
                  const endMins = timeToMins(blockEnd);
                  if (startMins >= endMins) {
                    alert("O horário final deve ser maior que o horário inicial.");
                    return;
                  }
                  const slotsToBlock: string[] = [];
                  for (let m = startMins; m < endMins; m += 30) {
                    slotsToBlock.push(minsToTime(m));
                  }
                  if (slotsToBlock.length > 0) {
                    blockTimeSlots(selectedDateStr, slotsToBlock);
                  }
                  setShowBlockModal(false);
                }}
                style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "var(--color-primary-dark)", color: "white", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Ban size={16} /> Confirmar Bloqueio
              </button>
            </div>
          </div>
        </div>
      )}
      
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        user={user}
        onSave={handleSaveProfile}
        onInactivate={() => {
          inactivateProfile();
          setShowEditProfileModal(false);
          alert(`Perfil ${user?.status === 'inactive' ? 'reativado' : 'inativado'} com sucesso!`);
        }}
        onDelete={() => {
          deleteProfile();
          setShowEditProfileModal(false);
          alert("Seu perfil foi excluído com sucesso.");
        }}
      />

      {showLoyaltySettings && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <form onSubmit={handleSaveLoyaltySettings}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Configurações de Fidelidade</h3>
                <button type="button" className={styles.closeModalBtn} onClick={() => setShowLoyaltySettings(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div style={{ marginBottom: "16px" }}>
                  <label className={styles.label}>Prêmio (O que o cliente ganha?)</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={loyaltyForm.prizeName}
                    onChange={e => setLoyaltyForm({...loyaltyForm, prizeName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className={styles.label}>Carimbos Necessários</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    min="1"
                    max="20"
                    value={loyaltyForm.stampsRequired}
                    onChange={e => setLoyaltyForm({...loyaltyForm, stampsRequired: Number(e.target.value)})}
                    required
                  />
                </div>
                <div style={{ marginTop: "16px" }}>
                  <label className={styles.label}>Validade (em dias)</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    min="1"
                    max="365"
                    value={loyaltyForm.expirationDays}
                    onChange={e => setLoyaltyForm({...loyaltyForm, expirationDays: Number(e.target.value)})}
                    required
                  />
                </div>
                <p style={{ marginTop: "16px", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                  As configurações valem para todos os clientes ativos. Se você diminuir o número de carimbos, alguns clientes podem ser premiados imediatamente.
                </p>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowLoyaltySettings(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary}>Salvar Configuração</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showLoyaltyPreview && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, backdropFilter: "blur(5px)" }}>
          <div className={styles.modal} style={{ position: "relative", width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            
            {/* Close Modal Button */}
            <button 
              onClick={() => setShowLoyaltyPreview(false)} 
              style={{ position: "absolute", top: "-48px", right: "0px", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
            >
              <X size={24} />
            </button>

            {/* Mobile Phone Mockup */}
            <div style={{ width: "360px", height: "700px", backgroundColor: "#f8fafc", borderRadius: "40px", padding: "16px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), inset 0 0 0 12px #1e293b", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              
              {/* Phone Notch */}
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "120px", height: "24px", backgroundColor: "#1e293b", borderBottomLeftRadius: "16px", borderBottomRightRadius: "16px", zIndex: 10 }}></div>

              {/* App Content */}
              <div style={{ flex: 1, overflowY: "auto", marginTop: "24px", paddingBottom: "24px" }}>
                
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px", padding: "0 8px" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "var(--color-primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary-dark)", fontWeight: "bold", fontSize: "1.2rem" }}>
                    C
                  </div>
                  <div>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>Olá, Cliente!</h2>
                    <p style={{ color: "#64748b", margin: 0, fontSize: "0.85rem" }}>Seu programa de fidelidade</p>
                  </div>
                </div>

                {/* Loyalty Card */}
                <div style={{ backgroundColor: "#ffffff", borderRadius: "24px", padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" }}>
                  <div style={{ textAlign: "center", marginBottom: "24px" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "16px", backgroundColor: "#fff5f0", color: "#f97316", marginBottom: "16px" }}>
                      <Gift size={24} color="#f97316" />
                    </div>
                    <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", margin: "0 0 8px 0" }}>{loyaltySettings.prizeName || "50% de desconto"}</h3>
                    <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>Complete {loyaltySettings.stampsRequired || 7} serviços para ganhar</p>
                  </div>

                  {/* Stamps Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px", justifyContent: "center" }}>
                    {[...Array(loyaltySettings.stampsRequired || 7)].map((_, i) => {
                      const isStamped = i < Math.min(5, (loyaltySettings.stampsRequired || 7) - 1);
                      return (
                        <div key={i} style={{ aspectRatio: "1", borderRadius: "50%", backgroundColor: isStamped ? "#f97316" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: isStamped ? "#ffffff" : "#cbd5e1", border: isStamped ? "none" : "2px dashed #e2e8f0", transition: "all 0.3s" }}>
                          {isStamped ? <CheckCircle2 size={24} /> : <span style={{ fontSize: "1.2rem", fontWeight: 600 }}>{i + 1}</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress Info */}
                  <div style={{ backgroundColor: "#f8fafc", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                    <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem", fontWeight: 500 }}>Faltam <span style={{ color: "#f97316", fontWeight: 700, fontSize: "1.1rem" }}>{(loyaltySettings.stampsRequired || 7) - Math.min(5, (loyaltySettings.stampsRequired || 7) - 1)}</span> carimbos</p>
                    <div style={{ width: "100%", height: "6px", backgroundColor: "#e2e8f0", borderRadius: "3px", marginTop: "12px", overflow: "hidden" }}>
                      <div style={{ width: `${(Math.min(5, (loyaltySettings.stampsRequired || 7) - 1) / (loyaltySettings.stampsRequired || 7)) * 100}%`, height: "100%", backgroundColor: "#f97316", borderRadius: "3px", transition: "width 0.5s ease-out" }}></div>
                    </div>
                  </div>
                </div>

                {/* Rules / Details */}
                <div style={{ marginTop: "32px", padding: "0 8px" }}>
                  <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", marginBottom: "16px" }}>Regras do Programa</h4>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "12px", color: "#475569", fontSize: "0.9rem" }}>
                      <div style={{ backgroundColor: "#e0f2fe", color: "#0ea5e9", padding: "6px", borderRadius: "8px", flexShrink: 0 }}><Clock size={16} /></div>
                      <div>Carimbos expiram em {loyaltySettings.expirationDays || 90} dias após o último serviço.</div>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "12px", color: "#475569", fontSize: "0.9rem" }}>
                      <div style={{ backgroundColor: "#dcfce7", color: "#22c55e", padding: "6px", borderRadius: "8px", flexShrink: 0 }}><CheckCircle2 size={16} /></div>
                      <div>Um carimbo é adicionado automaticamente após a conclusão de cada serviço.</div>
                    </li>
                  </ul>
                </div>

              </div>
            </div>
            
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "16px", textAlign: "center" }}>* Esta é apenas uma simulação visual de como o cliente vê o programa no aplicativo dele.</p>
          </div>
        </div>
      )}

      {selectedDetailAppt && (
        <div className={styles.detailModalOverlay} onClick={() => setSelectedDetailAppt(null)}>
          <div className={styles.detailModalCard} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className={styles.detailModalHeader}>
              <div className={styles.detailModalTag}>
                <Sparkles size={14} /> Detalhes do Agendamento
              </div>
              <button 
                className={styles.detailModalCloseBtn}
                onClick={() => setSelectedDetailAppt(null)}
                title="Fechar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Client Profile & Hero Section */}
            {(() => {
              const clientObj = clients.find(c => c.email === selectedDetailAppt.clientEmail || c.name.toLowerCase() === selectedDetailAppt.clientName.toLowerCase());
              const isClientDeleted = !clientObj;
              const clientPhoto = clientObj?.photoUrl || (clientObj as any)?.photo;
              const clientPhone = clientObj?.phone || "";

              return (
                <div className={styles.detailModalBody}>
                  <div className={styles.detailClientHero}>
                    <div className={styles.detailAvatarWrapper}>
                      {clientPhoto ? (
                        <img src={clientPhoto} alt={selectedDetailAppt.clientName} className={styles.detailAvatarImg} />
                      ) : (
                        <div className={styles.detailAvatarInitials}>
                          {getInitials(selectedDetailAppt.clientName)}
                        </div>
                      )}
                      {isClientDeleted && (
                        <span className={styles.deletedClientBadge}>Excluído</span>
                      )}
                    </div>
                    <div className={styles.detailClientInfo}>
                      <h3 className={styles.detailClientName}>{selectedDetailAppt.clientName}</h3>
                      <div className={styles.detailClientSubRow}>
                        {selectedDetailAppt.clientEmail && (
                          <span className={styles.detailClientEmail}>
                            <Mail size={14} /> {selectedDetailAppt.clientEmail}
                          </span>
                        )}
                        {clientPhone && (
                          <a 
                            href={`https://wa.me/55${clientPhone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.detailWhatsappBtn}
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle size={14} /> {clientPhone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Time, Date & Financial Section */}
                  <div className={styles.detailMetaGrid}>
                    <div className={styles.detailMetaCard}>
                      <div className={styles.detailMetaIcon} style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                        <CalendarDays size={20} />
                      </div>
                      <div>
                        <span className={styles.detailMetaLabel}>Data e Horário</span>
                        <div className={styles.detailMetaValue}>
                          {selectedDetailAppt.date}
                        </div>
                        <div className={styles.detailMetaSub}>
                          <Clock size={12} /> {selectedDetailAppt.time} às {selectedDetailAppt.endTime || "N/A"}
                        </div>
                      </div>
                    </div>

                    <div className={styles.detailMetaCard}>
                      <div className={styles.detailMetaIcon} style={{ background: '#ECFDF5', color: '#059669' }}>
                        <DollarSign size={20} />
                      </div>
                      <div>
                        <span className={styles.detailMetaLabel}>Valor Total</span>
                        <div className={styles.detailMetaValueAmount}>
                          R$ {selectedDetailAppt.price},00
                        </div>
                        <div className={styles.detailMetaSub}>
                          {selectedDetailAppt.paymentStatus.includes('paid') ? '✓ Confirmado' : '⚡ Aguardando recebimento'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Services List Section */}
                  <div className={styles.detailServicesBox}>
                    <div className={styles.detailSectionTitle}>
                      <Sparkles size={16} color="var(--color-accent, #d4a373)" /> Serviços Agendados
                    </div>
                    <div className={styles.detailServicesTags}>
                      {selectedDetailAppt.service.split(',').map((srv, idx) => (
                        <div key={idx} className={styles.detailServiceItem}>
                          <CheckCircle2 size={15} className={styles.detailCheckIcon} />
                          <span>{srv.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status & Payment Badges */}
                  <div className={styles.detailBadgesRow}>
                    <div className={styles.detailBadgeGroup}>
                      <span className={styles.detailBadgeGroupTitle}>Status do Agendamento:</span>
                      {selectedDetailAppt.status === 'confirmed' && <span className={`${styles.badge} ${styles.badgeGreen}`} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>✓ Confirmado</span>}
                      {selectedDetailAppt.status === 'pending' && <span className={`${styles.badge} ${styles.badgeYellow}`} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>⏳ Pendente</span>}
                      {selectedDetailAppt.status === 'completed' && <span className={`${styles.badge} ${styles.badgeGray}`} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>🏁 Concluído</span>}
                      {selectedDetailAppt.status === 'canceled' && <span className={`${styles.badge} ${styles.badgeRed}`} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>✕ Cancelado</span>}
                    </div>

                    <div className={styles.detailBadgeGroup}>
                      <span className={styles.detailBadgeGroupTitle}>Situação do Pagamento:</span>
                      {selectedDetailAppt.paymentStatus.includes('paid') ? (
                        <span className={`${styles.badge} ${styles.badgeGreen}`} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                          💳 Pago via {selectedDetailAppt.paymentStatus.replace('paid_', '')}
                        </span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeYellow}`} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                          ⏳ Pagamento pendente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botão Gerar & Enviar Recibo PDF */}
                  <div style={{ marginTop: '14px', borderTop: '1px dashed #e2e8f0', paddingTop: '14px' }}>
                    <button
                      type="button"
                      onClick={() => setReceiptAppt(selectedDetailAppt)}
                      style={{
                        width: "100%",
                        background: "linear-gradient(135deg, #a85145 0%, #8c3f35 100%)",
                        color: "#ffffff",
                        border: "none",
                        padding: "12px 18px",
                        borderRadius: "14px",
                        fontWeight: 700,
                        fontSize: "0.92rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(168, 81, 69, 0.3)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <FileText size={18} />
                      <span>🧾 Gerar & Enviar Recibo (PDF)</span>
                    </button>
                  </div>

                  {/* Action Buttons Grid */}
                  <div className={styles.detailActionsContainer}>
                    <div className={styles.detailSectionTitle}>Ações Rápidas</div>
                    <div className={styles.detailActionsGrid}>
                      {/* Confirmar Agendamento */}
                      <button
                        className={`${styles.detailActionBtn} ${selectedDetailAppt.status === 'confirmed' ? styles.btnPendingAction : styles.btnConfirm}`}
                        onClick={() => {
                          handleConfirmAndSendWhatsApp(selectedDetailAppt);
                        }}
                        title={selectedDetailAppt.status === 'confirmed' ? 'Marcar como pendente' : 'Confirmar agendamento e notificar no WhatsApp'}
                      >
                        <CheckCircle2 size={16} />
                        <span>{selectedDetailAppt.status === 'confirmed' ? 'Pendente' : 'Confirmar'}</span>
                      </button>


                      {/* Confirmar / Gerenciar Pagamento */}
                      <button
                        className={`${styles.detailActionBtn} ${selectedDetailAppt.paymentStatus.includes('paid') ? styles.btnPaid : styles.btnPay}`}
                        onClick={() => {
                          setConfirmPaymentAppt(selectedDetailAppt);
                        }}
                        title="Registrar ou alterar status do pagamento"
                      >
                        <CreditCard size={16} />
                        <span>{selectedDetailAppt.paymentStatus.includes('paid') ? 'Alterar Pago' : 'Pagamento'}</span>
                      </button>

                      {/* Enviar Lembrete WhatsApp */}
                      <button
                        className={`${styles.detailActionBtn} ${styles.btnReminder}`}
                        onClick={() => {
                          handleSendReminderForAppt(selectedDetailAppt);
                        }}
                        title="Enviar mensagem de lembrete no WhatsApp"
                      >
                        <Bell size={16} />
                        <span>Lembrete</span>
                      </button>

                      {/* Editar Agendamento */}
                      <button
                        className={`${styles.detailActionBtn} ${styles.btnEdit}`}
                        onClick={() => {
                          handleOpenEditAppt(selectedDetailAppt);
                          setSelectedDetailAppt(null);
                        }}
                        title="Editar data, horário ou serviços"
                      >
                        <Edit3 size={16} />
                        <span>Editar</span>
                      </button>

                      {/* Cancelar Agendamento */}
                      <button
                        className={`${styles.detailActionBtn} ${styles.btnCancel}`}
                        onClick={() => {
                          if (selectedDetailAppt.status === 'canceled') {
                            updateStatus(selectedDetailAppt.id, 'pending');
                            setSelectedDetailAppt(prev => prev ? { ...prev, status: 'pending' } : null);
                          } else {
                            setConfirmModal({
                              open: true,
                              title: "Cancelar Agendamento",
                              message: `Deseja realmente cancelar o agendamento de ${selectedDetailAppt.clientName}?`,
                              confirmText: "Sim, Cancelar",
                              variant: "danger",
                              onConfirm: () => {
                                updateStatus(selectedDetailAppt.id, 'canceled');
                                handleSendCancellationForAppt(selectedDetailAppt);
                                setSelectedDetailAppt(prev => prev ? { ...prev, status: 'canceled' } : null);
                              }
                            });
                          }
                        }}
                        title="Cancelar agendamento e avisar no WhatsApp"
                      >
                        <XCircle size={16} />
                        <span>{selectedDetailAppt.status === 'canceled' ? 'Reativar' : 'Cancelar'}</span>
                      </button>

                      {/* Excluir Agendamento */}
                      <button
                        className={`${styles.detailActionBtn} ${styles.btnDelete}`}
                        onClick={() => {
                          setConfirmModal({
                            open: true,
                            title: "Excluir Agendamento",
                            message: `Deseja excluir definitivamente o agendamento de ${selectedDetailAppt.clientName}?`,
                            confirmText: "Sim, Excluir",
                            variant: "danger",
                            onConfirm: () => {
                              deleteAppointment(selectedDetailAppt.id);
                              setSelectedDetailAppt(null);
                            }
                          });
                        }}
                        title="Excluir este agendamento do banco de dados"
                      >
                        <Trash2 size={16} />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                </div>
              );

            })()}
          </div>
        </div>
      )}

      {/* Notice Modal */}
      {noticeModal?.open && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => setNoticeModal(null)}
        >
          <div 
            style={{
              background: "#FFFFFF",
              borderRadius: "24px",
              padding: "28px 24px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              textAlign: "center",
              position: "relative",
              border: "1px solid #F0E5DF"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: noticeModal.type === "error" ? "#FEF2F2" : noticeModal.type === "success" ? "#ECFDF5" : "#EFF6FF",
                color: noticeModal.type === "error" ? "#EF4444" : noticeModal.type === "success" ? "#10B981" : "#3B82F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              {noticeModal.type === "error" ? (
                <AlertCircle size={32} />
              ) : noticeModal.type === "success" ? (
                <CheckCircle2 size={32} />
              ) : (
                <Sparkles size={32} />
              )}
            </div>

            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#18181B", margin: "0 0 8px 0" }}>
              {noticeModal.title}
            </h3>

            <p style={{ fontSize: "0.92rem", color: "#71717A", lineHeight: 1.5, margin: "0 0 24px 0" }}>
              {noticeModal.message}
            </p>

            <button
              type="button"
              onClick={() => setNoticeModal(null)}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #D96B52 0%, #C85A48 100%)",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "0.95rem",
                padding: "14px",
                borderRadius: "14px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(217, 107, 82, 0.25)"
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal?.open && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => setConfirmModal(null)}
        >
          <div 
            style={{
              background: "#FFFFFF",
              borderRadius: "24px",
              padding: "28px 24px",
              width: "100%",
              maxWidth: "440px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
              textAlign: "center",
              position: "relative",
              border: "1px solid #F0E5DF"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: confirmModal.variant === "warning" ? "#FFFBEB" : confirmModal.variant === "primary" ? "#EFF6FF" : "#FEF2F2",
                color: confirmModal.variant === "warning" ? "#D97706" : confirmModal.variant === "primary" ? "#2563EB" : "#EF4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              {confirmModal.variant === "warning" ? (
                <AlertCircle size={32} />
              ) : confirmModal.variant === "primary" ? (
                <Sparkles size={32} />
              ) : (
                <XCircle size={32} />
              )}
            </div>

            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#18181B", margin: "0 0 8px 0" }}>
              {confirmModal.title}
            </h3>

            <p style={{ fontSize: "0.92rem", color: "#71717A", lineHeight: 1.5, margin: "0 0 24px 0" }}>
              {confirmModal.message}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                style={{
                  background: "#F4F4F5",
                  color: "#3F3F46",
                  fontWeight: 600,
                  fontSize: "0.92rem",
                  padding: "13px",
                  borderRadius: "14px",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                {confirmModal.cancelText || "Cancelar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const cb = confirmModal.onConfirm;
                  setConfirmModal(null);
                  if (cb) cb();
                }}
                style={{
                  background: confirmModal.variant === "warning" ? "linear-gradient(135deg, #F59E0B, #D97706)" : confirmModal.variant === "primary" ? "linear-gradient(135deg, #3B82F6, #2563EB)" : "linear-gradient(135deg, #EF4444, #DC2626)",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  padding: "13px",
                  borderRadius: "14px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)"
                }}
              >
                {confirmModal.confirmText || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ULTRA MODERN RECEIPT MODAL */}
      {receiptAppt && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            overflowY: "auto"
          }}
          onClick={() => setReceiptAppt(null)}
        >
          <div 
            style={{
              background: "#ffffff",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              borderRadius: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              padding: "24px",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              overflowY: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Controls Bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={22} color="#a85145" />
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Recibo Oficial de Pagamento
                </h3>
              </div>
              <button 
                onClick={() => setReceiptAppt(null)}
                style={{ background: "#f1f5f9", border: "none", width: "36px", height: "36px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            {/* Printable Receipt Container (A4 Printable Component) */}
            <div 
              id="receipt-print-container"
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #cbd5e1",
                padding: "24px 22px",
                width: "600px",
                maxWidth: "100%",
                boxSizing: "border-box",
                margin: "0 auto",
                fontFamily: "var(--font-inter, sans-serif)",
                color: "#1e293b",
                boxShadow: "0 4px 20px rgba(0,0,0,0.04)"
              }}
            >
              {/* Receipt Header Banner */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #a85145", paddingBottom: "20px", marginBottom: "20px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#a85145", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1rem" }}>
                      FM
                    </div>
                    <div>
                      <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#a85145", margin: 0, lineHeight: 1.1 }}>
                        Fran Marinho
                      </h2>
                      <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Studio de Beleza
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "6px 0 0 0", lineHeight: 1.4 }}>
                    Rua Abrão Júlio Rahe, 1801 • Campo Grande/MS<br />
                    WhatsApp: (67) 99266-6464
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ background: "#fff5f0", border: "1px solid #fed7aa", color: "#a85145", padding: "6px 14px", borderRadius: "10px", fontSize: "0.78rem", fontWeight: 800, display: "inline-block", marginBottom: "8px" }}>
                    COMPROVANTE DE PAGAMENTO
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                    Nº #{receiptAppt.id}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                    Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Verified Stamp Banner */}
              <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "1px solid #86efac", borderRadius: "12px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#16a34a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#15803d" }}>
                    ✓ PAGAMENTO QUITADO E CONFIRMADO
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#166534" }}>
                    Valor devidamente recebido e registrado em nosso sistema.
                  </div>
                </div>
              </div>

              {/* Info Grid: Client & Payment Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    DADOS DO CLIENTE
                  </span>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                    {receiptAppt.clientName || "Cliente"}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "2px" }}>
                    📧 {receiptAppt.clientEmail || "Não informado"}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    FORMA DE PAGAMENTO
                  </span>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                    {receiptAppt.paymentStatus === "paid_pix" ? "⚡ Pix Automático (Mercado Pago)" : receiptAppt.paymentStatus === "paid_credit" ? "💳 Cartão de Crédito" : "💰 Pago no Salão"}
                  </div>
                  {receiptAppt.mpPaymentId && (
                    <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "2px" }}>
                      ID MP: {receiptAppt.mpPaymentId}
                    </div>
                  )}
                </div>
              </div>

              {/* Services Table */}
              <div style={{ marginBottom: "24px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  DISCRIMINAÇÃO DOS SERVIÇOS
                </span>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569", fontWeight: 700 }}>
                      <th style={{ padding: "10px 12px", borderRadius: "8px 0 0 8px" }}>Descrição do Serviço</th>
                      <th style={{ padding: "10px 12px" }}>Data & Horário</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", borderRadius: "0 8px 8px 0" }}>Valor Liquidado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px", fontWeight: 600, color: "#0f172a" }}>{receiptAppt.service}</td>
                      <td style={{ padding: "12px", color: "#475569" }}>{receiptAppt.date} às {receiptAppt.time}</td>
                      <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>R$ {Number(receiptAppt.price || 0).toFixed(2).replace('.', ',')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Box & Terms */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff5f0", border: "1.5px solid #fed7aa", borderRadius: "14px", padding: "16px 20px" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#a85145", textTransform: "uppercase", display: "block" }}>
                    TOTAL PAGO E LIQUIDADO
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "#78350f" }}>
                    Impostos e taxas inclusos
                  </span>
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#a85145" }}>
                  R$ {Number(receiptAppt.price || 0).toFixed(2).replace('.', ',')}
                </div>
              </div>

              {/* Legal Note & Handwritten Signature */}
              <div style={{ marginTop: "24px", borderTop: "1px solid #f1f5f9", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: 0, maxWidth: "300px", lineHeight: 1.3 }}>
                  Declaro para os devidos fins que recebi a quantia descrita neste comprovante referente aos serviços de beleza agendados e prestados.
                </p>
                <div style={{ textAlign: "center", position: "relative" }}>
                  {/* Cursive Handwritten Signature */}
                  <div style={{ 
                    fontFamily: "'Dancing Script', 'Caveat', 'Playfair Display', cursive", 
                    fontSize: "1.9rem", 
                    fontWeight: 700, 
                    color: "#a85145", 
                    lineHeight: 1, 
                    marginBottom: "-4px", 
                    transform: "rotate(-3deg)",
                    letterSpacing: "0.02em"
                  }}>
                    Francielli Marinho
                  </div>

                  {/* Underline Flourish */}
                  <svg width="170" height="12" viewBox="0 0 170 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: "0 auto", display: "block" }}>
                    <path d="M 5 6 Q 45 1, 85 6 T 165 5" stroke="#a85145" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
                  </svg>

                  <div style={{ width: "170px", borderBottom: "1px solid #cbd5e1", margin: "2px auto 4px" }} />

                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#334155", display: "block" }}>
                    Francielli Marinho Brasil
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>
                    Proprietária & Responsável Técnica
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", paddingTop: "8px" }}>
              <button
                type="button"
                onClick={() => handleDownloadReceiptPdf(receiptAppt)}
                disabled={isGeneratingPdf}
                style={{
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  padding: "12px 20px",
                  borderRadius: "14px",
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <FileText size={18} />
                <span>{isGeneratingPdf ? "Gerando PDF..." : "Baixar PDF"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareReceiptWhatsApp(receiptAppt)}
                disabled={isGeneratingPdf}
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px 22px",
                  borderRadius: "14px",
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)"
                }}
              >
                <Send size={18} />
                <span>{isGeneratingPdf ? "Processando PDF..." : "Enviar PDF via WhatsApp"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </main>

    </div>
  );
}
