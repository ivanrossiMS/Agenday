"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useServices, ServiceItem } from "@/context/ServicesContext";
import { useSiteSettings, SiteSettings } from "@/context/SiteSettingsContext";
import { 
  CalendarDays, Users, Gift, MessageCircle, Ban, 
  CheckCircle2, DollarSign, FileText, QrCode, Plus, Trash2, Edit3, Image as ImageIcon, Layout, X,
  TrendingUp, PieChart, CreditCard, Filter, Sparkles, ChevronDown, Grid, Palette, Cake, LogOut, UserCircle, Camera, Search, User,
  Star, RefreshCw, Clock, Send, Eye, Settings, UploadCloud, Lock, Unlock, XCircle, Bell
} from "lucide-react";
import styles from "./page.module.css";
import { useAppointments } from "@/context/AppointmentsContext";
import { useClients, ClientItem } from "@/context/ClientsContext";
import Calendar from "@/components/Calendar";
import { useLoyalty } from "@/context/LoyaltyContext";
import EditProfileModal from "@/components/EditProfileModal";

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
  const { user, logout, updateProfile } = useAuth();
  const { services, addService, updateService, deleteService } = useServices();
  const { settings, updateSettings } = useSiteSettings();
  const { appointments, updateStatus, updateAppointment, deleteAppointment, addAppointment, closedDates, toggleDateClosed, blockedTimeSlots, toggleTimeSlot } = useAppointments();
  const { clients, updateClient, deleteClient, addClient } = useClients();
  const { settings: loyaltySettings, updateSettings: updateLoyaltySettings, claims: loyaltyClaims, getAllStats, getUserStats, claimPrize } = useLoyalty();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"dashboard" | "services" | "appearance" | "finance" | "loyalty" | "users" | "birthdays">("dashboard");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [agendaFilter, setAgendaFilter] = useState<"all" | "confirmed" | "pending">("all");
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("12:00");
  
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
    whatsappNumber: "",
    salonAddress: "",
    mapsLink: "",
    preparationSteps: [],
  });
  
  const [birthdayFilter, setBirthdayFilter] = useState<"month" | "day" | "all">("month");
  const [bdaySelectedMonth, setBdaySelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [bdaySearch, setBdaySearch] = useState<string>("");

  // Financial Filters State
  const [finDateFilter, setFinDateFilter] = useState<"all" | "today" | "this_month">("all");
  const [finStatusFilter, setFinStatusFilter] = useState<"all" | "paid" | "pending" | "paid_pix" | "paid_credit" | "paid_debit" | "open">("all");
  const [finClientFilter, setFinClientFilter] = useState<string>("all");

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
      return {
        name: c.name,
        dateStr: `${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}`,
        day: d,
        month: m,
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
        whatsappNumber: settings.whatsappNumber || "",
        salonAddress: settings.salonAddress || "",
        mapsLink: settings.mapsLink || "",
        preparationSteps: settings.preparationSteps || [],
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

  const handleEditClientClick = (client: ClientItem) => {
    setClientForm(client);
    setShowEditClientModal(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientForm.id) {
      updateClient(clientForm.id, clientForm);
    }
    setShowEditClientModal(false);
  };

  const handleDeleteClient = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este cliente e todos os seus agendamentos futuros?")) {
      const client = clients.find(c => c.id === id);
      if (client) {
        const now = new Date();
        appointments.forEach(apt => {
          if (apt.clientEmail === client.email || apt.clientName === client.name) {
            const [d, m, y] = apt.date.split('/');
            const aptDate = new Date(Number(y), Number(m) - 1, Number(d));
            const aptTime = apt.time || "00:00";
            const [h, min] = aptTime.split(':');
            aptDate.setHours(Number(h), Number(min));
            
            if (aptDate >= now) {
              deleteAppointment(apt.id);
            }
          }
        });
      }
      deleteClient(id);
      setSelectedClientId(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProfileForm({ ...profileForm, photo: event.target.result as string });
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleServiceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSrvImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleProfPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSrvProfPhoto(event.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
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
    const msg = `Parabéns ${clientName}! 🎂 Desejamos muitas felicidades e preparamos um presente especial para você: 15% OFF no seu próximo serviço de beleza conosco!`;
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
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
  const isSelectedDateClosed = closedDates.includes(selectedDateStr);
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

    // Filtro de Data
    if (finDateFilter === 'today' && a.date !== selectedDateStr) return false;
    if (finDateFilter === 'this_month' && !a.date.endsWith(currentMonthStr)) return false;
    
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
  const finPending = filteredFinances.filter(a => a.paymentStatus === 'open' || (a.paymentStatus as string) === 'pending').reduce((acc, curr) => acc + curr.price, 0);
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
  const blockedSlotsCount = timelineSlots.filter(slot => 
    blockedTimeSlots.includes(`${selectedDateStr}-${slot}`)
  ).length;
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
          <Sparkles size={32} color="var(--color-primary-main)" /> Fran Marinho
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

          <div className={styles.headerStats}>
            <div className={styles.headerStatBadge}>
              <div className={styles.headerStatIcon}><DollarSign size={20} /></div>
              <div>
                <div className={styles.headerStatValue}>R$ {totalRevenue},00</div>
                <div className={styles.headerStatLabel}>Receita prevista ({selectedDateStr})</div>
              </div>
            </div>
            <div className={styles.headerStatBadge}>
              <div className={styles.headerStatIconGreen}><CheckCircle2 size={20} /></div>
              <div>
                <div className={styles.headerStatValue}>R$ {paidRevenue},00</div>
                <div className={styles.headerStatLabel}>Pagamentos aprovados (IA)</div>
              </div>
            </div>
            <div className={styles.headerStatBadge}>
              <div className={styles.headerStatIcon} style={{background: '#fef2f2', color: 'var(--color-primary)'}}><Users size={20} /></div>
              <div>
                <div className={styles.headerStatValue}>{dayAppointments.length}</div>
                <div className={styles.headerStatLabel}>Clientes agendados ({selectedDateStr})</div>
              </div>
            </div>
          </div>
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
                      <div className={styles.agendaDateTitle}>Agenda do Dia</div>
                      <div className={styles.agendaDateSubtitle}>
                        {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' }).charAt(0).toUpperCase() + selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' }).slice(1)}, {selectedDate.getDate()} de {selectedDate.toLocaleDateString('pt-BR', { month: 'long' })}
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.mobileWrap} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className={styles.agendaNavBtn} onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}>&lt;</button>
                      <button className={styles.agendaNavBtn} onClick={() => setSelectedDate(new Date())} style={{ width: 'auto', padding: '0 12px', fontSize: '0.85rem' }}>Hoje</button>
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
                      style={{ padding: '10px 16px', borderRadius: '12px', opacity: isSelectedDateClosed ? 0.6 : 1, cursor: isSelectedDateClosed ? 'not-allowed' : 'pointer' }}
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
                  {generateTimeline().filter(slot => blockedTimeSlots.includes(`${selectedDateStr}-${slot}`)).length > 0 && (
                    <div className={styles.summaryItemBlocked}>
                      <Ban size={16} className={styles.summaryIconBlocked} />
                      {generateTimeline().filter(slot => blockedTimeSlots.includes(`${selectedDateStr}-${slot}`)).length} {generateTimeline().filter(slot => blockedTimeSlots.includes(`${selectedDateStr}-${slot}`)).length === 1 ? 'bloqueado' : 'bloqueados'}
                    </div>
                  )}
                </div>

                <div className={styles.timelineContainer}>
                  {generateTimeline().map((timeSlot) => {
                    const aptsInSlot = getApptsForSlot(timeSlot);
                    const ongoingAppt = aptsInSlot.length === 0 ? getOngoingApptForSlot(timeSlot) : null;
                    
                    // Se não tiver agendamentos começando aqui E tiver um em andamento, não renderiza para não poluir
                    if (ongoingAppt && aptsInSlot.length === 0) return null;
                    
                    // Filter handling
                    const filteredApts = aptsInSlot.filter(apt => {
                      if (agendaFilter === 'all') return true;
                      if (agendaFilter === 'confirmed') return apt.status === 'confirmed';
                      if (agendaFilter === 'pending') return apt.status === 'pending';
                      return true;
                    });
                    
                    if (aptsInSlot.length > 0 && filteredApts.length === 0) return null;
                    
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
                            filteredApts.map(apt => (
                              <div key={apt.id} className={`${styles.agendaItemTimeline} ${apt.status === 'confirmed' ? styles.confirmed : ''} ${apt.status === 'completed' ? styles.completed : ''}`}>
                                <div className={styles.cardLeft}>
                                  <div className={styles.cardAvatar}>
                                    {getInitials(apt.clientName)}
                                  </div>
                                  <div className={styles.cardDetails}>
                                    <div className={styles.clientName}>
                                      {apt.clientName}
                                      {!clients.some(c => c.email === apt.clientEmail) && (
                                        <span style={{ marginLeft: 8, fontSize: "0.7rem", backgroundColor: "#fef2f2", color: "#ef4444", padding: "2px 6px", borderRadius: "12px", border: "1px solid #fecaca", fontWeight: 600 }}>Excluído</span>
                                      )}
                                    </div>
                                    <div className={styles.serviceInfo}>{apt.service}</div>
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
                                <div className={styles.actionButtons}>
                                  {/* Botão Confirmar */}
                                  <button 
                                    className={styles.actionBtnGroup} 
                                    onClick={() => updateStatus(apt.id, apt.status === 'confirmed' ? 'pending' : 'confirmed')}
                                    style={apt.status === 'confirmed' ? { color: '#15803D' } : {}}
                                    title={apt.status === 'confirmed' ? 'Agendamento já confirmado (clique para alterar)' : 'Confirmar agendamento'}
                                  >
                                    <div 
                                      className={styles.iconBtn} 
                                      style={apt.status === 'confirmed' ? { background: '#DCFCE7', color: '#16A34A' } : {}}
                                    >
                                      <CheckCircle2 size={18} />
                                    </div>
                                    <span>{apt.status === 'confirmed' ? 'Confirmado' : 'Confirmar'}</span>
                                  </button>

                                  {/* Botão Cancelar */}
                                  <button 
                                    className={styles.actionBtnGroup} 
                                    onClick={() => {
                                      if (apt.status === 'canceled') {
                                        updateStatus(apt.id, 'pending');
                                      } else if (confirm(`Deseja realmente cancelar o agendamento de ${apt.clientName}?`)) {
                                        updateStatus(apt.id, 'canceled');
                                        handleSendCancellationForAppt(apt);
                                      }
                                    }}
                                    style={apt.status === 'canceled' ? { color: 'var(--color-error)' } : {}}
                                    title={apt.status === 'canceled' ? 'Agendamento cancelado (clique para reativar)' : 'Cancelar agendamento'}
                                  >
                                    <div 
                                      className={styles.iconBtn} 
                                      style={apt.status === 'canceled' ? { background: '#FEF2F2', color: 'var(--color-error)' } : {}}
                                    >
                                      <XCircle size={18} />
                                    </div>
                                    <span>{apt.status === 'canceled' ? 'Cancelado' : 'Cancelar'}</span>
                                  </button>

                                  {/* Botão Lembrete (WhatsApp) */}
                                  <button 
                                    className={styles.actionBtnGroup} 
                                    onClick={() => handleSendReminderForAppt(apt)}
                                    title="Enviar lembrete do agendamento via WhatsApp"
                                  >
                                    <div className={styles.iconBtn} style={{ background: '#E0F2FE', color: '#0284C7' }}>
                                      <Bell size={18} />
                                    </div>
                                    <span>Lembrete</span>
                                  </button>

                                  {/* Botão Editar */}
                                  <button 
                                    className={styles.actionBtnGroup} 
                                    onClick={() => handleOpenEditAppt(apt)}
                                    title="Editar detalhes do agendamento"
                                  >
                                    <div className={styles.iconBtn}>
                                      <Edit3 size={18} />
                                    </div>
                                    <span>Editar</span>
                                  </button>
                                </div>
                              </div>
                            ))
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
                                <div className={styles.emptySlotWrapper}>
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
                        onClick={() => handleSendBirthday("5511999999999", b.name)}
                        style={{ padding: '6px 12px', background: '#fff', color: '#e11d48', border: 'none', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        Mimar
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
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: "var(--color-primary-light)", color: "var(--color-primary-dark)" }}><TrendingUp size={28} /></div>
              <div>
                <div className={styles.statValue}>R$ {finTotal},00</div>
                <div className={styles.statLabel}>Faturamento Total</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: "#E8F5E9", color: "#2E7D32" }}><CheckCircle2 size={28} /></div>
              <div>
                <div className={styles.statValue}>R$ {finPaid},00</div>
                <div className={styles.statLabel}>Total Recebido (Pago)</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: "#FFF3E0", color: "#E65100" }}><CreditCard size={28} /></div>
              <div>
                <div className={styles.statValue}>R$ {finPending},00</div>
                <div className={styles.statLabel}>A Receber (Pendente)</div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <div className={styles.titleIcon}>
                <PieChart size={24} color="var(--color-primary-dark)" />
                Gestão de Transações
              </div>
              
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--color-background)", padding: "4px 12px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                  <Users size={16} color="var(--color-text-muted)" />
                  <select 
                    value={finClientFilter}
                    onChange={(e) => setFinClientFilter(e.target.value)}
                    style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.9rem", color: "var(--color-text-main)", cursor: "pointer" }}
                  >
                    <option value="all">Todos os Clientes</option>
                    {uniqueClientsList.map(c => (
                      <option key={c.email} value={c.email}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--color-background)", padding: "4px 12px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                  <Filter size={16} color="var(--color-text-muted)" />
                  <select 
                    value={finDateFilter}
                    onChange={(e) => setFinDateFilter(e.target.value as any)}
                    style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.9rem", color: "var(--color-text-main)", cursor: "pointer" }}
                  >
                    <option value="all">Todo o Período</option>
                    <option value="this_month">Este Mês</option>
                    <option value="today">Hoje ({selectedDateStr})</option>
                  </select>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--color-background)", padding: "4px 12px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                  <Filter size={16} color="var(--color-text-muted)" />
                  <select 
                    value={finStatusFilter}
                    onChange={(e) => setFinStatusFilter(e.target.value as any)}
                    style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.9rem", color: "var(--color-text-main)", cursor: "pointer" }}
                  >
                    <option value="all">Todos os Status</option>
                    <option value="paid">Todos Pagos</option>
                    <option value="paid_pix">Pago no Pix</option>
                    <option value="paid_credit">Pago no Crédito</option>
                    <option value="paid_debit">Pago no Débito</option>
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
                filteredFinances.map(apt => {
                  const isPaid = apt.paymentStatus.includes('paid');
                  return (
                    <div key={apt.id} className={styles.agendaItem} style={{ gridTemplateColumns: "100px 1fr auto" }}>
                      <div className={styles.timeBadge} style={{ fontSize: "0.9rem", background: "var(--color-background)", border: "1px solid var(--color-border)" }}>
                        {apt.date}<br/>{apt.time}
                      </div>
                      
                      <div>
                        <div className={styles.clientName}>
                          {apt.clientName}
                          {!clients.some(c => c.email === apt.clientEmail) && (
                            <span style={{ marginLeft: 8, fontSize: "0.7rem", backgroundColor: "#fef2f2", color: "#ef4444", padding: "2px 6px", borderRadius: "12px", border: "1px solid #fecaca", fontWeight: 600 }}>Excluído</span>
                          )}
                        </div>
                        <div className={styles.serviceInfo}>
                          <span>{apt.service}</span>
                          <span style={{ 
                            color: isPaid ? 'var(--color-success)' : '#E65100',
                            fontWeight: 600,
                            background: isPaid ? '#E8F5E9' : '#FFF3E0',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.8rem'
                          }}>
                            {apt.paymentStatus === 'paid_pix' ? 'Pix' : (apt.paymentStatus === 'paid_credit' || apt.paymentStatus === 'paid_debit' || (apt.paymentStatus as string) === 'paid_card') ? 'Cartão' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--color-primary-dark)" }}>
                        R$ {apt.price},00
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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
              <button 
                className="btn-primary" 
                onClick={() => {
                  setEditingServiceId(null);
                  setSrvName("");
                  setSrvDesc("");
                  setSrvPrice("");
                  setSrvDuration("");
                  setSrvImage("");
                  setShowServiceForm(!showServiceForm);
                }}
                style={{ fontSize: "0.9rem", padding: "8px 16px" }}
              >
                {showServiceForm ? <><X size={18} /> Cancelar</> : <><Plus size={18} /> Novo Serviço</>}
              </button>
            </div>

            {showServiceForm && (
              <div style={{ background: "var(--color-background)", padding: "24px", borderRadius: "var(--radius-md)", marginBottom: "32px", border: "1px solid var(--color-border)" }}>
                <h3 style={{ marginBottom: "16px", color: "var(--color-text-main)" }}>
                  {editingServiceId ? "Editar Serviço" : "Adicionar Novo Serviço"}
                </h3>
                <form onSubmit={handleSaveService} style={{ display: "grid", gap: "16px", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Nome do Serviço</label>
                    <input type="text" value={srvName} onChange={e => setSrvName(e.target.value)} required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Descrição</label>
                    <textarea value={srvDesc} onChange={e => setSrvDesc(e.target.value)} required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)", minHeight: "80px" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Preço (R$)</label>
                    <input type="number" value={srvPrice} onChange={e => setSrvPrice(e.target.value)} required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Duração (Minutos)</label>
                    <input type="number" value={srvDuration} onChange={e => setSrvDuration(e.target.value)} required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Imagem do Serviço</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      {srvImage && (
                        <img src={srvImage} alt="Preview do serviço" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px" }} />
                      )}
                      <label style={{ cursor: "pointer", background: "var(--color-background)", border: "1px solid var(--color-border)", padding: "12px 24px", borderRadius: "8px", fontSize: "0.9rem", color: "var(--color-text-main)", display: "inline-block" }}>
                        <Camera size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "8px" }} />
                        Fazer upload da imagem
                        <input type="file" accept="image/*" onChange={handleServiceImageUpload} style={{ display: "none" }} />
                      </label>
                    </div>
                  </div>
                  <div style={{ gridColumn: "1 / 2" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Nome do(a) Profissional</label>
                    <input type="text" value={srvProfName} onChange={e => setSrvProfName(e.target.value)} placeholder="Ex: Ana Silva" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)" }} />
                  </div>
                  <div style={{ gridColumn: "2 / -1" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem" }}>Foto do(a) Profissional</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      {srvProfPhoto && (
                        <img src={srvProfPhoto} alt="Preview do profissional" style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "50%" }} />
                      )}
                      <label style={{ cursor: "pointer", background: "var(--color-background)", border: "1px solid var(--color-border)", padding: "12px 24px", borderRadius: "8px", fontSize: "0.9rem", color: "var(--color-text-main)", display: "inline-block" }}>
                        <Camera size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "8px" }} />
                        Fazer upload da foto
                        <input type="file" accept="image/*" onChange={handleProfPhotoUpload} style={{ display: "none" }} />
                      </label>
                    </div>
                  </div>
                  <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
                    <button type="submit" className="btn-primary">Salvar Serviço</button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ display: "grid", gap: "16px" }}>
              {services.map(service => (
                <div key={service.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <img src={service.imageUrl} alt={service.name} style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px" }} />
                    <div>
                      <h3 style={{ fontSize: "1.1rem", marginBottom: "4px" }}>{service.name}</h3>
                      <div style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span>R$ {service.price} • {service.duration} min</span>
                        {service.professionalName && (
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {service.professionalPhotoUrl ? (
                              <img src={service.professionalPhotoUrl} alt={service.professionalName} style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
                              <UserCircle size={16} />
                            )}
                            {service.professionalName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className={styles.iconBtn} onClick={() => handleEditService(service)}><Edit3 size={18} /></button>
                    <button className={styles.iconBtn} onClick={() => deleteService(service.id)} style={{ color: "#d32f2f" }}><Trash2 size={18} /></button>
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
                    <input id="logoImageInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setSiteForm({...siteForm, logoUrl: reader.result as string});
                        reader.readAsDataURL(file);
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
                    <input id="heroImageInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setSiteForm({...siteForm, heroImage: reader.result as string});
                        reader.readAsDataURL(file);
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
                    <input id="aboutImageInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setSiteForm({...siteForm, aboutImage: reader.result as string});
                        reader.readAsDataURL(file);
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
              <div key={idx} style={{ backgroundColor: "#ffffff", borderRadius: "16px", padding: "24px", display: "flex", alignItems: "center", gap: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f3f4f6" }}>
                <div style={{ width: "56px", height: "56px", backgroundColor: "#fff5f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {kpi.icon}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 500, marginBottom: "4px" }}>{kpi.title}</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                    <span style={{ fontSize: "1.8rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{kpi.value}</span>
                  </div>
                  <span style={{ fontSize: "0.85rem", color: kpi.subColor, fontWeight: 500, marginTop: "4px" }}>{kpi.sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Middle Row: Active Reward & Quick Config */}
          <div className={styles.loyaltyMiddleGrid}>
            
            {/* Recompensa ativa */}
            <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f3f4f6" }}>
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
              <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "32px", marginTop: "48px" }}>
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
            <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f3f4f6", display: "flex", flexDirection: "column" }}>
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
          <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #f3f4f6", marginBottom: "32px" }}>
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
            <h2 className={styles.cardTitle} style={{ marginBottom: "20px" }}>CRM de Clientes</h2>
            <div className={styles.agendaList}>
              {clients.length === 0 ? (
                <div className={styles.emptyState}>Nenhum cliente registrado ainda.</div>
              ) : (
                clients.map(client => {
                  const clientAppts = appointments.filter(a => a.clientEmail === client.email);
                  const ltv = clientAppts.filter(a => a.status === 'completed' || a.paymentStatus.includes('paid')).reduce((acc, curr) => acc + curr.price, 0);

                  return (
                    <div key={client.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-background)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        {client.photoUrl ? (
                          <img src={client.photoUrl} alt={client.name} style={{ width: "48px", height: "48px", borderRadius: "24px", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "48px", height: "48px", borderRadius: "24px", background: "var(--color-primary-light)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                            {getInitials(client.name)}
                          </div>
                        )}
                        <div>
                          <strong style={{ display: "block", color: "var(--color-text)", fontSize: "1.1rem" }}>{client.name}</strong>
                          <span style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>{client.email}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Agendamentos</div>
                          <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{clientAppts.length}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Valor Gasto</div>
                          <div style={{ fontWeight: 600, color: "var(--color-primary-dark)" }}>R$ {ltv},00</div>
                        </div>
                        <button 
                          onClick={() => setSelectedClientId(client.id)}
                          style={{ padding: "8px 16px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 500 }}
                        >
                          Ver Perfil
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
              
              const clientAppts = appointments.filter(a => a.clientEmail === client.email).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const ltv = clientAppts.filter(a => a.status === 'completed' || a.paymentStatus.includes('paid')).reduce((acc, curr) => acc + curr.price, 0);
              const stats = getUserStats(client.email);

              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--color-border)" }}>
                    <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                      {client.photoUrl ? (
                        <img src={client.photoUrl} alt={client.name} style={{ width: "80px", height: "80px", borderRadius: "40px", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "80px", height: "80px", borderRadius: "40px", background: "var(--color-primary-light)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "2rem" }}>
                          {getInitials(client.name)}
                        </div>
                      )}
                      <div>
                        <h2 style={{ fontSize: "1.8rem", color: "var(--color-text)", margin: 0, display: "flex", alignItems: "center", gap: "12px" }}>
                          {client.name}
                        </h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                          <span style={{ color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "8px" }}>
                            📧 {client.email}
                          </span>
                          {client.phone && (
                            <span style={{ color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "8px" }}>
                              📱 {client.phone}
                            </span>
                          )}
                          {client.address && (
                            <span style={{ color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "8px" }}>
                              📍 {client.address}
                            </span>
                          )}
                          {client.birthDate && (
                            <span style={{ color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "8px" }}>
                              🎂 {new Date(client.birthDate).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <button onClick={() => handleEditClientClick(client)} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", cursor: "pointer", padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 500, color: "var(--color-text)" }}>
                        <Edit3 size={16} /> Editar
                      </button>
                      <button onClick={() => handleDeleteClient(client.id)} style={{ background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "8px", cursor: "pointer", padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 500, color: "#ef4444" }}>
                        <Trash2 size={16} /> Excluir
                      </button>
                      <button onClick={() => setSelectedClientId(null)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <X size={24} color="var(--color-text-muted)" />
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
                            background: apt.status === 'completed' ? '#E8F5E9' : apt.status === 'canceled' ? '#FFEBEE' : '#E3F2FD',
                            color: apt.status === 'completed' ? '#2E7D32' : apt.status === 'canceled' ? '#C62828' : '#1565C0'
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700 }}>
                            <Cake size={14} /> {b.dateStr}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button 
                        onClick={() => handleSendBirthday(b.phone, b.name)}
                        style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#25D366', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                      >
                        <MessageCircle size={18} /> WhatsApp
                      </button>
                      <button 
                        onClick={() => handleSendBirthday(b.phone, b.name)}
                        style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'linear-gradient(135deg, var(--color-accent), #d4a373)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                      >
                        <Gift size={18} /> Enviar Mimo
                      </button>
                    </div>
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

      {showBlockModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
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
                  for (let m = startMins; m < endMins; m += 30) {
                    toggleTimeSlot(selectedDateStr, minsToTime(m));
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
      </main>
    </div>
  );
}
