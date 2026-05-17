import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Internationalisation légère : pas de dépendance externe.
 * - langue : fr | ar | en | es
 * - applique automatiquement dir="rtl" pour l'arabe
 * - devise + fuseau horaire sont aussi globaux
 */
const STORAGE_KEY = 'delivermap-i18n-v1';

const I18nContext = createContext(null);

// ─── Dictionnaires (clés courantes) ──────────────────────────────────────────
const DICTS = {
  fr: {
    welcome: 'Bonjour',
    settings: 'Paramètres',
    save: 'Enregistrer',
    saved: 'Enregistré',
    profile: 'Profil',
    security: 'Sécurité',
    notifications: 'Notifications',
    appearance: 'Apparence',
    system: 'Système',
    about: 'À propos',
    language: "Langue d'affichage",
    timezone: 'Fuseau horaire',
    currency: 'Devise',
    theme: "Thème de l'interface",
    dark_mode: 'Mode sombre',
    light_mode: 'Mode clair',
    cart: 'Mon panier',
    orders: 'Mes commandes',
    tracking: 'Suivi live',
    catalogue: 'Catalogue',
    logout: 'Se déconnecter',
    dashboard: 'Tableau de bord',
    revenue: 'Chiffre d\'affaires',
  },
  ar: {
    welcome: 'مرحبا',
    settings: 'الإعدادات',
    save: 'حفظ',
    saved: 'تم الحفظ',
    profile: 'الملف الشخصي',
    security: 'الأمان',
    notifications: 'الإشعارات',
    appearance: 'المظهر',
    system: 'النظام',
    about: 'حول',
    language: 'لغة العرض',
    timezone: 'المنطقة الزمنية',
    currency: 'العملة',
    theme: 'مظهر الواجهة',
    dark_mode: 'الوضع الداكن',
    light_mode: 'الوضع الفاتح',
    cart: 'سلتي',
    orders: 'طلباتي',
    tracking: 'تتبع مباشر',
    catalogue: 'الكتالوج',
    logout: 'تسجيل الخروج',
    dashboard: 'لوحة التحكم',
    revenue: 'الإيرادات',
  },
  en: {
    welcome: 'Hello',
    settings: 'Settings',
    save: 'Save',
    saved: 'Saved',
    profile: 'Profile',
    security: 'Security',
    notifications: 'Notifications',
    appearance: 'Appearance',
    system: 'System',
    about: 'About',
    language: 'Display language',
    timezone: 'Time zone',
    currency: 'Currency',
    theme: 'Interface theme',
    dark_mode: 'Dark mode',
    light_mode: 'Light mode',
    cart: 'My cart',
    orders: 'My orders',
    tracking: 'Live tracking',
    catalogue: 'Catalogue',
    logout: 'Sign out',
    dashboard: 'Dashboard',
    revenue: 'Revenue',
  },
  es: {
    welcome: 'Hola',
    settings: 'Configuración',
    save: 'Guardar',
    saved: 'Guardado',
    profile: 'Perfil',
    security: 'Seguridad',
    notifications: 'Notificaciones',
    appearance: 'Apariencia',
    system: 'Sistema',
    about: 'Acerca de',
    language: 'Idioma de visualización',
    timezone: 'Zona horaria',
    currency: 'Moneda',
    theme: 'Tema de la interfaz',
    dark_mode: 'Modo oscuro',
    light_mode: 'Modo claro',
    cart: 'Mi carrito',
    orders: 'Mis pedidos',
    tracking: 'Seguimiento en vivo',
    catalogue: 'Catálogo',
    logout: 'Cerrar sesión',
    dashboard: 'Panel',
    revenue: 'Ingresos',
  },
};

const DEFAULTS = {
  langue: 'fr',
  tz: 'Africa/Casablanca',
  devise: 'MAD',
};

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
};

export const I18nProvider = ({ children }) => {
  const [prefs, setPrefs] = useState(readStored);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('lang', prefs.langue);
    html.setAttribute('dir', prefs.langue === 'ar' ? 'rtl' : 'ltr');
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
  }, [prefs]);

  const t = useMemo(() => {
    const dict = DICTS[prefs.langue] || DICTS.fr;
    return (key) => dict[key] || DICTS.fr[key] || key;
  }, [prefs.langue]);

  // Format helpers utilisant Intl
  const formatPrice = (value, opts = {}) => {
    try {
      return new Intl.NumberFormat(prefs.langue === 'ar' ? 'ar-MA' : prefs.langue, {
        style: 'currency', currency: prefs.devise || 'MAD',
        maximumFractionDigits: 2, ...opts,
      }).format(Number(value) || 0);
    } catch {
      return `${Number(value).toFixed(2)} ${prefs.devise}`;
    }
  };

  const formatDate = (date) => {
    try {
      return new Intl.DateTimeFormat(prefs.langue === 'ar' ? 'ar-MA' : prefs.langue, {
        dateStyle: 'medium', timeStyle: 'short', timeZone: prefs.tz,
      }).format(new Date(date));
    } catch {
      return new Date(date).toLocaleString();
    }
  };

  const setLangue = (langue) => setPrefs(p => ({ ...p, langue }));
  const setTz     = (tz)     => setPrefs(p => ({ ...p, tz }));
  const setDevise = (devise) => setPrefs(p => ({ ...p, devise }));
  const setAll    = (next)   => setPrefs(p => ({ ...p, ...next }));

  return (
    <I18nContext.Provider value={{
      ...prefs, t, formatPrice, formatDate,
      setLangue, setTz, setDevise, setAll,
    }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n doit être utilisé dans <I18nProvider>');
  return ctx;
};

export default I18nContext;
