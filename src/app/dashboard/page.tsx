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

  // Filters: strictly show appointments for the logged-in user
  const myAppts = appointments.filter(a => user && a.clientEmail?.toLowerCase() === user.email?.toLowerCase());

  const upcomingAppts = myAppts.filter(a => a.status === "confirmed" || a.status === "pending");
  const historyAppts = myAppts.filter(a => a.status === "completed" || a.status === "canceled" || a.status === "rescheduled");
  const nextAppt = upcomingAppts[0];

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

  if (!user) return <div style={{ padding: "120px", textAlign: "center" }}>Verificando credenciais...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Olá, {user.name?.split(' ')[0] || "Cliente"}</h1>
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
            <div className={styles.nextAppointmentCard} style={{ textAlign: "center", padding: "40px 24px" }}>
              <CalendarDays size={48} color="var(--color-text-muted)" style={{ margin: "0 auto 16px" }} />
              <h2 className={styles.cardTitle} style={{ marginBottom: "8px" }}>Nenhum Agendamento Futuro</h2>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginBottom: "24px" }}>
                Você não possui horários agendados no momento.
              </p>
              <button 
                className={styles.btnPrimaryFilled}
                onClick={() => router.push("/agendar")}
                style={{ width: "auto", margin: "0 auto", padding: "12px 28px" }}
              >
                Agendar Novo Serviço
              </button>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className={styles.rightColumn}>
          {/* Loyalty Program Card */}
          <div className={styles.loyaltyCard}>
            <div className={styles.loyaltyHeader}>
              <Star size={24} color="var(--color-accent, #E67E22)" fill="var(--color-accent, #E67E22)" />
              <div>
                <h3 className={styles.loyaltyTitle}>Seu progresso</h3>
                <span className={styles.loyaltySubtitle}>Programa de fidelidade</span>
              </div>
            </div>
            
            <div className={styles.loyaltyStampsGrid}>
              {Array.from({ length: loyaltySettings?.stampsRequired || 5 }).map((_, i) => {
                const isFilled = i < stats.stamps;
                return isFilled ? (
                  <div key={i} className={styles.loyaltyStampFilled} title={`Atendimento ${i + 1} concluído`}>
                    <Star size={16} fill="currentColor" />
                  </div>
                ) : (
                  <div key={i} className={styles.loyaltyStampCircle} title={`Atendimento ${i + 1}`}>
                    {i + 1}
                  </div>
                );
              })}
            </div>
            
            <p className={styles.loyaltyCount}>
              {stats.stamps} de {loyaltySettings?.stampsRequired || 5} atendimentos
            </p>
            <p className={styles.loyaltyDesc}>
              Complete {loyaltySettings?.stampsRequired || 5} atendimentos e ganhe <strong>{loyaltySettings?.prizeName || "1 Hidratação Grátis"}</strong>.
            </p>

            {stats.availablePrizes > 0 ? (
              <button 
                className={styles.btnClaimPrize} 
                onClick={handleClaim}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "12px",
                  borderRadius: "8px",
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
              <button 
                type="button" 
                className={styles.loyaltyRulesLink}
                onClick={() => alert(`Regras do Programa de Fidelidade:\n\n1. A cada serviço concluído você acumula 1 carimbo.\n2. Ao acumular ${loyaltySettings?.stampsRequired || 5} carimbos, você ganha: ${loyaltySettings?.prizeName || "1 Hidratação Grátis"}.\n3. Os carimbos têm validade de ${loyaltySettings?.expirationDays || 90} dias.`)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                Ver regras
              </button>
            )}
          </div>

          {/* Recent History Card */}
          <div className={styles.recentHistoryCard}>
            <div className={styles.cardHeaderFlex}>
              <h2 className={styles.cardTitle} style={{ margin: 0 }}><RotateCcw size={20} /> Histórico recente</h2>
              <button className={styles.viewAllLink} onClick={() => setShowHistoryModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Ver todos &gt;</button>
            </div>
            
            {historyAppts.length === 0 && (
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginTop: "16px" }}>Nenhum histórico recente.</p>
            )}

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
                      <span className={styles.historyServiceName}>{appt.service}</span>
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
                          <span className={styles.historyServiceName}>{appt.service}</span>
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
