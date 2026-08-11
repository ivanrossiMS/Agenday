"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

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
      const stored = localStorage.getItem("@agenday:services");
      let localData: ServiceItem[] = stored ? JSON.parse(stored) : INITIAL_SERVICES;

      try {
        const res = await fetch("/api/services");
        const json = await res.json();
        if (json.configured && Array.isArray(json.data)) {
          if (json.data.length > 0) {
            const formatted: ServiceItem[] = json.data.map((item: any) => ({
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
          } else {
            // DB is empty, seed DB with local data or defaults
            setServices(localData);
            localStorage.setItem("@agenday:services", JSON.stringify(localData));
            for (const srv of localData) {
              fetch("/api/services", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(srv)
              }).catch(e => console.error("Error seeding service:", e));
            }
            setIsLoaded(true);
            return;
          }
        }
      } catch (e) {
        console.error("Erro ao carregar serviços da API:", e);
      }

      setServices(localData);
      localStorage.setItem("@agenday:services", JSON.stringify(localData));
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

    try {
      await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newService)
      });
    } catch (e) {
      console.error("Erro ao adicionar serviço via API:", e);
    }
  };

  const updateService = async (id: string, updatedData: Partial<ServiceItem>) => {
    const target = services.find(s => s.id === id);
    const updated = { ...(target || {}), ...updatedData, id } as ServiceItem;
    const newServices = services.map(s => s.id === id ? updated : s);
    saveAndSet(newServices);

    try {
      await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error("Erro ao atualizar serviço via API:", e);
    }
  };

  const deleteService = async (id: string) => {
    const newServices = services.filter(s => s.id !== id);
    saveAndSet(newServices);

    try {
      await fetch(`/api/services?id=${id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Erro ao deletar serviço via API:", e);
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
