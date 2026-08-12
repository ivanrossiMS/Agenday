"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, CalendarDays, Gift, Star, Clock, CheckCircle2, XCircle, RotateCcw, AlertCircle, MapPin, MoreVertical, Calendar, CheckSquare, Camera, ExternalLink, X, UserCircle, ChevronRight, Eye, CreditCard, ArrowRight, QrCode, Store, RefreshCw, ChevronDown } from "lucide-react";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAppointments } from "@/context/AppointmentsContext";
import { useLoyalty } from "@/context/LoyaltyContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useServices } from "@/context/ServicesContext";
import styles from "./page.module.css";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { appointments, updateStatus, updatePayment, addAppointment } = useAppointments();
  const { getUserStats, claimPrize, settings: loyaltySettings } = useLoyalty();
  const { settings: siteSettings } = useSiteSettings();
  const { services } = useServices();

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");
  const [visibleDashboardApptsCount, setVisibleDashboardApptsCount] = useState<number>(10);
  const [isLoadingMoreDashboard, setIsLoadingMoreDashboard] = useState<boolean>(false);
  
  // Modals state
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Payment Modal State
  const [payingAppt, setPayingAppt] = useState<any | null>(null);
  const [dashPaymentMethod, setDashPaymentMethod] = useState<"pix" | "credit" | null>(null);
  const [dashPaymentError, setDashPaymentError] = useState("");
  const [dashIsProcessing, setDashIsProcessing] = useState(false);
  const [dashPixData, setDashPixData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
    paymentId: string;
    copied: boolean;
  } | null>(null);

  // Card Inputs
  const [dashCardNumber, setDashCardNumber] = useState("");
  const [dashCardholderName, setDashCardholderName] = useState("");
  const [dashExpiryDate, setDashExpiryDate] = useState("");
  const [dashCvv, setDashCvv] = useState("");
  const [dashCpf, setDashCpf] = useState("");

  const formatDashCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatDashExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const formatDashCpf = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    let res = digits;
    if (digits.length > 3) res = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length > 6) res = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    if (digits.length > 9) res = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    return res;
  };

  // Pix Polling Effect
  useEffect(() => {
    if (!payingAppt || !dashPixData?.paymentId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/mercadopago/status?appointment_id=${payingAppt.id}&payment_id=${dashPixData.paymentId}`);
        const data = await res.json();

        if (data.isPaid) {
          clearInterval(interval);
          updatePayment(payingAppt.id, 'paid_pix');
          updateStatus(payingAppt.id, 'confirmed');
          setPayingAppt(null);
          setDashPixData(null);
          alert("🎉 Pagamento por Pix confirmado com sucesso!");
        }
      } catch (err) {
        console.error("Error polling Pix status on dashboard:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [payingAppt, dashPixData]);

  const copyDashPixCode = () => {
    if (!dashPixData?.qrCode) return;
    navigator.clipboard.writeText(dashPixData.qrCode);
    setDashPixData(prev => prev ? { ...prev, copied: true } : null);
    setTimeout(() => {
      setDashPixData(prev => prev ? { ...prev, copied: false } : null);
    }, 3000);
  };

  const handleOpenPayment = (appt: any) => {
    setPayingAppt(appt);
    setDashPaymentMethod("pix");
    setDashPaymentError("");
    setDashPixData(null);
  };

  const handleProcessDashPayment = async () => {
    if (!payingAppt) return;
    setDashPaymentError("");

    if (dashPaymentMethod === 'pix') {
      setDashIsProcessing(true);
      try {
        const res = await fetch("/api/mercadopago/pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: payingAppt.id,
            amount: payingAppt.price,
            serviceName: payingAppt.service,
            clientName: payingAppt.clientName,
            clientEmail: payingAppt.clientEmail
          })
        });

        const data = await res.json();
        setDashIsProcessing(false);

        if (!res.ok || data.error) {
          setDashPaymentError(data.error || "Não foi possível gerar o código Pix.");
          return;
        }

        setDashPixData({
          qrCode: data.qrCode,
          qrCodeBase64: data.qrCodeBase64,
          paymentId: data.paymentId,
          copied: false
        });
      } catch (err) {
        setDashIsProcessing(false);
        setDashPaymentError("Erro ao conectar com o serviço Pix.");
      }
      return;
    }

    if (dashPaymentMethod === 'credit') {
      if (!dashCardNumber || dashCardNumber.replace(/\D/g, "").length < 15) {
        setDashPaymentError("Número do cartão inválido.");
        return;
      }
      if (!dashExpiryDate || dashExpiryDate.length < 5) {
        setDashPaymentError("Validade do cartão inválida (MM/AA).");
        return;
      }
      if (!dashCvv || dashCvv.length < 3) {
        setDashPaymentError("CVV inválido.");
        return;
      }

      setDashIsProcessing(true);
      try {
        const [expMonth, expYear] = dashExpiryDate.split("/");

        const res = await fetch("/api/mercadopago/card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: payingAppt.id,
            amount: payingAppt.price,
            serviceName: payingAppt.service,
            clientName: payingAppt.clientName,
            clientEmail: payingAppt.clientEmail,
            cardNumber: dashCardNumber.replace(/\D/g, ""),
            cardholderName: dashCardholderName || payingAppt.clientName,
            expirationMonth: expMonth,
            expirationYear: expYear,
            securityCode: dashCvv,
            cpf: dashCpf.replace(/\D/g, "")
          })
        });

        const data = await res.json();
        setDashIsProcessing(false);

        if (!res.ok || !data.success) {
          setDashPaymentError(data.error || "Pagamento recusado.");
          return;
        }

        updatePayment(payingAppt.id, 'paid_credit');
        updateStatus(payingAppt.id, 'confirmed');
        setPayingAppt(null);
        alert("🎉 Pagamento com cartão realizado com sucesso!");
      } catch (err) {
        setDashIsProcessing(false);
        setDashPaymentError("Erro ao processar pagamento com cartão.");
      }
    }
  };

  const parseApptTimestamp = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return 0;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;

    let hours = 0;
    let mins = 0;
    if (timeStr && timeStr.includes(':')) {
      const [h, m] = timeStr.trim().split(':').map(Number);
      hours = isNaN(h) ? 0 : h;
      mins = isNaN(m) ? 0 : m;
    }

    return new Date(year, month, day, hours, mins).getTime();
  };

  // Filters: strictly show appointments for the logged-in user, sorted from newest (latest) to oldest
  const myAppts = appointments
    .filter(a => user && a.clientEmail?.toLowerCase() === user.email?.toLowerCase())
    .sort((a, b) => {
      const timeA = parseApptTimestamp(a.date, a.time);
      const timeB = parseApptTimestamp(b.date, b.time);
      if (timeA !== timeB) return timeB - timeA;
      return Number(b.id) - Number(a.id);
    });

  const nowTs = new Date().getTime();

  // Todos os agendamentos ativos (não cancelados) do cliente
  const activeAppts = myAppts.filter(a => a.status !== "canceled");

  // Agendamentos futuros ou do dia atual (com carência de 2h)
  const futureAppts = activeAppts.filter(a => parseApptTimestamp(a.date, a.time) >= nowTs - 7200000);

  // Seleciona o agendamento de data MAIS PRÓXIMA no futuro (ativo e não cancelado)
  const nextAppt = futureAppts.length > 0 
    ? [...futureAppts].sort((a, b) => parseApptTimestamp(a.date, a.time) - parseApptTimestamp(b.date, b.time))[0]
    : undefined;

  // Histórico Recente: exibe os demais agendamentos do cliente (além do próximo em destaque)
  const historyAppts = myAppts.filter(a => a.id !== nextAppt?.id);


  // Matched real services & consecutive time slots for each procedure
  const rawServiceNames = nextAppt?.service ? nextAppt.service.split(/\s*\+\s*/) : [];
  
  const matchedServices = rawServiceNames.map(name => {
    const found = services.find(s => s.name.trim().toLowerCase() === name.trim().toLowerCase() || name.trim().toLowerCase().includes(s.name.trim().toLowerCase()));
    if (found) return found;
    return {
      id: "srv_" + name.replace(/\s+/g, "_"),
      name: name,
      description: "",
      price: 0,
      duration: 60,
      imageUrl: "",
      professionalName: "Profissional",
      professionalPhotoUrl: ""
    };
  });

  const servicesToDisplay = matchedServices.length > 0
    ? matchedServices
    : (nextAppt ? [{ id: 'svc-real', name: nextAppt.service, price: nextAppt.price, duration: 60, imageUrl: '', professionalName: 'Profissional', professionalPhotoUrl: '' }] : []);

  const getServiceTimeSlots = (servicesList: typeof servicesToDisplay, startTimeStr?: string) => {
    let currentMins = 540;
    if (startTimeStr && startTimeStr.includes(":")) {
      const [h, m] = startTimeStr.split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        currentMins = h * 60 + m;
      }
    }

    return servicesList.map(svc => {
      const dur = svc.duration || 60;
      const startMins = currentMins;
      const endMins = currentMins + dur;
      currentMins = endMins;

      const formatTime = (totalMins: number) => {
        const h = Math.floor(totalMins / 60) % 24;
        const m = totalMins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      const formatDur = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, '0')}`;
        if (h > 0) return `${h}h`;
        return `${m}min`;
      };

      return {
        ...svc,
        startTime: formatTime(startMins),
        endTime: formatTime(endMins),
        durationFormatted: formatDur(dur),
        timeSlotText: `${formatTime(startMins)} às ${formatTime(endMins)}`
      };
    });
  };

  const scheduledServicesWithSlots = getServiceTimeSlots(servicesToDisplay, nextAppt?.time);
  
  const totalAppointmentDurationMins = scheduledServicesWithSlots.reduce((acc, s) => acc + (s.duration || 60), 0);
  
  const formatTotalDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, '0')}`;
    if (h > 0) return `${h}h`;
    return `${m}min`;
  };

  const totalDurationText = formatTotalDuration(totalAppointmentDurationMins);

  // Handlers
  const handleWhatsApp = () => {
    const text = encodeURIComponent("Olá! Gostaria de falar sobre meu agendamento no Agenday Beauty.");
    window.open(`https://wa.me/${siteSettings.whatsappNumber.replace(/\D/g, '')}?text=${text}`, "_blank");
  };

  const handleCalendar = () => {
    if (!nextAppt) return;
    const parts = nextAppt.date.split('/');
    if (parts.length !== 3) return;
    const [d, m, y] = parts;
    const [h, min] = (nextAppt.time || "09:00").split(':');
    const startISO = `${y}${m.padStart(2, '0')}${d.padStart(2, '0')}T${h.padStart(2, '0')}${min.padStart(2, '0')}00Z`;
    
    let endISO = startISO;
    if (nextAppt.endTime) {
      const [eh, emin] = nextAppt.endTime.split(':');
      endISO = `${y}${m.padStart(2, '0')}${d.padStart(2, '0')}T${eh.padStart(2, '0')}${emin.padStart(2, '0')}00Z`;
    }

    const title = `Agendamento - ${nextAppt.service}`;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      const icsData = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nURL:${window.location.href}\nDTSTART:${startISO}\nDTEND:${endISO}\nSUMMARY:${title}\nDESCRIPTION:Serviço: ${nextAppt.service}\nLOCATION:${siteSettings.salonAddress || ""}\nEND:VEVENT\nEND:VCALENDAR`;
      
      const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', 'agendamento.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startISO}/${endISO}&details=${encodeURIComponent('Serviço: ' + nextAppt.service)}&location=${encodeURIComponent(siteSettings.salonAddress || "")}`;
      window.open(url, "_blank");
    }
  };

  const handleNavigateReschedule = () => {
    if (!nextAppt) return;
    const names = nextAppt.service ? nextAppt.service.split(" + ") : [];
    const matchedIds = services
      .filter(s => names.some(n => s.name.toLowerCase() === n.trim().toLowerCase() || s.id === n.trim()))
      .map(s => s.id);
    
    const svcParam = matchedIds.length > 0 ? matchedIds.join(",") : (nextAppt.service ? encodeURIComponent(nextAppt.service) : 'all');
    router.push(`/agendar?reschedule=true&step=1&servicos=${svcParam}`);
  };

  const handleBookAgain = (svcName?: string) => {
    if (!svcName) {
      router.push(`/agendar?step=1`);
      return;
    }
    const names = svcName.split(" + ");
    const matchedIds = services
      .filter(s => names.some(n => s.name.toLowerCase() === n.trim().toLowerCase() || s.id === n.trim()))
      .map(s => s.id);
    
    const svcParam = matchedIds.length > 0 ? matchedIds.join(",") : encodeURIComponent(svcName);
    router.push(`/agendar?servicos=${svcParam}&step=2`);
  };

  const parseApptDate = (dateStr?: string) => {
    if (!dateStr) return { dayOfWeek: "", dayNum: "--", monthStr: "", daysLeftText: "" };
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        const dateObj = new Date(y, m - 1, d);
        const daysOfWeek = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
        const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
        
        const dayOfWeek = daysOfWeek[dateObj.getDay()] || "";
        const dayNum = String(d).padStart(2, "0");
        const monthStr = months[dateObj.getMonth()] || "";
        
        const now = new Date();
        const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffTime = dateObj.getTime() - todayZero.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let daysLeftText = "";
        if (diffDays < 0) daysLeftText = "Passado";
        else if (diffDays === 0) daysLeftText = "É hoje!";
        else if (diffDays === 1) daysLeftText = "Falta 1 dia";
        else daysLeftText = `Faltam ${diffDays} dias`;

        return { dayOfWeek, dayNum, monthStr, daysLeftText };
      }
    }
    return { dayOfWeek: "", dayNum: dateStr, monthStr: "", daysLeftText: "" };
  };

  const getStatusDisplay = (status: string, paymentStatus?: string) => {
    if (paymentStatus && (paymentStatus.startsWith("paid_") || paymentStatus === "paid" || paymentStatus === "approved")) {
      if (status === "pending") {
        return { label: "Confirmado", icon: <CheckCircle2 size={18} />, class: styles.statusConfirmed, iconWrapperClass: styles.iconConfirmedWrapper };
      }
    }
    switch (status) {
      case "confirmed": return { label: "Confirmado", icon: <CheckCircle2 size={18} />, class: styles.statusConfirmed, iconWrapperClass: styles.iconConfirmedWrapper };
      case "pending": return { label: "Aguardando Pagto.", icon: <Clock size={18} />, class: styles.statusPending, iconWrapperClass: styles.iconPendingWrapper };
      case "completed": return { label: "Concluído", icon: <CheckCircle2 size={18} />, class: styles.statusCompleted, iconWrapperClass: styles.iconCompletedWrapper };
      case "canceled": return { label: "Cancelado", icon: <XCircle size={18} />, class: styles.statusCanceled, iconWrapperClass: styles.iconCanceledWrapper };
      case "rescheduled": return { label: "Remarcado", icon: <RotateCcw size={18} />, class: styles.statusRescheduled, iconWrapperClass: styles.iconRescheduledWrapper };
      default: return { label: "Confirmado", icon: <CheckCircle2 size={18} />, class: styles.statusConfirmed, iconWrapperClass: styles.iconConfirmedWrapper };
    }
  };

  const getPaymentBadge = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s === "paid_pix" || s === "pix") return { label: "Pago no Pix", icon: <QrCode size={13} />, class: styles.paymentPaid };
    if (s === "paid_credit" || s === "paid_card" || s === "paid_debit" || s === "card" || s === "credit" || s === "approved" || s === "paid") {
      return { label: "Pago no Cartão", icon: <CreditCard size={13} />, class: styles.paymentPaid };
    }
    if (s === "pending") return { label: "Pagar no Salão", icon: <Store size={13} />, class: styles.paymentOpen };
    if (s === "open") return { label: "Em Aberto", icon: <CreditCard size={13} />, class: styles.paymentOpen };
    return { label: "Em Aberto", icon: <Store size={13} />, class: styles.paymentOpen };
  };


  const handleCancel = () => {
    if (cancelingId) {
      const apptToCancel = appointments.find(a => a.id === cancelingId);
      updateStatus(cancelingId, "canceled");

      if (apptToCancel) {
        const clientName = user?.name || apptToCancel.clientName || "Cliente";
        let rawPhone = siteSettings.whatsappNumber ? siteSettings.whatsappNumber.replace(/\D/g, "") : "";
        if (rawPhone && rawPhone.length <= 11 && !rawPhone.startsWith("55")) {
          rawPhone = "55" + rawPhone;
        }

        const text = `Olá! *Cancelei* o meu agendamento:\n\n` +
          `👤 *Cliente:* ${clientName}\n` +
          `📅 *Data:* ${apptToCancel.date}\n` +
          `⏰ *Horário:* ${apptToCancel.time}\n` +
          `💅 *Serviço:* ${apptToCancel.service}\n\n` +
          `Informo que fiz o cancelamento deste horário no sistema. Obrigado(a)!`;

        if (rawPhone) {
          window.open(`https://wa.me/${rawPhone}?text=${encodeURIComponent(text)}`, "_blank");
        }
      }

      setCancelingId(null);
    }
  };

  const stats = user ? getUserStats(user.email) : { stamps: 0, availablePrizes: 0, completedAppointments: 0, clientEmail: "", clientName: "" };

  const handleClaim = () => {
    if (user && stats.availablePrizes > 0) {
      claimPrize(user.email, user.name);
      alert(`Parabéns! Você resgatou seu prêmio: ${loyaltySettings.prizeName}! O administrador já foi notificado.`);
    }
  };

  const handleReschedule = () => {
    if (reschedulingId) {
      updateStatus(reschedulingId, "rescheduled");
      
      const oldAppt = appointments.find(a => a.id === reschedulingId);
      if (oldAppt) {
        addAppointment({
          date: "Nova Data",
          time: "00:00",
          service: oldAppt.service,
          price: oldAppt.price,
          status: "pending",
          paymentStatus: "open",
          clientName: oldAppt.clientName,
          clientEmail: oldAppt.clientEmail
        });
        setActiveTab("upcoming");
      }
      setReschedulingId(null);
    }
  };

  const renderHistoryServices = (serviceStr: string) => {
    const rawServices = serviceStr ? serviceStr.split(/\s*\+\s*/) : [];
    if (rawServices.length <= 1) {
      return <span className={styles.historyServiceName}>{serviceStr}</span>;
    }
    return (
      <div className={styles.historyServicesBadgeList}>
        {rawServices.map((svcName, idx) => (
          <span key={idx} className={styles.historyServiceChip}>
            <Sparkles size={11} className={styles.historyChipSparkle} />
            {svcName}
          </span>
        ))}
      </div>
    );
  };

  if (!user) return <div style={{ padding: "120px", textAlign: "center" }}>Verificando credenciais...</div>;

  return (
    <div className={styles.container}>
      {/* Background Atmosphere & Decor (Image 2) */}
      <div className={styles.bgGlowRight} />
      
      <svg className={styles.botanicalDecor} viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M140 10C160 50 200 70 230 100C200 130 160 150 140 190C120 150 80 130 50 100C80 70 120 50 140 10Z" stroke="#E8927C" strokeWidth="1" strokeOpacity="0.25" />
        <path d="M180 40C190 70 210 90 230 110C210 130 190 150 180 180" stroke="#E8927C" strokeWidth="0.8" strokeOpacity="0.2" fill="none" />
        <path d="M100 60C110 80 130 100 150 120" stroke="#E8927C" strokeWidth="0.8" strokeOpacity="0.2" fill="none" />
      </svg>

      <div className={styles.pageHeader}>
        <div className={styles.titleSparkleContainer}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D96B52" strokeWidth="1.5">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" fill="#F4A261" fillOpacity="0.4" />
          </svg>
        </div>
        <h1 className={styles.title}>Olá, {user.name?.split(' ')[0] || "Ivan"}</h1>
        <p className={styles.subtitle}>Tudo pronto para o seu próximo cuidado?</p>
      </div>

      <div className={styles.grid}>
        {/* Left Column */}
        <div className={styles.leftColumn}>
          {/* Next Appointment Card */}
          {nextAppt ? (
            <div className={styles.nextAppointmentCard}>
              {/* Header with Title and Modern Status Pill */}
              <div className={styles.cardHeaderFlex}>
                <h2 className={styles.cardTitle}>PRÓXIMO ATENDIMENTO</h2>
                {nextAppt.status === "confirmed" ? (
                  <span className={styles.statusBadgeConfirmed}>
                    <CheckCircle2 size={14} /> Confirmado
                  </span>
                ) : (
                  <span className={styles.statusBadgePending}>
                    <Clock size={14} /> Aguardando aprovação
                  </span>
                )}
              </div>

              {/* Status Info Banner (Lightweight & Clean) */}
              <div className={nextAppt.status === "confirmed" ? styles.statusAlertConfirmed : styles.statusAlertPending}>
                {nextAppt.status === "confirmed" ? (
                  <>
                    <CheckCircle2 size={16} className={styles.alertIconGreen} />
                    <span><strong>Confirmado pelo Salão!</strong> Seu horário está reservado e garantido.</span>
                  </>
                ) : nextAppt.paymentStatus?.includes("paid") ? (
                  <>
                    <CheckCircle2 size={16} className={styles.alertIconGreen} />
                    <span><strong>Pagamento Recebido com Sucesso!</strong> O seu agendamento está em análise e aguarda a confirmação final da equipe.</span>
                  </>
                ) : (
                  <>
                    <Clock size={16} className={styles.alertIconAmber} />
                    <span><strong>Aguardando Salão:</strong> A equipe está validando seu agendamento em instantes.</span>
                  </>
                )}
              </div>

              {/* Hero Date & Time Section */}
              <div className={styles.heroAppointmentBlock}>
                {(() => {
                  const dateParsed = parseApptDate(nextAppt.date);
                  return (
                    <div className={styles.heroDateBox}>
                      <span className={styles.heroDateMonth}>{dateParsed.dayOfWeek}</span>
                      <span className={styles.heroDateDay}>{dateParsed.dayNum}</span>
                      <span className={styles.heroDateMonth}>{dateParsed.monthStr}</span>
                    </div>
                  );
                })()}
                
                <div className={styles.heroTimeBox}>
                  <div className={styles.heroTimeRow}>
                    <h3 className={styles.heroTimeTitle}>
                      {nextAppt.time} {nextAppt.endTime ? `às ${nextAppt.endTime}` : (scheduledServicesWithSlots.length > 0 ? `às ${scheduledServicesWithSlots[scheduledServicesWithSlots.length - 1].endTime}` : "")}
                    </h3>
                    {parseApptDate(nextAppt.date).daysLeftText && (
                      <span className={styles.heroCountdownBadge}>{parseApptDate(nextAppt.date).daysLeftText}</span>
                    )}
                  </div>
                  
                  <div className={styles.heroMetaPills}>
                    <span className={styles.heroMetaPill}><Clock size={13} /> {totalDurationText}</span>
                    <span className={styles.heroMetaPill}><Star size={13} /> R$ {nextAppt.price ? nextAppt.price.toFixed(2).replace('.', ',') : '0,00'}</span>
                    <span className={`${styles.heroMetaPill} ${styles.paymentBadgePill}`}>
                      {getPaymentBadge(nextAppt.paymentStatus).icon}
                      <span>{getPaymentBadge(nextAppt.paymentStatus).label}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Services List Section */}
              <div className={styles.servicesSection}>
                <div className={styles.servicesHeader}>
                  <span>Serviços inclusos ({scheduledServicesWithSlots.length})</span>
                </div>
                
                <div className={styles.servicesCompactList}>
                  {scheduledServicesWithSlots.map((service, index) => (
                    <div key={service.id || index} className={styles.serviceCompactRow}>
                      <div className={styles.serviceAvatarWrapper}>
                        {service.imageUrl ? (
                          <img src={service.imageUrl} alt={service.name} className={styles.serviceAvatarImg} />
                        ) : (
                          <Sparkles size={16} color="var(--color-primary)" />
                        )}
                      </div>
                      
                      <div className={styles.serviceCompactInfo}>
                        <strong className={styles.serviceCompactTitle}>
                          {service.name}
                        </strong>
                        <div className={styles.serviceCompactMeta}>
                          {service.professionalPhotoUrl ? (
                            <img src={service.professionalPhotoUrl} alt={service.professionalName || "Profissional"} className={styles.proSmallPhoto} />
                          ) : (
                            <UserCircle size={14} color="var(--color-text-muted)" />
                          )}
                          <span>{service.professionalName || "Profissional"}</span>
                          <span className={styles.metaDot}>•</span>
                          <span>{service.timeSlotText} ({service.durationFormatted})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location Bar */}
              <div className={styles.locationBarCompact}>
                <div className={styles.locationLeft}>
                  <MapPin size={16} className={styles.locationPinIcon} />
                  <span className={styles.locationAddressText}>{siteSettings.salonAddress || "Endereço não configurado"}</span>
                </div>
                <a href={siteSettings.mapsLink || "#"} target="_blank" rel="noopener noreferrer" className={styles.routeLinkCompact}>
                  Rota <ExternalLink size={12} />
                </a>
              </div>


              {/* Action Hub */}
              <div className={styles.actionHub}>
                {nextAppt.status === "pending" && !nextAppt.paymentStatus.includes("paid") && (
                  <button className={styles.heroPaymentBtn} onClick={() => handleOpenPayment(nextAppt)}>
                    <div className={styles.heroPaymentLeft}>
                      <CreditCard size={18} />
                      <span>Pagar online</span>
                    </div>
                    <div className={styles.heroPaymentRight}>
                      <span>R$ {nextAppt.price ? nextAppt.price.toFixed(2).replace('.', ',') : '0,00'}</span>
                      <ArrowRight size={16} />
                    </div>
                  </button>
                )}

                <div className={styles.quickActionsGrid}>
                  <button className={styles.btnQuickAction} onClick={handleCalendar}>
                    <Calendar size={16} className={styles.quickActionIcon} />
                    <span>Calendário</span>
                  </button>
                  <button className={styles.btnQuickAction} onClick={handleNavigateReschedule}>
                    <RotateCcw size={16} className={styles.quickActionIcon} />
                    <span>Remarcar</span>
                  </button>
                  <button className={`${styles.btnQuickAction} ${styles.btnQuickActionDanger}`} onClick={() => setCancelingId(nextAppt.id)}>
                    <XCircle size={16} className={styles.quickActionIconDanger} />
                    <span>Cancelar</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State matching Image 2 perfectly */
            <div className={styles.emptyNextCard}>
              <div className={styles.emptyCalendarCircleWrapper}>
                <div className={styles.emptyCalendarCircle}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#D96B52" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="3" ry="3"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                    <circle cx="8" cy="14" r="1" fill="#D96B52"></circle>
                    <circle cx="12" cy="14" r="1" fill="#D96B52"></circle>
                    <circle cx="16" cy="14" r="1" fill="#D96B52"></circle>
                    <circle cx="8" cy="18" r="1" fill="#D96B52"></circle>
                    <circle cx="12" cy="18" r="1" fill="#D96B52"></circle>
                    <circle cx="16" cy="18" r="1" fill="#D96B52"></circle>
                  </svg>
                </div>
                <span className={styles.sparkleTL}>✦</span>
                <span className={styles.sparkleTR}>✧</span>
                <span className={styles.sparkleBL}>✦</span>
              </div>

              <h2 className={styles.emptyCardTitle}>NENHUM AGENDAMENTO FUTURO</h2>
              <p className={styles.emptyCardSub}>Você não possui horários agendados no momento.</p>

              <button 
                className={styles.btnAgendarNovo}
                onClick={() => router.push("/agendar")}
              >
                <Calendar size={18} />
                <span>Agendar Novo Serviço</span>
              </button>

              <div className={styles.sparkleDivider}>
                <span className={styles.sparkleDividerLine} />
                <div className={styles.sparkleDividerIcon}>✦</div>
                <span className={styles.sparkleDividerLine} />
              </div>

              <div className={styles.emptyCardTip}>
                <div className={styles.tipIconCircle}>
                  ✦
                </div>
                <span>Escolha o serviço ideal para você e cuide-se.</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className={styles.rightColumn}>
          {/* Loyalty Program Card */}
          <div className={styles.loyaltyCard}>
            <div className={styles.loyaltyHeader}>
              <div className={styles.loyaltyHeaderIconCircle}>
                <Star size={20} fill="#E07A5F" color="#E07A5F" />
              </div>
              <div className={styles.loyaltyHeaderText}>
                <h3 className={styles.loyaltyTitle}>Seu progresso</h3>
                <span className={styles.loyaltySubtitle}>Programa de fidelidade</span>
              </div>
            </div>
            
            {/* 5-step track with horizontal dashed line */}
            <div className={styles.loyaltyProgressTrack}>
              <div className={styles.dashedConnectLine} />
              {Array.from({ length: loyaltySettings?.stampsRequired || 5 }).map((_, i) => {
                const isFilled = i < stats.stamps;
                return (
                  <div key={i} className={`${styles.loyaltyStepCircle} ${isFilled ? styles.loyaltyStepFilled : ''}`}>
                    {i + 1}
                  </div>
                );
              })}
            </div>
            
            <p className={styles.loyaltyCount}>
              {stats.stamps} de {loyaltySettings?.stampsRequired || 5} atendimentos
            </p>
            <p className={styles.loyaltyDesc}>
              Complete {loyaltySettings?.stampsRequired || 5} atendimentos e ganhe <strong className={styles.loyaltyPrizeText}>{loyaltySettings?.prizeName || "1 Hidratação Grátis."}</strong>
            </p>

            {stats.availablePrizes > 0 ? (
              <button 
                className={styles.btnClaimPrize} 
                onClick={handleClaim}
                style={{
                  width: "100%",
                  marginTop: "14px",
                  padding: "12px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #10B981, #059669)",
                  color: "#FFF",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
                }}
              >
                <Gift size={18} /> Resgatar {loyaltySettings?.prizeName} ({stats.availablePrizes})
              </button>
            ) : (
              <div className={styles.loyaltyFooterRow}>
                <button 
                  type="button" 
                  className={styles.loyaltyRulesLink}
                  onClick={() => alert(`Regras do Programa de Fidelidade:\n\n1. A cada serviço concluído você acumula 1 carimbo.\n2. Ao acumular ${loyaltySettings?.stampsRequired || 5} carimbos, você ganha: ${loyaltySettings?.prizeName || "1 Hidratação Grátis"}.\n3. Os carimbos têm validade de ${loyaltySettings?.expirationDays || 90} dias.`)}
                >
                  <span>Ver regras</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Recent History Card */}
          <div className={styles.recentHistoryCard}>
            <div className={styles.cardHeaderFlex}>
              <div className={styles.historyTitleGroup}>
                <div className={styles.historyIconCircle}>
                  <RotateCcw size={18} color="#D96B52" />
                </div>
                <h2 className={styles.historyCardTitle}>HISTÓRICO RECENTE</h2>
              </div>
              <button className={styles.viewAllLink} onClick={() => setShowHistoryModal(true)}>
                Ver todos &gt;
              </button>
            </div>
            
            {historyAppts.length === 0 ? (
              <div className={styles.emptyHistoryState}>
                <div className={styles.emptyHistoryCircle}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D96B52" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    <path d="M9 12h6"></path>
                    <path d="M9 16h4"></path>
                  </svg>
                  <span className={styles.historySparkleTR}>✨</span>
                </div>
                <p className={styles.emptyHistoryText}>Nenhum histórico recente.</p>
              </div>
            ) : (
              <div className={styles.historyList}>
                {historyAppts.slice(0, 3).map((appt) => {
                  const statusInfo = getStatusDisplay(appt.status, appt.paymentStatus);
                  const paymentInfo = getPaymentBadge(appt.paymentStatus);
                  return (
                    <div key={appt.id} className={styles.historyItem}>
                      <div className={styles.historyMain}>
                        <div className={`${styles.historyIconWrapper} ${statusInfo.iconWrapperClass}`}>
                          {statusInfo.icon}
                        </div>
                        <div className={styles.historyDetails}>
                          {renderHistoryServices(appt.service)}
                          <span className={styles.historyInfo}>{appt.date} • {appt.time}</span>
                          <div className={styles.historySubMeta}>
                            <span className={styles.historyPrice}>R$ {appt.price ? appt.price.toFixed(2).replace('.', ',') : '0,00'}</span>
                            <span className={paymentInfo.class}>{paymentInfo.label}</span>
                          </div>
                        </div>
                      </div>
                      <div className={styles.historyActions}>
                        <span className={statusInfo.class}>{statusInfo.label}</span>
                        <button 
                          className={styles.btnSecondaryOutlinedSmall} 
                          onClick={() => handleBookAgain(appt.service)}
                        >
                          Agendar novamente
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && nextAppt && (
        <div className={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalAccentBar}></div>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Detalhes do Agendamento</h3>
              <button className={styles.modalClose} onClick={() => setShowDetailsModal(false)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ marginBottom: '8px' }}><strong>Data:</strong> {nextAppt.date}</p>
              <p style={{ marginBottom: '8px' }}><strong>Horário Total:</strong> {nextAppt.time} às {nextAppt.endTime || (scheduledServicesWithSlots.length > 0 ? scheduledServicesWithSlots[scheduledServicesWithSlots.length - 1].endTime : "")}</p>
              <p style={{ marginBottom: '12px' }}><strong>Duração Total:</strong> {totalDurationText}</p>
              
              <div style={{ background: 'var(--color-background)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '16px' }}>
                <strong style={{ fontSize: "0.88rem", display: "block", marginBottom: "8px", color: "var(--color-text-main)" }}>
                  Procedimentos Inclusos ({scheduledServicesWithSlots.length}):
                </strong>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {scheduledServicesWithSlots.map((svc, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", borderBottom: i < scheduledServicesWithSlots.length - 1 ? "1px dashed var(--color-border)" : "none", paddingBottom: i < scheduledServicesWithSlots.length - 1 ? "6px" : "0" }}>
                      <span><strong>{svc.name}</strong> <span style={{ color: "var(--color-text-muted)" }}>({svc.professionalName || "Profissional"})</span></span>
                      <span style={{ color: "var(--color-primary-dark)", fontWeight: 600 }}>{svc.timeSlotText} <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>• {svc.durationFormatted}</span></span>
                    </div>
                  ))}
                </div>
              </div>

              <p style={{ marginBottom: '8px' }}><strong>Valor Total:</strong> R$ {nextAppt.price ? nextAppt.price.toFixed(2).replace('.', ',') : '0,00'}</p>
              <p style={{ marginBottom: '16px' }}><strong>Status do Pagamento:</strong> {getPaymentBadge(nextAppt.paymentStatus).label || 'Em Aberto'}</p>
              <p style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}><strong>Local:</strong> {siteSettings.salonAddress || "Endereço não configurado"}</p>
              
              <div style={{ background: 'rgba(193, 99, 85, 0.06)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(193, 99, 85, 0.2)' }}>
                <p style={{ fontSize: "0.84rem", color: "var(--color-primary-dark)", margin: 0 }}>
                  <strong>Informação importante:</strong> Chegue com 10 minutos de antecedência ao salão para a preparação do procedimento.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className={styles.modalOverlay} onClick={() => setShowHistoryModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalAccentBar}></div>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Todos os Agendamentos</h3>
              <button className={styles.modalClose} onClick={() => setShowHistoryModal(false)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              {myAppts.length === 0 ? (
                <p style={{ color: "var(--color-text-muted)" }}>Nenhum agendamento encontrado.</p>
              ) : (
                <>
                  {myAppts.slice(0, visibleDashboardApptsCount).map((appt) => {
                    const statusInfo = getStatusDisplay(appt.status, appt.paymentStatus);
                    const paymentInfo = getPaymentBadge(appt.paymentStatus);
                    return (
                      <div key={appt.id} className={styles.historyItem} style={{ marginBottom: "12px" }}>
                        <div className={styles.historyMain}>
                          <div className={`${styles.historyIconWrapper} ${statusInfo.iconWrapperClass}`}>
                            {statusInfo.icon}
                          </div>
                          <div className={styles.historyDetails}>
                            {renderHistoryServices(appt.service)}
                            <span className={styles.historyInfo}>{appt.date} • {appt.time}</span>
                            <div className={styles.historySubMeta}>
                              <span className={styles.historyPrice}>R$ {appt.price ? appt.price.toFixed(2).replace('.', ',') : '0,00'}</span>
                              <span className={paymentInfo.class}>{paymentInfo.label}</span>
                            </div>
                          </div>
                        </div>
                        <div className={styles.historyActions}>
                          <span className={statusInfo.class}>{statusInfo.label}</span>
                          <button 
                            className={styles.btnSecondaryOutlinedSmall} 
                            onClick={() => handleBookAgain(appt.service)}
                          >
                            Agendar novamente
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {myAppts.length > visibleDashboardApptsCount && (
                    <div className={styles.loadMoreContainer}>
                      <button
                        className={styles.loadMoreBtn}
                        disabled={isLoadingMoreDashboard}
                        onClick={() => {
                          setIsLoadingMoreDashboard(true);
                          setTimeout(() => {
                            setVisibleDashboardApptsCount(prev => prev + 10);
                            setIsLoadingMoreDashboard(false);
                          }, 600);
                        }}
                      >
                        {isLoadingMoreDashboard ? (
                          <>
                            <RefreshCw size={18} className={styles.spinner} />
                            <span>Carregando mais agendamentos...</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown size={18} />
                            <span>Carregar mais agendamentos ({myAppts.length - visibleDashboardApptsCount} restantes)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelingId !== null && (
        <div className={styles.modalOverlay} onClick={() => setCancelingId(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className={styles.modalAccentBar} style={{ background: "var(--color-error)" }}></div>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ color: "var(--color-error)" }}>Cancelar Agendamento</h3>
              <button className={styles.modalClose} onClick={() => setCancelingId(null)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ marginBottom: "16px", color: "var(--color-text-main)" }}>
                Tem certeza que deseja cancelar este agendamento? Esta ação desmarcará seu horário.
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                <button 
                  className={styles.btnSecondaryOutlined} 
                  onClick={() => setCancelingId(null)}
                >
                  Manter Agendamento
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleCancel}
                  style={{ background: "var(--color-error)", borderColor: "var(--color-error)" }}
                >
                  Confirmar Cancelamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payingAppt && (
        <div className={styles.modalOverlay} onClick={() => setPayingAppt(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className={styles.modalAccentBar} style={{ background: "linear-gradient(90deg, #10b981 0%, #059669 100%)" }}></div>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CreditCard size={20} color="#10b981" /> Pagamento do Agendamento
              </h3>
              <button className={styles.modalClose} onClick={() => setPayingAppt(null)}><X size={20} /></button>
            </div>

            <div className={styles.modalBody}>
              {/* Appt Info */}
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.9rem" }}>
                  <span style={{ color: "#64748b" }}>Serviço</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{payingAppt.service}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.9rem" }}>
                  <span style={{ color: "#64748b" }}>Data & Horário</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{payingAppt.date} às {payingAppt.time}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px dashed #cbd5e1" }}>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>Total</span>
                  <span style={{ fontWeight: 800, color: "#b8574c", fontSize: "1.1rem" }}>
                    R$ {payingAppt.price ? payingAppt.price.toFixed(2).replace('.', ',') : '0,00'}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              {!dashPixData && (
                <>
                  <label style={{ display: "block", fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", marginBottom: "12px" }}>
                    Selecione a Forma de Pagamento:
                  </label>

                  <div 
                    className={`${styles.dashPaymentOption} ${dashPaymentMethod === 'pix' ? styles.dashPaymentOptionSelected : ''}`}
                    onClick={() => setDashPaymentMethod('pix')}
                  >
                    <QrCode size={24} color="#059669" />
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>Pix Automático (Mercado Pago)</div>
                      <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Aprovação instantânea via QR Code ou Copia e Cola</div>
                    </div>
                  </div>

                  <div 
                    className={`${styles.dashPaymentOption} ${dashPaymentMethod === 'credit' ? styles.dashPaymentOptionSelected : ''}`}
                    onClick={() => setDashPaymentMethod('credit')}
                  >
                    <CreditCard size={24} color="#0284c7" />
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>Cartão de Crédito</div>
                      <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Pague diretamente no cartão</div>
                    </div>
                  </div>
                </>
              )}

              {dashPaymentError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: "14px", marginTop: "14px", fontSize: "0.88rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{dashPaymentError}</span>
                </div>
              )}

              {/* Credit Card Fields */}
              {dashPaymentMethod === 'credit' && !dashPixData && (
                <div style={{ marginTop: "16px", background: "#ffffff", border: "1.5px solid #e2e8f0", borderRadius: "16px", padding: "18px" }}>
                  <div className={styles.dashFormGroup}>
                    <label>Número do Cartão</label>
                    <input 
                      type="text" 
                      placeholder="0000 0000 0000 0000" 
                      value={dashCardNumber}
                      onChange={(e) => setDashCardNumber(formatDashCardNumber(e.target.value))}
                      maxLength={19}
                    />
                  </div>

                  <div className={styles.dashFormGroup}>
                    <label>Nome Impresso no Cartão</label>
                    <input 
                      type="text" 
                      placeholder="NOME COMO ESTÁ NO CARTÃO" 
                      value={dashCardholderName}
                      onChange={(e) => setDashCardholderName(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className={styles.dashFormGroup}>
                      <label>Validade (MM/AA)</label>
                      <input 
                        type="text" 
                        placeholder="12/28" 
                        value={dashExpiryDate}
                        onChange={(e) => setDashExpiryDate(formatDashExpiry(e.target.value))}
                        maxLength={5}
                      />
                    </div>

                    <div className={styles.dashFormGroup}>
                      <label>CVV / Cód.</label>
                      <input 
                        type="password" 
                        placeholder="123" 
                        value={dashCvv}
                        onChange={(e) => setDashCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        maxLength={4}
                      />
                    </div>
                  </div>

                  <div className={styles.dashFormGroup} style={{ marginBottom: 0 }}>
                    <label>CPF do Titular</label>
                    <input 
                      type="text" 
                      placeholder="000.000.000-00" 
                      value={dashCpf}
                      onChange={(e) => setDashCpf(formatDashCpf(e.target.value))}
                      maxLength={14}
                    />
                  </div>
                </div>
              )}

              {/* Real Pix View */}
              {dashPixData && (
                <div style={{ textAlign: "center", marginTop: "12px" }}>
                  <div style={{ background: "#f8fafc", border: "2px dashed #cbd5e1", borderRadius: "18px", padding: "16px", margin: "12px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <img 
                      src={dashPixData.qrCodeBase64 ? `data:image/png;base64,${dashPixData.qrCodeBase64}` : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(dashPixData.qrCode)}`} 
                      alt="QR Code Pix Mercado Pago" 
                      style={{ width: "180px", height: "180px", objectFit: "contain", borderRadius: "12px", background: "#ffffff", padding: "8px", border: "1px solid #cbd5e1" }}
                    />

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", fontSize: "0.85rem", color: "#059669", fontWeight: 700 }}>
                      <span className={styles.pulseDot} />
                      <span>Aguardando confirmação do pagamento...</span>
                    </div>
                  </div>

                  <div style={{ textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Código Pix Copia e Cola:
                  </div>
                  <div style={{ background: "#ffffff", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "10px", fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all", maxHeight: "70px", overflowY: "auto", marginTop: "4px", textAlign: "left" }}>
                    {dashPixData.qrCode}
                  </div>

                  <button 
                    type="button"
                    onClick={copyDashPixCode}
                    style={{ width: "100%", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", padding: "12px", borderRadius: "12px", fontWeight: 700, fontSize: "0.92rem", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "12px" }}
                  >
                    {dashPixData.copied ? <CheckCircle2 size={18} /> : <QrCode size={18} />}
                    <span>{dashPixData.copied ? "Código Pix Copiado!" : "Copiar Código Pix"}</span>
                  </button>
                </div>
              )}

              {/* Submit Buttons */}
              {!dashPixData && (
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" }}>
                  <button 
                    type="button"
                    className={styles.btnSecondaryOutlined} 
                    onClick={() => setPayingAppt(null)}
                    disabled={dashIsProcessing}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button"
                    className="btn-primary" 
                    onClick={handleProcessDashPayment}
                    disabled={dashIsProcessing || !dashPaymentMethod}
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", borderColor: "#10b981" }}
                  >
                    {dashIsProcessing ? "Processando..." : dashPaymentMethod === 'pix' ? "Gerar QR Code Pix" : "Pagar com Cartão"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
