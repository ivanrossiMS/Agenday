"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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
      let remoteAppts: Appointment[] | null = null;
      let remoteClosed: string[] | null = null;
      let remoteBlocked: string[] | null = null;

      if (isSupabaseConfigured() && supabase) {
        try {
          const [apptsRes, closedRes, blockedRes] = await Promise.all([
            supabase.from("appointments").select("*"),
            supabase.from("closed_dates").select("*"),
            supabase.from("blocked_time_slots").select("*")
          ]);

          if (!apptsRes.error && apptsRes.data) {
            remoteAppts = apptsRes.data.map((item: any) => ({
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
            })).filter(a => a.clientEmail !== "cliente@vip.com");
          }

          if (!closedRes.error && closedRes.data) {
            remoteClosed = closedRes.data.map((item: any) => item.date_str);
          }

          if (!blockedRes.error && blockedRes.data) {
            remoteBlocked = blockedRes.data.map((item: any) => item.slot_key);
          }
        } catch (e) {
          console.error("Erro ao carregar agendamentos do Supabase:", e);
        }
      }

      // Se obtivemos dados do Supabase, usamos eles; caso contrário, usamos o localStorage
      if (remoteAppts !== null) {
        setAppointments(remoteAppts);
      } else {
        const saved = localStorage.getItem("@agenday:appointments");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setAppointments(parsed.filter(a => a.clientEmail !== "cliente@vip.com"));
            }
          } catch (e) {
            setAppointments([]);
          }
        }
      }

      if (remoteClosed !== null) {
        setClosedDates(remoteClosed);
      } else {
        const savedClosed = localStorage.getItem("@agenday:closedDates");
        if (savedClosed) setClosedDates(JSON.parse(savedClosed));
      }

      if (remoteBlocked !== null) {
        setBlockedTimeSlots(remoteBlocked);
      } else {
        const savedBlockedSlots = localStorage.getItem("@agenday:blockedTimeSlots");
        if (savedBlockedSlots) setBlockedTimeSlots(JSON.parse(savedBlockedSlots));
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
              if (isSupabaseConfigured() && supabase) {
                supabase.from("appointments").update({ status: "completed" }).eq("id", apt.id);
              }
              return { ...apt, status: "completed" as ApptStatus };
            }
            
            if (apt.date === todayStr && apt.endTime) {
              const [h, min] = apt.endTime.split(':').map(Number);
              const endMins = h * 60 + min;
              if (currentMins >= endMins) {
                changed = true;
                if (isSupabaseConfigured() && supabase) {
                  supabase.from("appointments").update({ status: "completed" }).eq("id", apt.id);
                }
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

    if (isSupabaseConfigured() && supabase) {
      try {
        if (isClosed) {
          await supabase.from("closed_dates").delete().eq("date_str", dateStr);
        } else {
          await supabase.from("closed_dates").insert({ date_str: dateStr });
        }
      } catch (e) {
        console.error("Erro ao alterar data fechada no Supabase:", e);
      }
    }
  };

  const toggleTimeSlot = async (dateStr: string, time: string) => {
    const key = `${dateStr}-${time}`;
    const isBlocked = blockedTimeSlots.includes(key);
    const newBlocked = isBlocked ? blockedTimeSlots.filter(k => k !== key) : [...blockedTimeSlots, key];
    setBlockedTimeSlots(newBlocked);

    if (isSupabaseConfigured() && supabase) {
      try {
        if (isBlocked) {
          await supabase.from("blocked_time_slots").delete().eq("slot_key", key);
        } else {
          await supabase.from("blocked_time_slots").insert({ slot_key: key });
        }
      } catch (e) {
        console.error("Erro ao alterar horário bloqueado no Supabase:", e);
      }
    }
  };

  const addAppointment = async (appt: Omit<Appointment, "id">) => {
    const newId = Date.now();
    const newAppt: Appointment = { ...appt, id: newId };
    setAppointments(prev => [...prev, newAppt]);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("appointments").insert({
          id: newId,
          date: appt.date,
          time: appt.time,
          end_time: appt.endTime || null,
          service: appt.service,
          price: appt.price,
          status: appt.status,
          payment_status: appt.paymentStatus,
          client_name: appt.clientName,
          client_email: appt.clientEmail
        });
      } catch (e) {
        console.error("Erro ao adicionar agendamento no Supabase:", e);
      }
    }
  };

  const updateStatus = async (id: number, status: ApptStatus) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("appointments").update({ status }).eq("id", id);
      } catch (e) {
        console.error("Erro ao atualizar status do agendamento no Supabase:", e);
      }
    }
  };

  const updatePayment = async (id: number, paymentStatus: PaymentStatus) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, paymentStatus } : a));

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("appointments").update({ payment_status: paymentStatus }).eq("id", id);
      } catch (e) {
        console.error("Erro ao atualizar pagamento do agendamento no Supabase:", e);
      }
    }
  };

  const updateAppointment = async (id: number, updates: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));

    if (isSupabaseConfigured() && supabase) {
      try {
        const payload: any = {};
        if (updates.date !== undefined) payload.date = updates.date;
        if (updates.time !== undefined) payload.time = updates.time;
        if (updates.endTime !== undefined) payload.end_time = updates.endTime;
        if (updates.service !== undefined) payload.service = updates.service;
        if (updates.price !== undefined) payload.price = updates.price;
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.paymentStatus !== undefined) payload.payment_status = updates.paymentStatus;
        if (updates.clientName !== undefined) payload.client_name = updates.clientName;
        if (updates.clientEmail !== undefined) payload.client_email = updates.clientEmail;

        await supabase.from("appointments").update(payload).eq("id", id);
      } catch (e) {
        console.error("Erro ao atualizar agendamento no Supabase:", e);
      }
    }
  };

  const deleteAppointment = async (id: number) => {
    setAppointments(prev => prev.filter(a => a.id !== id));

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("appointments").delete().eq("id", id);
      } catch (e) {
        console.error("Erro ao deletar agendamento no Supabase:", e);
      }
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
