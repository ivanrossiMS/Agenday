"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, CalendarDays, LogOut, ChevronDown, LayoutDashboard, UserCircle, Menu, X, Layers } from "lucide-react";
import styles from "./Header.module.css";
import { useAuth } from "@/context/AuthContext";
import EditProfileModal from "./EditProfileModal";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { user, logout, updateProfile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fechar o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fechar menu mobile ao mudar de página
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const getFirstName = (name: string) => name.split(" ")[0];

  if (pathname === '/admin') return null;

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      {/* Left: Logo */}
      <Link href="/" className={styles.logo}>
        <div className={styles.logoCircle}>N</div>
        <span className={styles.logoText}>Agenday</span>
      </Link>
      
      {/* Center: Navigation Links */}
      <nav className={styles.navCenter}>
        <Link href="/servicos" className={`${styles.navLink} ${pathname === '/servicos' ? styles.active : ''}`}>
          Serviços
        </Link>
        <Link href="/dashboard" className={`${styles.navLink} ${pathname === '/dashboard' ? styles.active : ''}`}>
          Agendamentos
        </Link>
      </nav>

      {/* Right: Actions and User */}
      <div className={styles.navRight}>
        <Link href="/agendar" className={styles.agendarBtn}>
          <CalendarDays size={18} className={styles.agendarIcon} />
          <span className={styles.agendarLabel}>Agendar</span>
        </Link>

        {user ? (
          <div className={styles.userContainer} ref={menuRef}>
            <div className={styles.userCard} onClick={() => setMenuOpen(!menuOpen)}>
              {user.photo ? (
                <img src={user.photo} alt="Avatar" className={styles.avatar} style={{ objectFit: 'cover' }} />
              ) : (
                <img src="https://i.pravatar.cc/150?u=marina" alt="Avatar" className={styles.avatar} style={{ objectFit: 'cover' }} />
              )}
              <span className={styles.userName}>{getFirstName(user.name) || "Marina"}</span>
              <ChevronDown size={14} className={styles.userChevron} />
            </div>

            {menuOpen && (
              <div className={styles.dropdownMenu}>
                {user.role === "admin" ? (
                  <Link href="/admin" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                    <LayoutDashboard size={16} />
                    Painel Admin
                  </Link>
                ) : (
                  <Link href="/dashboard" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                    <CalendarDays size={16} />
                    Meus Agendamentos
                  </Link>
                )}
                
                <button 
                  className={styles.dropdownItem} 
                  onClick={() => {
                    setMenuOpen(false);
                    setShowEditProfileModal(true);
                  }}
                  style={{ background: 'transparent', border: 'none', textAlign: 'left', width: '100%', cursor: 'pointer' }}
                >
                  <UserCircle size={16} />
                  Editar Perfil
                </button>
                
                <div className={styles.dropdownDivider}></div>
                
                <button 
                  className={styles.dropdownItem} 
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  style={{ color: "#d32f2f" }}
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className="btn-secondary" style={{ padding: "8px 16px" }}>
            <User size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            Entrar
          </Link>
        )}

        {/* Mobile Menu Trigger - Excluded in Client view as requested */}
        {user?.role === "admin" && (
          <button 
            className={styles.mobileMenuBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        )}
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawerOverlay} onClick={() => setMobileMenuOpen(false)}>
          <div className={styles.mobileDrawerContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.mobileDrawerHeader}>
              <div className={styles.logo}>
                <div className={styles.logoCircle}>N</div>
                <span className={styles.logoText}>Agenday</span>
              </div>
              <button className={styles.closeDrawerBtn} onClick={() => setMobileMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.mobileNavList}>
              <Link 
                href="/servicos" 
                className={`${styles.mobileNavItem} ${pathname === '/servicos' ? styles.mobileNavItemActive : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Layers size={18} /> Serviços
              </Link>
              <Link 
                href="/dashboard" 
                className={`${styles.mobileNavItem} ${pathname === '/dashboard' ? styles.mobileNavItemActive : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <CalendarDays size={18} /> Meus Agendamentos
              </Link>
            </div>

            <div className={styles.mobileDrawerFooter}>
              <Link 
                href="/agendar" 
                className={styles.mobileAgendarBtn}
                onClick={() => setMobileMenuOpen(false)}
              >
                <CalendarDays size={18} /> Agendar serviço
              </Link>

              {user ? (
                <div className={styles.mobileUserBox}>
                  <div className={styles.mobileUserInfo}>
                    {user.photo ? (
                      <img src={user.photo} alt="Avatar" className={styles.avatar} style={{ objectFit: 'cover' }} />
                    ) : (
                      <img src="https://i.pravatar.cc/150?u=marina" alt="Avatar" className={styles.avatar} style={{ objectFit: 'cover' }} />
                    )}
                    <div>
                      <strong className={styles.mobileUserName}>{user.name || "Marina"}</strong>
                      <span className={styles.mobileUserEmail}>{user.email}</span>
                    </div>
                  </div>
                  <div className={styles.mobileUserActions}>
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowEditProfileModal(true);
                      }}
                      className={styles.mobileSubBtn}
                    >
                      <UserCircle size={16} /> Perfil
                    </button>
                    <button 
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className={styles.mobileSubBtnDanger}
                    >
                      <LogOut size={16} /> Sair
                    </button>
                  </div>
                </div>
              ) : (
                <Link 
                  href="/login" 
                  className={styles.mobileLoginBtn}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User size={18} /> Entrar na conta
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        user={user}
        onSave={(data) => {
          updateProfile(data);
        }}
      />
    </header>
  );
}

