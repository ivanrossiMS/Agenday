"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Check, ArrowRight, ArrowLeft, CreditCard, QrCode, Store, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import styles from "./page.module.css";
import Calendar from "@/components/Calendar";
import { useAuth } from "@/context/AuthContext";
import { useServices } from "@/context/ServicesContext";
import { useAppointments } from "@/context/AppointmentsContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";

// Helpers para cálculo de horas
const timeToMins = (t: string) => {
  if (!t || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

const minsToTime = (m: number) => {
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
};

function AgendarFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, login, register } = useAuth();
  const { services } = useServices();
  const { appointments, addAppointment, closedDates, blockedTimeSlots } = useAppointments();
  const { settings } = useSiteSettings();
  
  const initialServiceParam = searchParams.get("servicos");
  const initialServicesList = initialServiceParam ? initialServiceParam.split(",") : [];
  const initialStepParam = searchParams.get("step");
  
  const [step, setStep] = useState(initialStepParam ? parseInt(initialStepParam) : 1);
  const [selectedServices, setSelectedServices] = useState<string[]>(initialServicesList);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"credit" | "pix" | "local" | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [confirmedApptData, setConfirmedApptData] = useState<{
    service: string;
    date: string;
    time: string;
    price: number;
    paymentStatus: string;
  } | null>(null);
  
  // Pix State
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
    paymentId: string;
    appointmentId: number;
    copied: boolean;
  } | null>(null);
  const [pendingApptData, setPendingApptData] = useState<{
    id: number;
    date: string;
    time: string;
    endTime: string;
    service: string;
    price: number;
    clientName: string;
    clientEmail: string;
  } | null>(null);

  // Credit Card Form State
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardCpf, setCardCpf] = useState("");
  // Auth Form State
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");

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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (isLogin) {
      const result = await login(email, password);
      if (!result.success || !result.user) {
        setAuthError(result.error || "Usuário não encontrado. Alterne para a aba de Cadastro para criar sua conta.");
        return;
      }
    } else {
      register(name, email, password, birthDate, phone);
    }
    handleNext();
  };

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const formatCpf = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    let res = digits;
    if (digits.length > 3) res = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length > 6) res = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    if (digits.length > 9) res = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    return res;
  };

  const handleNext = () => setStep((s) => Math.min(4, s + 1));
  const handlePrev = () => {
    setStep((s) => {
      if (s === 4 && user) return 2;
      return Math.max(1, s - 1);
    });
  };

  const toggleService = (id: string) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const clientWorkDays = settings.workDays || [1, 2, 3, 4, 5, 6];
  const disabledDaysOfWeek = [0, 1, 2, 3, 4, 5, 6].filter(d => !clientWorkDays.includes(d));

  const generateAvailableTimes = (date: Date) => {
    if (!clientWorkDays.includes(date.getDay())) {
      return [];
    }

    const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    const dayAppts = appointments.filter(a => a.date === dateStr && a.status !== 'canceled');

    const startDay = timeToMins(settings.businessStart || "09:00");
    const endDay = timeToMins(settings.businessEnd || "18:00");
    
    const slots: { time: string, isUnavailable: boolean }[] = [];
    
    for (let m = startDay; m < endDay; m += 30) {
      const slotStart = m;
      const slotEnd = m + totalDuration;
      
      if (slotEnd > endDay) {
        slots.push({ time: minsToTime(slotStart), isUnavailable: true });
        continue;
      }
      
      const timeSlotStr = minsToTime(slotStart);
      
      let isSlotBlocked = false;
      for (let checkM = slotStart; checkM < slotEnd; checkM += 30) {
        if (blockedTimeSlots.includes(`${dateStr}-${minsToTime(checkM)}`)) {
          isSlotBlocked = true;
          break;
        }
      }
      
      let isPast = false;
      const now = new Date();
      if (dateStr === format(now, 'dd/MM/yyyy')) {
        const currentMins = now.getHours() * 60 + now.getMinutes();
        if (slotStart <= currentMins) {
          isPast = true;
        }
      }
      
      const hasOverlap = dayAppts.some(apt => {
        const aptStart = timeToMins(apt.time);
        const aptEnd = apt.endTime ? timeToMins(apt.endTime) : aptStart + 60;
        return slotStart < aptEnd && slotEnd > aptStart;
      });
      
      slots.push({ time: timeSlotStr, isUnavailable: hasOverlap || isSlotBlocked || isPast });
    }
    return slots;
  };

  // Pix Polling Effect: checks payment status every 3 seconds while pix modal is active
  useEffect(() => {
    if (!pixModalOpen || !pixData?.appointmentId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/mercadopago/status?appointment_id=${pixData.appointmentId}&payment_id=${pixData.paymentId}`);
        const data = await res.json();

        if (data.isPaid && pendingApptData) {
          clearInterval(interval);
          addAppointment({
            id: pendingApptData.id,
            date: pendingApptData.date,
            time: pendingApptData.time,
            endTime: pendingApptData.endTime,
            service: pendingApptData.service,
            price: pendingApptData.price,
            status: 'confirmed',
            paymentStatus: 'paid_pix',
            clientName: pendingApptData.clientName,
            clientEmail: pendingApptData.clientEmail,
            mpPaymentId: pixData.paymentId,
            mpPaymentMethod: 'pix',
            mpStatus: 'approved'
          });

          setConfirmedApptData({
            service: pendingApptData.service,
            date: pendingApptData.date,
            time: pendingApptData.time,
            price: pendingApptData.price,
            paymentStatus: 'paid_pix'
          });

          setPixModalOpen(false);
          setShowSuccessModal(true);
        }
      } catch (err) {
        console.error("Error polling Pix status:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pixModalOpen, pixData, pendingApptData]);

  const copyPixCode = () => {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setPixData(prev => prev ? { ...prev, copied: true } : null);
    setTimeout(() => {
      setPixData(prev => prev ? { ...prev, copied: false } : null);
    }, 3000);
  };

  const getSelectedObjects = () => services.filter(s => selectedServices.includes(s.id));
  const totalPrice = getSelectedObjects().reduce((acc, curr) => acc + curr.price, 0);
  const totalDuration = getSelectedObjects().reduce((acc, curr) => acc + curr.duration, 0);

  const handleComplete = async () => {
    if (!user || !selectedDate || !selectedTime) return;
    setPaymentError("");

    const selectedDateStr = `${String(selectedDate.getDate()).padStart(2, '0')}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${selectedDate.getFullYear()}`;
    const servicesStr = getSelectedObjects().map(s => s.name).join(" + ");
    const endTime = minsToTime(timeToMins(selectedTime) + totalDuration);
    const appointmentId = Date.now();

    // 1. Pagar no Salão (Local)
    if (paymentMethod === 'local') {
      addAppointment({
        id: appointmentId,
        date: selectedDateStr,
        time: selectedTime,
        endTime: endTime,
        service: servicesStr,
        price: totalPrice,
        status: 'pending',
        paymentStatus: 'open',
        clientName: user.name,
        clientEmail: user.email,
      });

      setConfirmedApptData({
        service: servicesStr,
        date: selectedDateStr,
        time: selectedTime,
        price: totalPrice,
        paymentStatus: 'open'
      });
      setShowSuccessModal(true);
      return;
    }

    // 2. Pix Automático via Mercado Pago
    if (paymentMethod === 'pix') {
      setIsProcessingPayment(true);
      try {
        setPendingApptData({
          id: appointmentId,
          date: selectedDateStr,
          time: selectedTime,
          endTime: endTime,
          service: servicesStr,
          price: totalPrice,
          clientName: user.name,
          clientEmail: user.email,
        });

        const res = await fetch("/api/mercadopago/pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId,
            amount: totalPrice,
            serviceName: servicesStr,
            clientName: user.name,
            clientEmail: user.email,
            date: selectedDateStr,
            time: selectedTime,
            endTime
          })
        });

        const data = await res.json();
        setIsProcessingPayment(false);

        if (!res.ok || data.error) {
          setPaymentError(data.error || "Não foi possível gerar o código Pix.");
          setPendingApptData(null);
          return;
        }

        setPixData({
          qrCode: data.qrCode,
          qrCodeBase64: data.qrCodeBase64,
          paymentId: data.paymentId,
          appointmentId,
          copied: false
        });
        setPixModalOpen(true);
      } catch (err: any) {
        setIsProcessingPayment(false);
        setPendingApptData(null);
        setPaymentError("Ocorreu um erro ao conectar com o serviço Pix.");
      }
      return;
    }

    // 3. Cartão de Crédito via Mercado Pago
    if (paymentMethod === 'credit') {
      if (!cardNumber || cardNumber.replace(/\D/g, "").length < 15) {
        setPaymentError("Número do cartão de crédito inválido.");
        return;
      }
      if (!expiryDate || expiryDate.length < 5) {
        setPaymentError("Validade do cartão inválida (MM/AA).");
        return;
      }
      if (!cvv || cvv.length < 3) {
        setPaymentError("Código de segurança (CVV) inválido.");
        return;
      }

      setIsProcessingPayment(true);
      try {
        const [expMonth, expYear] = expiryDate.split("/");

        const res = await fetch("/api/mercadopago/card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId,
            amount: totalPrice,
            serviceName: servicesStr,
            clientName: user.name,
            clientEmail: user.email,
            cardNumber: cardNumber.replace(/\D/g, ""),
            cardholderName: cardholderName || user.name,
            expirationMonth: expMonth,
            expirationYear: expYear,
            securityCode: cvv,
            cpf: cardCpf.replace(/\D/g, ""),
            date: selectedDateStr,
            time: selectedTime,
            endTime
          })
        });

        const data = await res.json();
        setIsProcessingPayment(false);

        if (!res.ok || !data.success) {
          setPaymentError(data.error || "O pagamento com cartão foi recusado pelo Mercado Pago.");
          return;
        }

        // Add appointment ONLY after payment succeeds
        addAppointment({
          id: appointmentId,
          date: selectedDateStr,
          time: selectedTime,
          endTime: endTime,
          service: servicesStr,
          price: totalPrice,
          status: 'confirmed',
          paymentStatus: 'paid_credit',
          clientName: user.name,
          clientEmail: user.email,
          mpPaymentId: data.paymentId,
          mpPaymentMethod: 'credit_card',
          mpStatus: 'approved'
        });

        setConfirmedApptData({
          service: servicesStr,
          date: selectedDateStr,
          time: selectedTime,
          price: totalPrice,
          paymentStatus: 'paid_credit'
        });
        setShowSuccessModal(true);
      } catch (err: any) {
        setIsProcessingPayment(false);
        setPaymentError("Falha ao processar o pagamento com cartão.");
      }
    }
  };


  // If user is already logged in and at step 3, skip to step 4 automatically
  useEffect(() => {
    if (step === 3 && user) {
      handleNext();
    }
  }, [step, user]);

  const isReschedule = searchParams.get("reschedule") === "true";

  const handleCancel = () => {
    router.push("/dashboard");
  };

  return (
    <div className={styles.container}>
      {/* Ambient Light Blobs */}
      <div className={styles.bgBlob1} />
      <div className={styles.bgBlob2} />

      <div className={styles.headerRow}>

        {step > 1 && (
          <button 
            type="button" 
            onClick={handlePrev} 
            className={styles.headerBackBtn}
            title="Voltar etapa"
            aria-label="Voltar etapa"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className={styles.title}>{isReschedule ? "Remarcar Agendamento" : "Agende seu Horário"}</h1>
      </div>
      
      <div className={styles.stepper}>
        {[1, 2, 3, 4].map((s) => (
          <div 
            key={s} 
            className={`${styles.step} ${step === s ? styles.active : ""} ${step > s ? styles.completed : ""}`}
          >
            {step > s ? <Check size={20} /> : s}
          </div>
        ))}
      </div>

      <div className={styles.stepContent}>
        {/* STEP 1: SERVICES */}
        {step === 1 && (
          <div>
            <h2 className={styles.stepTitle}>Escolha os Serviços</h2>
            <p style={{ color: "var(--color-text-muted)", marginBottom: "24px" }}>
              Você pode selecionar mais de um serviço para fazer no mesmo dia.
            </p>
            <div className={styles.serviceList}>
              {services.map(service => {
                const isSelected = selectedServices.includes(service.id);
                return (
                  <div 
                    key={service.id}
                    className={`${styles.serviceItem} ${isSelected ? styles.selected : ""}`}
                    onClick={() => toggleService(service.id)}
                  >
                    <div className={styles.checkboxWrapper}>
                      <div className={styles.checkbox}>
                        <Check size={16} />
                      </div>
                      <div>
                        <div className={styles.serviceName}>{service.name}</div>
                        <div style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>Duração: {service.duration} min</div>
                      </div>
                    </div>
                    <div className={styles.servicePrice}>R$ {service.price},00</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: DATE & TIME */}
        {step === 2 && (
          <div>
            <h2 className={styles.stepTitle}>Escolha a Data e Horário</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "32px", justifyContent: "center" }}>
              <Calendar 
                selectedDate={selectedDate} 
                onSelectDate={setSelectedDate} 
                disabledDaysOfWeek={disabledDaysOfWeek}
                closedDates={closedDates.map(dStr => {
                  const [dd, mm, yyyy] = dStr.split('/');
                  return new Date(Number(yyyy), Number(mm)-1, Number(dd));
                })}
                appointments={appointments}
              />
              
              <div style={{ flex: "1", minWidth: "250px" }}>
                <h3 style={{ marginBottom: "16px", color: "var(--color-text-main)" }}>Horários Disponíveis</h3>
                {selectedDate ? (
                  <div className={styles.timeGrid}>
                    {generateAvailableTimes(selectedDate).map(slot => (
                        <button
                          key={slot.time}
                          disabled={slot.isUnavailable}
                          className={`${styles.timeButton} ${selectedTime === slot.time ? styles.selected : ""}`}
                          onClick={() => setSelectedTime(slot.time)}
                          title={slot.isUnavailable ? "Horário indisponível ou choca com outro agendamento" : ""}
                        >
                          {slot.time}
                        </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--color-text-muted)" }}>Selecione uma data no calendário para ver os horários disponíveis.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: AUTHENTICATION */}
        {step === 3 && !user && (
          <div className={styles.authContainer}>
            <h2 className={styles.stepTitle}>{isLogin ? "Acesse sua conta" : "Crie sua conta"}</h2>
            <p style={{ color: "var(--color-text-muted)", marginBottom: "24px" }}>
              Para finalizar o agendamento, precisamos que você se identifique.
            </p>
            
            {authError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 16px", borderRadius: "12px", marginBottom: "20px", fontSize: "0.88rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px" }}>
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit}>
              {!isLogin && (
                <div className={styles.formGroup}>
                  <label>Nome Completo</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              )}
              {!isLogin && (
                <div className={styles.formGroup}>
                  <label>Tel. WhatsApp</label>
                  <input type="tel" placeholder="(11) 99999-9999" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} required />
                </div>
              )}
              {!isLogin && (
                <div className={styles.formGroup}>
                  <label>Data de Nascimento</label>
                  <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} required />
                </div>
              )}

              <div className={styles.formGroup}>
                <label>E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className={styles.formGroup}>
                <label>Senha</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                {isLogin ? "Entrar" : "Cadastrar"}
              </button>
            </form>
            
            <button 
              className="btn-secondary" 
              style={{ width: "100%", marginTop: "12px", border: "none" }}
              onClick={() => { setIsLogin(!isLogin); setAuthError(""); }}
            >
              {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Faça login"}
            </button>

          </div>
        )}

        {/* STEP 4: PAYMENT */}
        {step === 4 && (
          <div>
            <h2 className={styles.stepTitle}>Resumo e Pagamento</h2>
            
            <div className={styles.summary}>
              {getSelectedObjects().map(s => (
                <div key={s.id} className={styles.summaryRow}>
                  <span>{s.name}</span>
                  <span>R$ {s.price},00</span>
                </div>
              ))}
              <div className={styles.summaryRow} style={{ marginTop: "12px", color: "var(--color-text-muted)" }}>
                <span>Data e Horário</span>
                <span>{selectedDate && format(selectedDate, "dd/MM/yyyy")} às {selectedTime}</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.total}`}>
                <span>Total a Pagar</span>
                <span>R$ {totalPrice},00</span>
              </div>
            </div>

            <h3 style={{ marginBottom: "16px", color: "var(--color-text-main)" }}>Forma de Pagamento</h3>
            <div className={styles.paymentGrid}>
              <div 
                className={`${styles.paymentOption} ${paymentMethod === 'credit' ? styles.selected : ''}`}
                onClick={() => setPaymentMethod('credit')}
              >
                <CreditCard size={24} />
                <div>
                  <div style={{ fontWeight: 600 }}>Cartão de Crédito</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Pagar agora e garantir horário</div>
                </div>
              </div>
              
              <div 
                className={`${styles.paymentOption} ${paymentMethod === 'pix' ? styles.selected : ''}`}
                onClick={() => setPaymentMethod('pix')}
              >
                <QrCode size={24} />
                <div>
                  <div style={{ fontWeight: 600 }}>Pix Automático</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Aprovação instantânea</div>
                </div>
              </div>

              <div 
                className={`${styles.paymentOption} ${paymentMethod === 'local' ? styles.selected : ''}`}
                onClick={() => setPaymentMethod('local')}
              >
                <Store size={24} />
                <div>
                  <div style={{ fontWeight: 600 }}>Pagar no Salão</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Pague no dia do procedimento</div>
                </div>
              </div>
            </div>
            
            {paymentError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "14px 18px", borderRadius: "16px", marginBottom: "20px", fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px" }}>
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <span>{paymentError}</span>
              </div>
            )}

            {paymentMethod === 'credit' && (
              <div className={styles.cardFormContainer}>
                <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <CreditCard size={18} color="#b8574c" /> Dados do Cartão de Crédito
                </h4>
                
                <div className={styles.formGroup}>
                  <label>Número do Cartão</label>
                  <input 
                    type="text" 
                    placeholder="0000 0000 0000 0000" 
                    value={cardNumber} 
                    onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Nome Impresso no Cartão</label>
                  <input 
                    type="text" 
                    placeholder="NOME COMO ESTÁ NO CARTÃO" 
                    value={cardholderName} 
                    onChange={e => setCardholderName(e.target.value.toUpperCase())}
                  />
                </div>

                <div className={styles.cardRow}>
                  <div className={styles.formGroup}>
                    <label>Validade (MM/AA)</label>
                    <input 
                      type="text" 
                      placeholder="12/28" 
                      value={expiryDate} 
                      onChange={e => setExpiryDate(formatExpiry(e.target.value))}
                      maxLength={5}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>CVV / Cód.</label>
                    <input 
                      type="password" 
                      placeholder="123" 
                      value={cvv} 
                      onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                    />
                  </div>
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label>CPF do Titular</label>
                  <input 
                    type="text" 
                    placeholder="000.000.000-00" 
                    value={cardCpf} 
                    onChange={e => setCardCpf(formatCpf(e.target.value))}
                    maxLength={14}
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'pix' && (
              <div className={styles.summary} style={{ border: "1.5px solid #10b981", background: "#f0fdf4" }}>
                <p style={{ color: "#065f46", fontSize: "0.92rem", textAlign: "center", fontWeight: 600 }}>
                  ⚡ Ao confirmar, você verá o QR Code Pix e o código Copia e Cola do Mercado Pago para pagar instantaneamente!
                </p>
              </div>
            )}
            
          </div>
        )}

        <div className={styles.actions}>
          <div className={styles.navigationButtons}>
            {step > 1 && (
              <button 
                type="button" 
                onClick={handlePrev} 
                className={styles.btnBack}
                disabled={isProcessingPayment}
                aria-label="Voltar para a etapa anterior"
              >
                <ArrowLeft size={18} /> Voltar
              </button>
            )}

            {step < 4 ? (
              <button 
                type="button"
                onClick={handleNext} 
                className={`btn-primary ${styles.btnNext}`}
                disabled={
                  (step === 1 && selectedServices.length === 0) || 
                  (step === 2 && (!selectedDate || !selectedTime)) ||
                  (step === 3 && !user)
                }
              >
                Avançar <ArrowRight size={18} />
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleComplete} 
                className={`btn-primary ${styles.btnSubmit}`}
                disabled={!paymentMethod || isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <span>Processando...</span>
                ) : (
                  <span>Confirmar Agendamento</span>
                )}
              </button>
            )}
          </div>

          <div className={styles.cancelWrapper}>
            <button 
              type="button" 
              onClick={handleCancel} 
              className={styles.btnCancel}
              disabled={isProcessingPayment}
            >
              <X size={15} /> Cancelar
            </button>
          </div>
        </div>

        {/* REAL PIX MERCADO PAGO MODAL */}
        {pixModalOpen && pixData && (
          <div className={styles.pixModalOverlay}>
            <div className={styles.pixModalContent}>
              <button 
                type="button"
                onClick={() => setPixModalOpen(false)}
                style={{ position: "absolute", top: 16, right: 16, border: "none", background: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={24} />
              </button>

              <div style={{ display: "inline-flex", padding: "12px", background: "#e6f4ea", borderRadius: "50%", color: "#059669", marginBottom: "12px" }}>
                <QrCode size={36} />
              </div>

              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>
                Pagamento via Pix Automático
              </h2>
              <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: "16px" }}>
                Escaneie o QR Code abaixo no app do seu banco ou use a chave Copia e Cola.
              </p>

              <div className={styles.pixQrWrapper}>
                <img 
                  src={pixData.qrCodeBase64 ? `data:image/png;base64,${pixData.qrCodeBase64}` : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixData.qrCode)}`} 
                  alt="QR Code Pix Mercado Pago" 
                  className={styles.pixQrImage}
                  style={{ width: "180px", height: "180px", objectFit: "contain", borderRadius: "12px", background: "#ffffff", padding: "8px", border: "1px solid #cbd5e1" }}
                />

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: "0.85rem", color: "#059669", fontWeight: 700 }}>
                  <span className={styles.pulseDot} />
                  <span>Aguardando confirmação do pagamento...</span>
                </div>
              </div>

              <div style={{ textTransform: "uppercase", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textAlign: "left" }}>
                Código Pix Copia e Cola:
              </div>
              <div className={styles.pixCodeBox}>
                {pixData.qrCode}
              </div>

              <button 
                type="button"
                className={styles.copyPixBtn}
                onClick={copyPixCode}
              >
                {pixData.copied ? (
                  <>
                    <CheckCircle2 size={20} /> Código Copiado com Sucesso!
                  </>
                ) : (
                  <>
                    <QrCode size={20} /> Copiar Código Pix
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (pixData?.appointmentId) {
                    await fetch(`/api/mercadopago/status?appointment_id=${pixData.appointmentId}&payment_id=${pixData.paymentId}&simulate=true`);
                  }
                  if (pendingApptData) {
                    addAppointment({
                      id: pendingApptData.id,
                      date: pendingApptData.date,
                      time: pendingApptData.time,
                      endTime: pendingApptData.endTime,
                      service: pendingApptData.service,
                      price: pendingApptData.price,
                      status: 'confirmed',
                      paymentStatus: 'paid_pix',
                      clientName: pendingApptData.clientName,
                      clientEmail: pendingApptData.clientEmail,
                      mpPaymentId: pixData?.paymentId,
                      mpPaymentMethod: 'pix',
                      mpStatus: 'approved'
                    });

                    setConfirmedApptData({
                      service: pendingApptData.service,
                      date: pendingApptData.date,
                      time: pendingApptData.time,
                      price: pendingApptData.price,
                      paymentStatus: 'paid_pix'
                    });
                  }
                  setPixModalOpen(false);
                  setShowSuccessModal(true);
                }}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                  color: "#ffffff",
                  marginTop: "14px",
                  padding: "12px",
                  borderRadius: "12px",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Já Paguei / Simular Aprovação Instantânea
              </button>
            </div>
          </div>
        )}

        {/* ULTRA MODERN SUCCESS MODAL */}
        {showSuccessModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}>
            <div style={{
              background: "#ffffff",
              width: "100%",
              maxWidth: "460px",
              borderRadius: "28px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
              padding: "36px 30px 30px",
              textAlign: "center",
              position: "relative",
              border: "1px solid rgba(255, 255, 255, 0.8)"
            }}>
              {/* Icon Badge */}
              <div style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: "0 12px 28px rgba(16, 185, 129, 0.4)"
              }}>
                <CheckCircle2 size={44} strokeWidth={2.5} />
              </div>

              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginBottom: "8px", letterSpacing: "-0.02em" }}>
                Agendamento Confirmado!
              </h2>
              <p style={{ color: "#64748b", fontSize: "0.92rem", marginBottom: "24px", lineHeight: 1.5 }}>
                Sua reserva foi concluída com sucesso. Enviamos a confirmação para você!
              </p>

              {/* Summary Card */}
              {confirmedApptData && (
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "18px",
                  padding: "20px",
                  marginBottom: "24px",
                  textAlign: "left",
                  fontSize: "0.9rem"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px dashed #cbd5e1" }}>
                    <span style={{ color: "#64748b", fontWeight: 500 }}>Serviço(s)</span>
                    <span style={{ color: "#0f172a", fontWeight: 700, textAlign: "right", maxWidth: "220px" }}>
                      {confirmedApptData.service}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ color: "#64748b", fontWeight: 500 }}>Data & Horário</span>
                    <span style={{ color: "#0f172a", fontWeight: 700 }}>
                      {confirmedApptData.date} às {confirmedApptData.time}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ color: "#64748b", fontWeight: 500 }}>Pagamento</span>
                    <span style={{ color: "#0f172a", fontWeight: 600 }}>
                      {confirmedApptData.paymentStatus === 'paid_card' ? 'Cartão de Crédito' : confirmedApptData.paymentStatus === 'paid_pix' ? 'Pix Automático' : 'Pagar no Salão'}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#0f172a", fontWeight: 700 }}>Total</span>
                    <span style={{ color: "var(--color-primary-dark, #b8574c)", fontWeight: 800, fontSize: "1.1rem" }}>
                      R$ {confirmedApptData.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #b8574c 0%, #8f3c33 100%)",
                  color: "#ffffff",
                  padding: "15px 24px",
                  borderRadius: "14px",
                  fontWeight: 700,
                  fontSize: "1rem",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 8px 22px rgba(184, 87, 76, 0.35)",
                  transition: "all 0.2s ease"
                }}
              >
                Ver Meus Agendamentos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>


  );
}

export default function AgendarPage() {
  return (
    <Suspense fallback={<div style={{ padding: "120px", textAlign: "center" }}>Carregando...</div>}>
      <AgendarFlow />
    </Suspense>
  );
}
