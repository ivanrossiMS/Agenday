"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, CalendarDays, Gift, Star, Clock, CheckCircle2, XCircle, RotateCcw, AlertCircle, MapPin, MoreVertical, Calendar, CheckSquare, Camera, ExternalLink, X, UserCircle, ChevronRight, Eye, CreditCard, ArrowRight } from "lucide-react";
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
  const { appointments, updateStatus, addAppointment } = useAppointments();
  const { getUserStats, claimPrize, settings: loyaltySettings } = useLoyalty();
  const { settings: siteSettings } = useSiteSettings();
  const { services } = useServices();

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");
  
  // Modals state
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const parseApptTimestamp = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return 0;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    let hours = 0;
    let mins = 0;
    if (timeStr && timeStr.includes(':')) {
      const [h, m] = timeStr.split(':').map(Number);
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
      if (timeA !== timeB) return timeB - timeA; // Do último (mais recente) para o mais antigo
      return Number(b.id) - Number(a.id);
    });

  const upcomingAppts = myAppts.filter(a => a.status === "confirmed" || a.status === "pending");
  const historyAppts = myAppts.filter(a => a.status === "completed" || a.status === "canceled" || a.status === "rescheduled");
  
  // Próximo agendamento futuro mais próximo
  const nextAppt = [...upcomingAppts].sort((a, b) => {
    const timeA = parseApptTimestamp(a.date, a.time);
    const timeB = parseApptTimestamp(b.date, b.time);
    return timeA - timeB;
  })[0];


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

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "confirmed": return { label: "Confirmado", icon: <CheckCircle2 size={18} />, class: styles.statusConfirmed, iconWrapperClass: styles.iconConfirmedWrapper };
      case "pending": return { label: "Aguardando Pagto.", icon: <Clock size={18} />, class: styles.statusPending, iconWrapperClass: styles.iconPendingWrapper };
      case "completed": return { label: "Concluído", icon: <CheckCircle2 size={18} />, class: styles.statusCompleted, iconWrapperClass: styles.iconCompletedWrapper };
      case "canceled": return { label: "Cancelado", icon: <XCircle size={18} />, class: styles.statusCanceled, iconWrapperClass: styles.iconCanceledWrapper };
      case "rescheduled": return { label: "Remarcado", icon: <RotateCcw size={18} />, class: styles.statusRescheduled, iconWrapperClass: styles.iconRescheduledWrapper };
      default: return { label: "", icon: null, class: "", iconWrapperClass: "" };
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid_pix": return { label: "Pago no Pix", class: styles.paymentPaid };
      case "paid_credit": return { label: "Pago no Crédito", class: styles.paymentPaid };
      case "paid_debit": return { label: "Pago no Débito", class: styles.paymentPaid };
      case "open": return { label: "Em Aberto", class: styles.paymentOpen };
      default: return { label: "", class: "" };
    }
  };

  const handleCancel = () => {
    if (cancelingId) {
      const aptToCancel = appointments.find(a => a.id === cancelingId);
      updateStatus(cancelingId, "canceled");
      setCancelingId(null);

      if (aptToCancel) {
        const salonName = (siteSettings as any).salonName || "Nosso Salão";
        const phone = siteSettings.whatsappNumber ? siteSettings.whatsappNumber.replace(/\D/g, '') : '';
        const msg = encodeURIComponent(
          `Olá, ${salonName}! 🌸\n\nConfirmamos o cancelamento do meu agendamento:\n📅 *Data:* ${aptToCancel.date}\n⏰ *Horário:* ${aptToCancel.time}\n💅 *Serviço:* ${aptToCancel.service}\n\nO cancelamento foi confirmado.`
        );
        if (phone) {
          window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
        }
      }
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

              {/* Arrival Tip */}
              <div className={styles.arriveTipCompact}>
                <Clock size={14} /> Dica: Chegue com 10 minutos de antecedência.
              </div>

              {/* Action Hub */}
              <div className={styles.actionHub}>
                {nextAppt.status === "pending" && (
                  <button className={styles.heroPaymentBtn}>
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
                  const statusInfo = getStatusDisplay(appt.status);
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
                myAppts.map((appt) => {
                  const statusInfo = getStatusDisplay(appt.status);
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
                })
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
    </div>
  );
}
