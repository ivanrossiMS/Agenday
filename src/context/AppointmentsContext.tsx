"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type ApptStatus = "confirmed" | "pending" | "completed" | "canceled" | "rescheduled";
export type PaymentStatus = "paid_pix" | "paid_credit" | "paid_debit" | "open";

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
}

type AppointmentsContextType = {
  appointments: Appointment[];
  addAppointment: (appt: Omit<Appointment, "id">) => void;
  updateStatus: (id: number, status: ApptStatus) => void;
  updatePayment: (id: number, paymentStatus: PaymentStatus) => void;
  updateAppointment: (id: number, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: number) => void;
  closedDates: string[];
  toggleDateClosed: (dateStr: string) => void;
  blockedTimeSlots: string[];
  toggleTimeSlot: (dateStr: string, time: string) => void;
};

const AppointmentsContext = createContext<AppointmentsContextType | undefined>(undefined);

export function AppointmentsProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [blockedTimeSlots, setBlockedTimeSlots] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [apptsRes, closedRes, blockedRes] = await Promise.all([
          fetch("/api/appointments").then(r => r.json()),
          fetch("/api/closed-dates").then(r => r.json()),
          fetch("/api/blocked-slots").then(r => r.json())
        ]);

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
          })).filter((a: Appointment) => a.clientEmail !== "cliente@vip.com");
          setAppointments(formatted);
        } else {
          const saved = localStorage.getItem("@agenday:appointments");
          if (saved) setAppointments(JSON.parse(saved).filter((a: any) => a.clientEmail !== "cliente@vip.com"));
        }

        if (closedRes.configured && Array.isArray(closedRes.data)) {
          setClosedDates(closedRes.data);
        } else {
          const savedClosed = localStorage.getItem("@agenday:closedDates");
          if (savedClosed) setClosedDates(JSON.parse(savedClosed));
        }

        if (blockedRes.configured && Array.isArray(blockedRes.data)) {
          setBlockedTimeSlots(blockedRes.data);
        } else {
          const savedBlocked = localStorage.getItem("@agenday:blockedTimeSlots");
          if (savedBlocked) setBlockedTimeSlots(JSON.parse(savedBlocked));
        }
      } catch (e) {
        console.error("Erro ao carregar agendamentos da API:", e);
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
    const isBlocked = blockedTimeSlots.includes(key);
    const newBlocked = isBlocked ? blockedTimeSlots.filter(k => k !== key) : [...blockedTimeSlots, key];
    setBlockedTimeSlots(newBlocked);

    try {
      if (isBlocked) {
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

  const addAppointment = async (appt: Omit<Appointment, "id">) => {
    const newId = Date.now();
    const newAppt: Appointment = { ...appt, id: newId };
    setAppointments(prev => [...prev, newAppt]);

    try {
      await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAppt)
      });
    } catch (e) {
      console.error("Erro ao adicionar agendamento:", e);
    }
  };

  const updateStatus = async (id: number, status: ApptStatus) => {
    const target = appointments.find(a => a.id === id);
    if (!target) return;
    const updated = { ...target, status };
    setAppointments(prev => prev.map(a => a.id === id ? updated : a));

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

  const updatePayment = async (id: number, paymentStatus: PaymentStatus) => {
    const target = appointments.find(a => a.id === id);
    if (!target) return;
    const updated = { ...target, paymentStatus };
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
    setAppointments(prev => prev.filter(a => a.id !== id));

    try {
      await fetch(`/api/appointments?id=${id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Erro ao deletar agendamento:", e);
    }
  };

  return (
    <AppointmentsContext.Provider value={{ 
      appointments, 
      addAppointment, 
      updateStatus, 
      updatePayment, 
      updateAppointment,
      deleteAppointment,
      closedDates,
      toggleDateClosed,
      blockedTimeSlots,
      toggleTimeSlot
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
