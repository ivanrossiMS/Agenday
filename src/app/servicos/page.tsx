"use client";

import Link from "next/link";
import { Clock, DollarSign, CalendarPlus, UserCircle } from "lucide-react";
import { useServices } from "@/context/ServicesContext";
import styles from "./page.module.css";

export default function ServicosPage() {
  const { services } = useServices();

  return (
    <main className={styles.container}>
      <section className={styles.hero}>
        <h1 className={styles.title}>Menu de Serviços</h1>
        <p className={styles.subtitle}>
          Cada serviço é uma experiência desenhada meticulosamente para entregar durabilidade, 
          conforto e o mais alto padrão estético. Descubra o que preparamos para você.
        </p>
      </section>

      <section className={styles.servicesWrapper}>
        {services.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "40px" }}>
            Nenhum serviço disponível no momento.
          </div>
        ) : (
          services.map((service) => (
            <div key={service.id} className={styles.serviceRow}>
              <div className={styles.imageContainer}>
                <img 
                  src={service.imageUrl} 
                  alt={service.name} 
                  className={styles.image}
                  loading="lazy"
                />
              </div>
              
              <div className={styles.contentContainer}>
                <h2 className={styles.serviceName}>{service.name}</h2>
                <p className={styles.serviceDescription}>{service.description}</p>
                
                <div className={styles.detailsGrid}>
                  <div className={styles.detailItem}>
                    <Clock size={24} className={styles.icon} />
                    <span>{service.duration} minutos</span>
                  </div>
                  <div className={styles.detailItem}>
                    <DollarSign size={24} className={styles.icon} />
                    <span>R$ {service.price},00</span>
                  </div>
                  {service.professionalName && (
                    <div className={styles.detailItem} style={{ gridColumn: "1 / -1", marginTop: "8px", borderTop: "1px solid var(--color-border)", paddingTop: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                      {service.professionalPhotoUrl ? (
                        <img src={service.professionalPhotoUrl} alt={service.professionalName} style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <UserCircle size={40} color="var(--color-primary)" />
                      )}
                      <div>
                        <span style={{ display: "block", fontSize: "0.85rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Profissional</span>
                        <span style={{ fontSize: "1.1rem", fontWeight: 500, color: "var(--color-text-main)" }}>{service.professionalName}</span>
                      </div>
                    </div>
                  )}
                </div>

                <Link 
                  href={`/agendar?servicos=${service.id}`} 
                  className="btn-primary" 
                  style={{ display: "inline-flex", width: "fit-content", padding: "16px 32px" }}
                >
                  <CalendarPlus size={20} />
                  Agendar este serviço
                </Link>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
