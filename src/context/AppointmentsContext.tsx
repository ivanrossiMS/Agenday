"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type ApptStatus = "confirmed" | "pending" | "completed" | "canceled" | "rescheduled";
export type PaymentStatus = "paid_pix" | "paid_credit" | "paid_debit" | "open" | "refunded";

export interface Appointment {
  id: number;
  date: string;
  time: string;
  endTime?: string;
  service: string;
  price: number;
  status: ApptStatus;
  paymentStatus: PaymentStatus;
  clientName: string;
  clientEmail: string;
  mpPaymentId?: string;
  mpPaymentMethod?: string;
  mpQrCode?: string;
  mpQrCodeBase64?: string;
  mpStatus?: string;
}

type AppointmentsContextType = {
  appointments: Appointment[];
  refreshAppointments: () => Promise<void>;
  addAppointment: (appt: Omit<Appointment, "id"> & { id?: number }) => number;
  updateStatus: (id: number, status: ApptStatus) => void;
  updatePayment: (id: number, paymentStatus: PaymentStatus) => void;
  updateAppointment: (id: number, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: number) => void;
  closedDates: string[];
  toggleDateClosed: (dateStr: string) => void;
  blockedTimeSlots: string[];
  toggleTimeSlot: (dateStr: string, time: string) => void;
  blockTimeSlots: (dateStr: string, times: string[]) => void;
};

const AppointmentsContext = createContext<AppointmentsContextType | undefined>(undefined);

export function AppointmentsProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [blockedTimeSlots, setBlockedTimeSlots] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadData() {
      const savedAppts = localStorage.getItem("@agenday:appointments");
      const localAppts: Appointment[] = savedAppts 
        ? JSON.parse(savedAppts).filter((a: any) => 
            a.clientEmail !== "cliente@vip.com" &&
            !((a.mpPaymentMethod || a.mpPaymentId) && (a.paymentStatus === "open" || a.status === "pending"))
          ) 
        : [];
      const savedClosed = localStorage.getItem("@agenday:closedDates");
      const localClosed: string[] = savedClosed ? JSON.parse(savedClosed) : [];
      const savedBlocked = localStorage.getItem("@agenday:blockedTimeSlots");
      const localBlocked: string[] = savedBlocked ? JSON.parse(savedBlocked) : [];

      try {
        const [apptsRes, closedRes, blockedRes] = await Promise.all([
          fetch("/api/appointments").then(r => r.json()).catch(() => ({ configured: false, data: [] })),
          fetch("/api/closed-dates").then(r => r.json()).catch(() => ({ configured: false, data: [] })),
          fetch("/api/blocked-slots").then(r => r.json()).catch(() => ({ configured: false, data: [] }))
        ]);

        if (apptsRes.configured && Array.isArray(apptsRes.data)) {
          if (apptsRes.data.length > 0) {
            const formatted: Appointment[] = apptsRes.data.map((item: any) => ({
              id: Number(item.id),
              date: item.date,
              time: item.time,
              endTime: item.end_time || undefined,
              service: item.service,
              price: Number(item.price) || 0,
              status: item.status as ApptStatus,
              paymentStatus: item.payment_status as PaymentStatus,
              clientName: item.client_name,
              clientEmail: item.client_email,
              mpPaymentId: item.mp_payment_id || undefined,
              mpPaymentMethod: item.mp_payment_method || undefined,
              mpQrCode: item.mp_qr_code || undefined,
              mpQrCodeBase64: item.mp_qr_code_base64 || undefined,
              mpStatus: item.mp_status || undefined,
            })).filter((a: Appointment) => 
              a.clientEmail !== "cliente@vip.com" &&
              !((a.mpPaymentMethod || a.mpPaymentId) && (a.paymentStatus === "open" || a.status === "pending"))
            );
            setAppointments(formatted);
            localStorage.setItem("@agenday:appointments", JSON.stringify(formatted));
          } else if (localAppts.length > 0) {
            setAppointments(localAppts);
            localStorage.setItem("@agenday:appointments", JSON.stringify(localAppts));
            for (const apt of localAppts) {
              fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(apt)
              }).catch(e => console.error("Error seeding appt:", e));
            }
          }
        } else {
          setAppointments(localAppts);
        }

        if (closedRes.configured && Array.isArray(closedRes.data)) {
          if (closedRes.data.length > 0) {
            setClosedDates(closedRes.data);
            localStorage.setItem("@agenday:closedDates", JSON.stringify(closedRes.data));
          } else if (localClosed.length > 0) {
            setClosedDates(localClosed);
            localStorage.setItem("@agenday:closedDates", JSON.stringify(localClosed));
            for (const d of localClosed) {
              fetch("/api/closed-dates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dateStr: d })
              }).catch(e => console.error("Error seeding closed date:", e));
            }
          }
        } else {
          setClosedDates(localClosed);
        }

        if (blockedRes.configured && Array.isArray(blockedRes.data)) {
          if (blockedRes.data.length > 0) {
            setBlockedTimeSlots(blockedRes.data);
            localStorage.setItem("@agenday:blockedTimeSlots", JSON.stringify(blockedRes.data));
          } else if (localBlocked.length > 0) {
            setBlockedTimeSlots(localBlocked);
            localStorage.setItem("@agenday:blockedTimeSlots", JSON.stringify(localBlocked));
            for (const k of localBlocked) {
              fetch("/api/blocked-slots", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slotKey: k })
              }).catch(e => console.error("Error seeding blocked slot:", e));
            }
          }
        } else {
          setBlockedTimeSlots(localBlocked);
        }
      } catch (e) {
        console.error("Erro ao carregar agendamentos da API:", e);
        setAppointments(localAppts);
        setClosedDates(localClosed);
        setBlockedTimeSlots(localBlocked);
      }

      setIsLoaded(true);
    }


    loadData();
  }, []);

  useEffect(() => {
    // Auto-completar agendamentos passados
    const checkCompleted = () => {
      setAppointments(prev => {
        let changed = false;
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        const updated = prev.map(apt => {
          if (apt.status === "confirmed" || apt.status === "pending") {
            const [d, m, y] = apt.date.split('/');
            const aptDate = new Date(Number(y), Number(m) - 1, Number(d));
            
            if (aptDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
              changed = true;
              fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...apt, status: "completed" })
              });
              return { ...apt, status: "completed" as ApptStatus };
            }
            
            if (apt.date === todayStr && apt.endTime) {
              const [h, min] = apt.endTime.split(':').map(Number);
              const endMins = h * 60 + min;
              if (currentMins >= endMins) {
                changed = true;
                fetch("/api/appointments", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...apt, status: "completed" })
                });
                return { ...apt, status: "completed" as ApptStatus };
              }
            }
          }
          return apt;
        });

        return changed ? updated : prev;
      });
    };

    checkCompleted();
    const interval = setInterval(checkCompleted, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("@agenday:appointments", JSON.stringify(appointments));
      localStorage.setItem("@agenday:closedDates", JSON.stringify(closedDates));
      localStorage.setItem("@agenday:blockedTimeSlots", JSON.stringify(blockedTimeSlots));
    }
  }, [appointments, closedDates, blockedTimeSlots, isLoaded]);

  const toggleDateClosed = async (dateStr: string) => {
    const isClosed = closedDates.includes(dateStr);
    const newClosed = isClosed ? closedDates.filter(d => d !== dateStr) : [...closedDates, dateStr];
    setClosedDates(newClosed);

    try {
      if (isClosed) {
        await fetch(`/api/closed-dates?dateStr=${encodeURIComponent(dateStr)}`, { method: "DELETE" });
      } else {
        await fetch("/api/closed-dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dateStr })
        });
      }
    } catch (e) {
      console.error("Erro ao alterar data fechada:", e);
    }
  };

  const toggleTimeSlot = async (dateStr: string, time: string) => {
    const key = `${dateStr}-${time}`;
    const isCurrentlyBlocked = blockedTimeSlots.includes(key);
    const newBlocked = isCurrentlyBlocked
      ? blockedTimeSlots.filter(k => k !== key)
      : [...blockedTimeSlots, key];

    setBlockedTimeSlots(newBlocked);

    try {
      if (isCurrentlyBlocked) {
        await fetch(`/api/blocked-slots?slotKey=${encodeURIComponent(key)}`, { method: "DELETE" });
      } else {
        await fetch("/api/blocked-slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slotKey: key })
        });
      }
    } catch (e) {
      console.error("Erro ao alterar horário bloqueado:", e);
    }
  };

  const blockTimeSlots = async (dateStr: string, times: string[]) => {
    const keysToAdd = times.map(t => `${dateStr}-${t}`);

    setBlockedTimeSlots(prev => {
      const nextSet = new Set([...prev, ...keysToAdd]);
      return Array.from(nextSet);
    });

    for (const key of keysToAdd) {
      try {
        await fetch("/api/blocked-slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slotKey: key })
        });
      } catch (e) {
        console.error("Erro ao bloquear horários:", e);
      }
    }
  };

  const addAppointment = (appt: Omit<Appointment, "id"> & { id?: number }) => {
    const newId = appt.id || Date.now();
    const newAppt: Appointment = { ...appt, id: newId };
    setAppointments(prev => [...prev, newAppt]);

    fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAppt)
    }).catch(e => console.error("Erro ao adicionar agendamento:", e));

    return newId;
  };

  const updateStatus = async (id: number, status: ApptStatus) => {
    const target = appointments.find(a => a.id === id);
    if (!target) return;
    const updated = { ...target, status };
    setAppointments(prev => {
      const next = prev.map(a => a.id === id ? updated : a);
      localStorage.setItem("@agenday:appointments", JSON.stringify(next));
      return next;
    });

    try {
      await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
    }
  };

  const refreshAppointments = async () => {
    try {
      const res = await fetch("/api/appointments");
      const apptsRes = await res.json();
      if (apptsRes.configured && Array.isArray(apptsRes.data)) {
        const formatted: Appointment[] = apptsRes.data.map((item: any) => ({
          id: Number(item.id),
          date: item.date,
          time: item.time,
          endTime: item.end_time || undefined,
          service: item.service,
          price: Number(item.price) || 0,
          status: item.status as ApptStatus,
          paymentStatus: item.payment_status as PaymentStatus,
          clientName: item.client_name,
          clientEmail: item.client_email,
          mpPaymentId: item.mp_payment_id || undefined,
          mpPaymentMethod: item.mp_payment_method || undefined,
          mpQrCode: item.mp_qr_code || undefined,
          mpQrCodeBase64: item.mp_qr_code_base64 || undefined,
          mpStatus: item.mp_status || undefined,
        })).filter((a: Appointment) => 
          a.clientEmail !== "cliente@vip.com" &&
          !((a.mpPaymentMethod || a.mpPaymentId) && (a.paymentStatus === "open" || a.status === "pending"))
        );

        setAppointments(formatted);
        localStorage.setItem("@agenday:appointments", JSON.stringify(formatted));
      }
    } catch (e) {
      console.error("Error refreshing appointments:", e);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refreshAppointments();
    }, 4000);

    const handleFocus = () => refreshAppointments();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const updatePayment = async (id: number, paymentStatus: PaymentStatus) => {
    const target = appointments.find(a => a.id === id);
    if (!target) return;
    const newStatus = (paymentStatus.startsWith('paid_') && target.status === 'pending') ? ('confirmed' as ApptStatus) : target.status;
    const updated = { ...target, paymentStatus, status: newStatus };
    setAppointments(prev => prev.map(a => a.id === id ? updated : a));

    try {
      await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error("Erro ao atualizar pagamento:", e);
    }
  };

  const updateAppointment = async (id: number, updates: Partial<Appointment>) => {
    const target = appointments.find(a => a.id === id);
    if (!target) return;
    const updated = { ...target, ...updates };
    setAppointments(prev => prev.map(a => a.id === id ? updated : a));

    try {
      await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error("Erro ao atualizar agendamento:", e);
    }
  };

  const deleteAppointment = async (id: number) => {
    setAppointments(prev => {
      const filtered = prev.filter(a => a.id !== id);
      localStorage.setItem("@agenday:appointments", JSON.stringify(filtered));
      return filtered;
    });

    try {
      await fetch(`/api/appointments?id=${id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Erro ao deletar agendamento:", e);
    }
  };

  return (
    <AppointmentsContext.Provider value={{ 
      appointments, 
      refreshAppointments,
      addAppointment, 
      updateStatus, 
      updatePayment, 
      updateAppointment,
      deleteAppointment,
      closedDates,
      toggleDateClosed,
      blockedTimeSlots,
      toggleTimeSlot,
      blockTimeSlots
    }}>
      {children}
    </AppointmentsContext.Provider>
  );
}

export const useAppointments = () => {
  const ctx = useContext(AppointmentsContext);
  if (!ctx) throw new Error("useAppointments must be used within AppointmentsProvider");
  return ctx;
};
