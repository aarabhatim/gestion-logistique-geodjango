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
    welcome: 'Bonjour', settings: 'Paramètres', save: 'Enregistrer', saved: 'Enregistré',
    profile: 'Profil', security: 'Sécurité', notifications: 'Notifications',
    appearance: 'Apparence', system: 'Système', about: 'À propos',
    language: "Langue d'affichage", timezone: 'Fuseau horaire', currency: 'Devise',
    theme: "Thème de l'interface", dark_mode: 'Mode sombre', light_mode: 'Mode clair',
    cart: 'Mon panier', orders: 'Mes commandes', tracking: 'Suivi live',
    catalogue: 'Catalogue', logout: 'Se déconnecter', dashboard: 'Tableau de bord',
    revenue: "Chiffre d'affaires",
    // Sidebar admin
    nav_overview: 'TABLEAU DE BORD', nav_operations: 'OPÉRATIONS',
    nav_management: 'GESTION', nav_analysis: 'ANALYSE',
    map_tracking: 'Carte & Suivi', commandes: 'Commandes', boutiques: 'Boutiques',
    incidents: 'Signalements', clients: 'Clients', transporteurs: 'Transporteurs',
    reports: 'Rapports', heatmap: 'Heatmap & Couverture',
    // Rapports
    reports_subtitle: 'Vue globale de la performance de la plateforme',
    print: 'Imprimer', export_csv: 'Export CSV', export_pdf: 'Export PDF',
    period: 'Période', all_periods: 'Toutes périodes',
    last_7: '7 derniers jours', last_30: '30 derniers jours', last_90: '90 derniers jours',
    delivery_rate: 'Taux de livraison', total_revenue: 'CA Total',
    active_stores: 'Boutiques actives', this_month: 'ce mois',
    by_status: 'Par statut', top_stores: 'Top boutiques (CA)',
    top_carriers: 'Top transporteurs', evolution_6m: 'Évolution des commandes & CA (6 mois)',
    // Header
    search_placeholder: 'Rechercher une commande, un client...',
    no_notifications: 'Aucune nouvelle notification', mark_all_read: 'Tout lire',
    // Boutiques filter
    filter_by_city: 'Filtrer par ville', all_cities: 'Toutes les villes',
    search_store: 'Rechercher une boutique...',
    // Chatbot
    chatbot_title: 'Assistant DeliverMap', chatbot_online: 'En ligne',
    chatbot_placeholder: 'Écris ton message…', chatbot_examples: 'EXEMPLES',
    chatbot_new: 'Nouvelle conversation', chatbot_thinking: "L'assistant réfléchit…",
  },
  ar: {
    welcome: 'مرحبا', settings: 'الإعدادات', save: 'حفظ', saved: 'تم الحفظ',
    profile: 'الملف الشخصي', security: 'الأمان', notifications: 'الإشعارات',
    appearance: 'المظهر', system: 'النظام', about: 'حول',
    language: 'لغة العرض', timezone: 'المنطقة الزمنية', currency: 'العملة',
    theme: 'مظهر الواجهة', dark_mode: 'الوضع الداكن', light_mode: 'الوضع الفاتح',
    cart: 'سلتي', orders: 'طلباتي', tracking: 'تتبع مباشر',
    catalogue: 'الكتالوج', logout: 'تسجيل الخروج', dashboard: 'لوحة التحكم',
    revenue: 'الإيرادات',
    nav_overview: 'لوحة المعلومات', nav_operations: 'العمليات',
    nav_management: 'الإدارة', nav_analysis: 'التحليل',
    map_tracking: 'الخريطة والتتبع', commandes: 'الطلبات', boutiques: 'المتاجر',
    incidents: 'البلاغات', clients: 'العملاء', transporteurs: 'الناقلون',
    reports: 'التقارير', heatmap: 'الخريطة الحرارية والتغطية',
    reports_subtitle: 'نظرة عامة على أداء المنصة',
    print: 'طباعة', export_csv: 'تصدير CSV', export_pdf: 'تصدير PDF',
    period: 'الفترة', all_periods: 'كل الفترات',
    last_7: 'آخر 7 أيام', last_30: 'آخر 30 يوم', last_90: 'آخر 90 يوم',
    delivery_rate: 'نسبة التسليم', total_revenue: 'إجمالي الإيرادات',
    active_stores: 'المتاجر النشطة', this_month: 'هذا الشهر',
    by_status: 'حسب الحالة', top_stores: 'أفضل المتاجر',
    top_carriers: 'أفضل الناقلين', evolution_6m: 'تطور الطلبات والإيرادات (6 أشهر)',
    search_placeholder: 'ابحث عن طلب أو عميل...',
    no_notifications: 'لا توجد إشعارات جديدة', mark_all_read: 'قراءة الكل',
    filter_by_city: 'تصفية حسب المدينة', all_cities: 'كل المدن',
    search_store: 'ابحث عن متجر...',
    chatbot_title: 'مساعد DeliverMap', chatbot_online: 'متصل',
    chatbot_placeholder: 'اكتب رسالتك…', chatbot_examples: 'أمثلة',
    chatbot_new: 'محادثة جديدة', chatbot_thinking: 'المساعد يفكر…',
  },
  en: {
    welcome: 'Hello', settings: 'Settings', save: 'Save', saved: 'Saved',
    profile: 'Profile', security: 'Security', notifications: 'Notifications',
    appearance: 'Appearance', system: 'System', about: 'About',
    language: 'Display language', timezone: 'Time zone', currency: 'Currency',
    theme: 'Interface theme', dark_mode: 'Dark mode', light_mode: 'Light mode',
    cart: 'My cart', orders: 'My orders', tracking: 'Live tracking',
    catalogue: 'Catalogue', logout: 'Sign out', dashboard: 'Dashboard',
    revenue: 'Revenue',
    nav_overview: 'DASHBOARD', nav_operations: 'OPERATIONS',
    nav_management: 'MANAGEMENT', nav_analysis: 'ANALYSIS',
    map_tracking: 'Map & Tracking', commandes: 'Orders', boutiques: 'Stores',
    incidents: 'Reports', clients: 'Customers', transporteurs: 'Carriers',
    reports: 'Analytics', heatmap: 'Heatmap & Coverage',
    reports_subtitle: 'Global overview of platform performance',
    print: 'Print', export_csv: 'Export CSV', export_pdf: 'Export PDF',
    period: 'Period', all_periods: 'All time',
    last_7: 'Last 7 days', last_30: 'Last 30 days', last_90: 'Last 90 days',
    delivery_rate: 'Delivery rate', total_revenue: 'Total revenue',
    active_stores: 'Active stores', this_month: 'this month',
    by_status: 'By status', top_stores: 'Top stores (revenue)',
    top_carriers: 'Top carriers', evolution_6m: 'Orders & revenue evolution (6 months)',
    search_placeholder: 'Search order, customer...',
    no_notifications: 'No new notifications', mark_all_read: 'Mark all read',
    filter_by_city: 'Filter by city', all_cities: 'All cities',
    search_store: 'Search a store...',
    chatbot_title: 'DeliverMap Assistant', chatbot_online: 'Online',
    chatbot_placeholder: 'Type your message…', chatbot_examples: 'EXAMPLES',
    chatbot_new: 'New conversation', chatbot_thinking: 'Assistant is thinking…',
  },
  es: {
    welcome: 'Hola', settings: 'Configuración', save: 'Guardar', saved: 'Guardado',
    profile: 'Perfil', security: 'Seguridad', notifications: 'Notificaciones',
    appearance: 'Apariencia', system: 'Sistema', about: 'Acerca de',
    language: 'Idioma de visualización', timezone: 'Zona horaria', currency: 'Moneda',
    theme: 'Tema de la interfaz', dark_mode: 'Modo oscuro', light_mode: 'Modo claro',
    cart: 'Mi carrito', orders: 'Mis pedidos', tracking: 'Seguimiento en vivo',
    catalogue: 'Catálogo', logout: 'Cerrar sesión', dashboard: 'Panel',
    revenue: 'Ingresos',
    nav_overview: 'PANEL', nav_operations: 'OPERACIONES',
    nav_management: 'GESTIÓN', nav_analysis: 'ANÁLISIS',
    map_tracking: 'Mapa y seguimiento', commandes: 'Pedidos', boutiques: 'Tiendas',
    incidents: 'Incidentes', clients: 'Clientes', transporteurs: 'Transportistas',
    reports: 'Informes', heatmap: 'Mapa de calor y cobertura',
    reports_subtitle: 'Vista global del rendimiento de la plataforma',
    print: 'Imprimir', export_csv: 'Exportar CSV', export_pdf: 'Exportar PDF',
    period: 'Período', all_periods: 'Todo el tiempo',
    last_7: 'Últimos 7 días', last_30: 'Últimos 30 días', last_90: 'Últimos 90 días',
    delivery_rate: 'Tasa de entrega', total_revenue: 'Ingresos totales',
    active_stores: 'Tiendas activas', this_month: 'este mes',
    by_status: 'Por estado', top_stores: 'Top tiendas',
    top_carriers: 'Top transportistas', evolution_6m: 'Evolución pedidos e ingresos (6 meses)',
    search_placeholder: 'Buscar pedido, cliente...',
    no_notifications: 'Sin notificaciones nuevas', mark_all_read: 'Marcar todo como leído',
    filter_by_city: 'Filtrar por ciudad', all_cities: 'Todas las ciudades',
    search_store: 'Buscar una tienda...',
    chatbot_title: 'Asistente DeliverMap', chatbot_online: 'En línea',
    chatbot_placeholder: 'Escribe tu mensaje…', chatbot_examples: 'EJEMPLOS',
    chatbot_new: 'Nueva conversación', chatbot_thinking: 'El asistente está pensando…',
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
