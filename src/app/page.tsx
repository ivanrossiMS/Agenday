"use client";

import Link from "next/link";
import styles from "./page.module.css";
import { Calendar, Sparkles, Quote } from "lucide-react";
import { useServices } from "@/context/ServicesContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";

export default function Home() {
  const { services } = useServices();
  const { settings } = useSiteSettings();

  return (
    <main className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <img 
          src={settings.heroImage} 
          alt="Banner Principal" 
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay} />
        
        <div className={`${styles.heroContent} animate-fade-in`}>
          <h1 className={styles.title}>
            {settings.heroTitle}
          </h1>
          <p className={styles.subtitle}>
            {settings.heroSubtitle}
          </p>
          <Link href="/agendar" className="btn-primary">
            <Calendar size={20} />
            Agendar Experiência
          </Link>
        </div>
      </section>

      {/* Services Section */}
      <section className={styles.servicesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Menu de Serviços</h2>
          <p className={styles.sectionSubtitle}>
            Serviços desenhados meticulosamente para entregar durabilidade, conforto e o mais alto padrão estético.
          </p>
        </div>
        
        <div className={styles.servicesGrid}>
          {services.slice(0, 3).map((service) => (
            <div key={service.id} className={styles.serviceCard}>
              <div className={styles.serviceImageWrapper}>
                <img src={service.imageUrl} alt={service.name} className={styles.serviceImage} />
              </div>
              <div className={styles.serviceContent}>
                <div className={styles.serviceIconWrapper}>
                  <Sparkles size={24} />
                </div>
                <h3 className={styles.serviceTitle}>{service.name}</h3>
                <p className={styles.serviceDescription}>{service.description}</p>
                <div className={styles.servicePrice}>A partir de R$ {service.price}</div>
                <Link href={`/agendar?servicos=${service.id}`} className="btn-secondary" style={{ width: "100%", textAlign: "center" }}>
                  Reservar
                </Link>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <Link href="/servicos" className="btn-primary" style={{ display: "inline-block" }}>
            Ver todos os serviços
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section className={styles.aboutSection}>
        <div className={styles.aboutGrid}>
          <div className={styles.aboutImageWrapper}>
            <img src={settings.aboutImage} alt="Sobre nós" className={styles.aboutImage} />
          </div>
          <div className={styles.aboutText}>
            <h2>{settings.aboutTitle}</h2>
            <p>
              {settings.aboutText}
            </p>
            <Link href="/agendar" className="btn-primary" style={{ marginTop: "16px" }}>
              Conheça nosso espaço
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={styles.testimonialSection}>
        <div className={styles.sectionHeader} style={{ marginBottom: "48px" }}>
          <h2 className={styles.sectionTitle}>O que nossas clientes dizem</h2>
        </div>
        
        <div className={styles.testimonialGrid}>
          <div className={styles.testimonialCard}>
            <Quote size={40} className={styles.quoteIcon} />
            <p className={styles.testimonialText}>
              "Foi a melhor extensão de cílios que já fiz. Super natural e durou semanas intacta. O ambiente é um luxo!"
            </p>
            <div className={styles.testimonialAuthor}>— Amanda Guimarães</div>
          </div>
          <div className={styles.testimonialCard}>
            <Quote size={40} className={styles.quoteIcon} />
            <p className={styles.testimonialText}>
              "O cuidado que elas têm com a nossa unha é surreal. A esmaltação em gel ficou perfeita, sem bolhas, sem defeitos."
            </p>
            <div className={styles.testimonialAuthor}>— Letícia Carvalho</div>
          </div>
        </div>
      </section>
    </main>
  );
}
