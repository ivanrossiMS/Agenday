"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type ServiceItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // em minutos
  imageUrl: string;
  professionalName?: string;
  professionalPhotoUrl?: string;
};

const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: "cilios",
    name: "Extensão de Cílios",
    description: "Técnicas exclusivas de volume brasileiro e clássico, com fios de seda super leves aplicados fio a fio.",
    price: 120,
    duration: 120,
    imageUrl: "https://images.unsplash.com/photo-1512496015851-a1c815b7e143?q=80&w=800&auto=format&fit=crop",
    professionalName: "Ana Silva",
    professionalPhotoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop"
  },
  {
    id: "unhas",
    name: "Nail Art & Spa",
    description: "Spa completo das mãos, blindagem e esmaltação em gel com produtos hipoalergênicos importados.",
    price: 80,
    duration: 90,
    imageUrl: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=800&auto=format&fit=crop",
    professionalName: "Camila Oliveira",
    professionalPhotoUrl: "https://i.pravatar.cc/150?u=camila"
  },
  {
    id: "sobrancelhas",
    name: "Design de Sobrancelhas",
    description: "Mapeamento facial personalizado e nanopigmentação para um olhar perfeitamente alinhado.",
    price: 60,
    duration: 45,
    imageUrl: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=800&auto=format&fit=crop",
    professionalName: "Julia Santos",
    professionalPhotoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop"
  }
];

type ServicesContextType = {
  services: ServiceItem[];
  addService: (service: Omit<ServiceItem, "id">) => void;
  updateService: (id: string, updatedService: Partial<ServiceItem>) => void;
  deleteService: (id: string) => void;
};

const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadServices() {
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase.from("services").select("*");
          if (!error && data && data.length > 0) {
            const formatted: ServiceItem[] = data.map((item: any) => ({
              id: item.id,
              name: item.name,
              description: item.description || "",
              price: Number(item.price) || 0,
              duration: Number(item.duration) || 60,
              imageUrl: item.image_url || "",
              professionalName: item.professional_name || "",
              professionalPhotoUrl: item.professional_photo_url || ""
            }));
            setServices(formatted);
            localStorage.setItem("@agenday:services", JSON.stringify(formatted));
            setIsLoaded(true);
            return;
          }
        } catch (e) {
          console.error("Erro ao carregar serviços do Supabase:", e);
        }
      }

      // Fallback para localStorage
      const stored = localStorage.getItem("@agenday:services");
      if (stored) {
        setServices(JSON.parse(stored));
      } else {
        setServices(INITIAL_SERVICES);
        localStorage.setItem("@agenday:services", JSON.stringify(INITIAL_SERVICES));
      }
      setIsLoaded(true);
    }

    loadServices();
  }, []);

  const saveAndSet = (newServices: ServiceItem[]) => {
    setServices(newServices);
    localStorage.setItem("@agenday:services", JSON.stringify(newServices));
  };

  const addService = async (serviceData: Omit<ServiceItem, "id">) => {
    const newId = "srv_" + Date.now().toString();
    const newService: ServiceItem = {
      ...serviceData,
      id: newId,
    };

    saveAndSet([...services, newService]);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("services").insert({
          id: newId,
          name: serviceData.name,
          description: serviceData.description,
          price: serviceData.price,
          duration: serviceData.duration,
          image_url: serviceData.imageUrl,
          professional_name: serviceData.professionalName || "",
          professional_photo_url: serviceData.professionalPhotoUrl || ""
        });
      } catch (e) {
        console.error("Erro ao adicionar serviço no Supabase:", e);
      }
    }
  };

  const updateService = async (id: string, updatedData: Partial<ServiceItem>) => {
    const newServices = services.map(s => s.id === id ? { ...s, ...updatedData } : s);
    saveAndSet(newServices);

    if (isSupabaseConfigured() && supabase) {
      try {
        const payload: any = {};
        if (updatedData.name !== undefined) payload.name = updatedData.name;
        if (updatedData.description !== undefined) payload.description = updatedData.description;
        if (updatedData.price !== undefined) payload.price = updatedData.price;
        if (updatedData.duration !== undefined) payload.duration = updatedData.duration;
        if (updatedData.imageUrl !== undefined) payload.image_url = updatedData.imageUrl;
        if (updatedData.professionalName !== undefined) payload.professional_name = updatedData.professionalName;
        if (updatedData.professionalPhotoUrl !== undefined) payload.professional_photo_url = updatedData.professionalPhotoUrl;

        await supabase.from("services").update(payload).eq("id", id);
      } catch (e) {
        console.error("Erro ao atualizar serviço no Supabase:", e);
      }
    }
  };

  const deleteService = async (id: string) => {
    const newServices = services.filter(s => s.id !== id);
    saveAndSet(newServices);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("services").delete().eq("id", id);
      } catch (e) {
        console.error("Erro ao deletar serviço no Supabase:", e);
      }
    }
  };

  if (!isLoaded) return null;

  return (
    <ServicesContext.Provider value={{ services, addService, updateService, deleteService }}>
      {children}
    </ServicesContext.Provider>
  );
}

export const useServices = () => {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error("useServices must be used within a ServicesProvider");
  return ctx;
};
