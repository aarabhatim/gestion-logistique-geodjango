import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

const STORAGE_KEY = 'delivermap-i18n-v1';
const I18nContext = createContext(null);

// ─── Dictionnaires complets ───────────────────────────────────────────────────
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
    nav_overview: 'TABLEAU DE BORD', nav_operations: 'OPÉRATIONS',
    nav_management: 'GESTION', nav_analysis: 'ANALYSE',
    map_tracking: 'Carte & Suivi', commandes: 'Commandes', boutiques: 'Boutiques',
    incidents: 'Signalements', clients: 'Clients', transporteurs: 'Transporteurs',
    reports: 'Rapports', heatmap: 'Heatmap & Couverture',
    reports_subtitle: 'Vue globale de la performance de la plateforme',
    print: 'Imprimer', export_csv: 'Export CSV', export_pdf: 'Export PDF',
    period: 'Période', all_periods: 'Toutes périodes',
    last_7: '7 derniers jours', last_30: '30 derniers jours', last_90: '90 derniers jours',
    delivery_rate: 'Taux de livraison', total_revenue: 'CA Total',
    active_stores: 'Boutiques actives', this_month: 'ce mois',
    by_status: 'Par statut', top_stores: 'Top boutiques (CA)',
    top_carriers: 'Top transporteurs', evolution_6m: 'Évolution commandes & CA (6 mois)',
    search_placeholder: 'Rechercher une commande, un client...',
    no_notifications: 'Aucune nouvelle notification', mark_all_read: 'Tout lire',
    filter_by_city: 'Filtrer par ville', all_cities: 'Toutes les villes',
    search_store: 'Rechercher une boutique...',
    chatbot_title: 'Assistant DeliverMap', chatbot_online: 'En ligne',
    chatbot_placeholder: 'Écris ton message…', chatbot_examples: 'EXEMPLES',
    chatbot_new: 'Nouvelle conversation', chatbot_thinking: "L'assistant réfléchit…",
    scoring: 'Scoring', scoring_subtitle: 'Performance et classement des transporteurs',
    score_global: 'Score global', score_ponctualite: 'Ponctualité',
    score_fiabilite: 'Fiabilité', score_satisfaction: 'Satisfaction', score_rapidite: 'Rapidité',
    recalculate: 'Recalculer', recalculate_all: 'Recalculer tous',
    score_history: 'Historique des scores', no_score: 'Aucun score disponible',
    tickets: 'Tickets', ticket_new: 'Nouveau ticket', ticket_title: 'Titre du ticket',
    ticket_category: 'Catégorie', ticket_priority: 'Priorité', ticket_status: 'Statut',
    ticket_open: 'Ouvert', ticket_in_progress: 'En cours', ticket_resolved: 'Résolu',
    ticket_closed: 'Fermé', ticket_urgent: 'Urgent', ticket_medium: 'Moyen', ticket_low: 'Faible',
    ticket_assign: 'Assigner', ticket_reply: 'Répondre', ticket_resolve: 'Résoudre',
    ticket_my_tickets: 'Mes tickets', ticket_all: 'Tous les tickets',
    ticket_sla: 'SLA dépassé', ticket_unassigned: 'Non assigné',
    create_ticket: 'Créer un ticket', recent_tickets: 'Tickets récents',
    contrats: 'Contrats', contrat_new: 'Nouveau contrat', contrat_active: 'Actif',
    contrat_draft: 'Brouillon', contrat_expired: 'Expiré', contrat_terminated: 'Résilié',
    contrat_sign: 'Signer', contrat_activate: 'Activer', contrat_terminate: 'Résilier',
    contrat_pdf: 'Télécharger PDF', contrat_generate_pdf: 'Générer PDF',
    contrat_expiry: "Date d'expiration", contrat_type: 'Type de contrat',
    incident_new: 'Signaler incident', incident_type: "Type d'incident",
    incident_status: 'Statut', incident_open: 'Ouvert', incident_in_progress: 'En cours',
    incident_resolved: 'Résolu', incident_take_charge: 'Prendre en charge',
    incident_resolve: 'Résoudre', incident_resolution_rate: 'Taux de résolution',
    incident_stats: 'Statistiques incidents', my_incidents: 'Mes signalements',
    page: 'Page', of: 'sur', previous: 'Précédent', next: 'Suivant',
    items_per_page: 'Éléments par page', showing: 'Affichage',
    export: 'Exporter', export_excel: 'Exporter Excel', export_all: 'Tout exporter',
    avg_carrier_score: 'Score moyen transporteurs', tickets_by_category: 'Tickets par catégorie',
    resolution_rate: 'Taux de résolution incidents',
    // Chat
    chat_driver: 'Chat livreur', chat_placeholder: 'Message pour le livreur...',
    chat_no_messages: 'Pas encore de messages. Envoyez un message pour commencer !',
    chat_loading: 'Chargement du chat...', chat_send: 'Envoyer',
    // Commandes
    order_status: 'Statut commande', order_assign: 'Assigner', order_validate: 'Valider',
    order_cancel: 'Annuler', order_detail: 'Détail',
  },

  en: {
    welcome: 'Hello', settings: 'Settings', save: 'Save', saved: 'Saved',
    profile: 'Profile', security: 'Security', notifications: 'Notifications',
    appearance: 'Appearance', system: 'System', about: 'About',
    language: 'Display language', timezone: 'Timezone', currency: 'Currency',
    theme: 'Interface theme', dark_mode: 'Dark mode', light_mode: 'Light mode',
    cart: 'My cart', orders: 'My orders', tracking: 'Live tracking',
    catalogue: 'Catalogue', logout: 'Log out', dashboard: 'Dashboard',
    revenue: 'Revenue',
    nav_overview: 'DASHBOARD', nav_operations: 'OPERATIONS',
    nav_management: 'MANAGEMENT', nav_analysis: 'ANALYTICS',
    map_tracking: 'Map & Tracking', commandes: 'Orders', boutiques: 'Stores',
    incidents: 'Incidents', clients: 'Clients', transporteurs: 'Drivers',
    reports: 'Reports', heatmap: 'Heatmap & Coverage',
    reports_subtitle: 'Global platform performance overview',
    print: 'Print', export_csv: 'Export CSV', export_pdf: 'Export PDF',
    period: 'Period', all_periods: 'All periods',
    last_7: 'Last 7 days', last_30: 'Last 30 days', last_90: 'Last 90 days',
    delivery_rate: 'Delivery rate', total_revenue: 'Total revenue',
    active_stores: 'Active stores', this_month: 'this month',
    by_status: 'By status', top_stores: 'Top stores (revenue)',
    top_carriers: 'Top drivers', evolution_6m: 'Orders & revenue trend (6 months)',
    search_placeholder: 'Search an order, a client...',
    no_notifications: 'No new notifications', mark_all_read: 'Mark all read',
    filter_by_city: 'Filter by city', all_cities: 'All cities',
    search_store: 'Search a store...',
    chatbot_title: 'DeliverMap Assistant', chatbot_online: 'Online',
    chatbot_placeholder: 'Type your message…', chatbot_examples: 'EXAMPLES',
    chatbot_new: 'New conversation', chatbot_thinking: 'Assistant is thinking…',
    scoring: 'Scoring', scoring_subtitle: 'Driver performance & ranking',
    score_global: 'Global score', score_ponctualite: 'Punctuality',
    score_fiabilite: 'Reliability', score_satisfaction: 'Satisfaction', score_rapidite: 'Speed',
    recalculate: 'Recalculate', recalculate_all: 'Recalculate all',
    score_history: 'Score history', no_score: 'No score available',
    tickets: 'Tickets', ticket_new: 'New ticket', ticket_title: 'Ticket title',
    ticket_category: 'Category', ticket_priority: 'Priority', ticket_status: 'Status',
    ticket_open: 'Open', ticket_in_progress: 'In progress', ticket_resolved: 'Resolved',
    ticket_closed: 'Closed', ticket_urgent: 'Urgent', ticket_medium: 'Medium', ticket_low: 'Low',
    ticket_assign: 'Assign', ticket_reply: 'Reply', ticket_resolve: 'Resolve',
    ticket_my_tickets: 'My tickets', ticket_all: 'All tickets',
    ticket_sla: 'SLA exceeded', ticket_unassigned: 'Unassigned',
    create_ticket: 'Create ticket', recent_tickets: 'Recent tickets',
    contrats: 'Contracts', contrat_new: 'New contract', contrat_active: 'Active',
    contrat_draft: 'Draft', contrat_expired: 'Expired', contrat_terminated: 'Terminated',
    contrat_sign: 'Sign', contrat_activate: 'Activate', contrat_terminate: 'Terminate',
    contrat_pdf: 'Download PDF', contrat_generate_pdf: 'Generate PDF',
    contrat_expiry: 'Expiry date', contrat_type: 'Contract type',
    incident_new: 'Report incident', incident_type: 'Incident type',
    incident_status: 'Status', incident_open: 'Open', incident_in_progress: 'In progress',
    incident_resolved: 'Resolved', incident_take_charge: 'Take charge',
    incident_resolve: 'Resolve', incident_resolution_rate: 'Resolution rate',
    incident_stats: 'Incident statistics', my_incidents: 'My reports',
    page: 'Page', of: 'of', previous: 'Previous', next: 'Next',
    items_per_page: 'Items per page', showing: 'Showing',
    export: 'Export', export_excel: 'Export Excel', export_all: 'Export all',
    avg_carrier_score: 'Avg driver score', tickets_by_category: 'Tickets by category',
    resolution_rate: 'Incident resolution rate',
    chat_driver: 'Driver chat', chat_placeholder: 'Message to driver...',
    chat_no_messages: 'No messages yet. Send a message to start!',
    chat_loading: 'Loading chat...', chat_send: 'Send',
    order_status: 'Order status', order_assign: 'Assign', order_validate: 'Validate',
    order_cancel: 'Cancel', order_detail: 'Detail',
  },

  ar: {
    welcome: 'مرحبا', settings: 'الإعدادات', save: 'حفظ', saved: 'تم الحفظ',
    profile: 'الملف الشخصي', security: 'الأمان', notifications: 'الإشعارات',
    appearance: 'المظهر', system: 'النظام', about: 'حول',
    language: 'لغة العرض', timezone: 'المنطقة الزمنية', currency: 'العملة',
    theme: 'سمة الواجهة', dark_mode: 'الوضع الداكن', light_mode: 'الوضع الفاتح',
    cart: 'سلة التسوق', orders: 'طلباتي', tracking: 'التتبع المباشر',
    catalogue: 'الكتالوج', logout: 'تسجيل الخروج', dashboard: 'لوحة التحكم',
    revenue: 'الإيرادات',
    map_tracking: 'الخريطة والتتبع', commandes: 'الطلبات', boutiques: 'المتاجر',
    incidents: 'الحوادث', clients: 'العملاء', transporteurs: 'السائقون',
    reports: 'التقارير', heatmap: 'الخريطة الحرارية',
    print: 'طباعة', export_csv: 'تصدير CSV', export_pdf: 'تصدير PDF',
    period: 'الفترة', last_7: 'آخر 7 أيام', last_30: 'آخر 30 يوم',
    delivery_rate: 'معدل التوصيل', total_revenue: 'إجمالي الإيرادات',
    search_placeholder: 'البحث عن طلب، عميل...',
    no_notifications: 'لا توجد إشعارات جديدة', mark_all_read: 'تعيين الكل كمقروء',
    tickets: 'التذاكر', ticket_new: 'تذكرة جديدة', ticket_open: 'مفتوح',
    ticket_resolved: 'محلول', ticket_closed: 'مغلق',
    contrats: 'العقود',
    page: 'الصفحة', of: 'من', previous: 'السابق', next: 'التالي',
    chat_driver: 'محادثة السائق', chat_placeholder: 'رسالة للسائق...',
    chat_send: 'إرسال',
    order_status: 'حالة الطلب', order_cancel: 'إلغاء',
  },

  es: {
    welcome: 'Hola', settings: 'Configuración', save: 'Guardar', saved: 'Guardado',
    profile: 'Perfil', security: 'Seguridad', notifications: 'Notificaciones',
    appearance: 'Apariencia', system: 'Sistema', about: 'Acerca de',
    language: 'Idioma de visualización', timezone: 'Zona horaria', currency: 'Moneda',
    theme: 'Tema de interfaz', dark_mode: 'Modo oscuro', light_mode: 'Modo claro',
    cart: 'Mi carrito', orders: 'Mis pedidos', tracking: 'Seguimiento en vivo',
    catalogue: 'Catálogo', logout: 'Cerrar sesión', dashboard: 'Panel de control',
    revenue: 'Ingresos',
    map_tracking: 'Mapa & Seguimiento', commandes: 'Pedidos', boutiques: 'Tiendas',
    incidents: 'Incidentes', clients: 'Clientes', transporteurs: 'Conductores',
    reports: 'Informes', heatmap: 'Mapa de calor',
    reports_subtitle: 'Vista global del rendimiento de la plataforma',
    print: 'Imprimir', export_csv: 'Exportar CSV', export_pdf: 'Exportar PDF',
    period: 'Período', all_periods: 'Todos los períodos',
    last_7: 'Últimos 7 días', last_30: 'Últimos 30 días', last_90: 'Últimos 90 días',
    delivery_rate: 'Tasa de entrega', total_revenue: 'Ingresos totales',
    active_stores: 'Tiendas activas', this_month: 'este mes',
    by_status: 'Por estado', top_stores: 'Top tiendas (ingresos)',
    top_carriers: 'Top conductores', evolution_6m: 'Evolución pedidos & ingresos (6 meses)',
    search_placeholder: 'Buscar un pedido, un cliente...',
    no_notifications: 'Sin nuevas notificaciones', mark_all_read: 'Marcar todo como leído',
    filter_by_city: 'Filtrar por ciudad', all_cities: 'Todas las ciudades',
    search_store: 'Buscar una tienda...',
    chatbot_title: 'Asistente DeliverMap', chatbot_online: 'En línea',
    chatbot_placeholder: 'Escribe tu mensaje…', chatbot_examples: 'EJEMPLOS',
    chatbot_new: 'Nueva conversación', chatbot_thinking: 'El asistente está pensando…',
    scoring: 'Puntuación', scoring_subtitle: 'Rendimiento y clasificación de conductores',
    score_global: 'Puntuación global', score_ponctualite: 'Puntualidad',
    score_fiabilite: 'Fiabilidad', score_satisfaction: 'Satisfacción', score_rapidite: 'Velocidad',
    recalculate: 'Recalcular', recalculate_all: 'Recalcular todos',
    score_history: 'Historial de puntuaciones', no_score: 'Sin puntuación disponible',
    tickets: 'Tickets', ticket_new: 'Nuevo ticket', ticket_title: 'Título del ticket',
    ticket_category: 'Categoría', ticket_priority: 'Prioridad', ticket_status: 'Estado',
    ticket_open: 'Abierto', ticket_in_progress: 'En curso', ticket_resolved: 'Resuelto',
    ticket_closed: 'Cerrado', ticket_urgent: 'Urgente', ticket_medium: 'Medio', ticket_low: 'Bajo',
    ticket_assign: 'Asignar', ticket_reply: 'Responder', ticket_resolve: 'Resolver',
    ticket_my_tickets: 'Mis tickets', ticket_all: 'Todos los tickets',
    create_ticket: 'Crear ticket', recent_tickets: 'Tickets recientes',
    contrats: 'Contratos', contrat_new: 'Nuevo contrato', contrat_active: 'Activo',
    contrat_draft: 'Borrador', contrat_expired: 'Expirado', contrat_terminated: 'Terminado',
    incident_new: 'Reportar incidente', incident_type: 'Tipo de incidente',
    incident_status: 'Estado', incident_open: 'Abierto', incident_resolved: 'Resuelto',
    incident_take_charge: 'Tomar cargo', incident_resolve: 'Resolver',
    my_incidents: 'Mis reportes',
    page: 'Página', of: 'de', previous: 'Anterior', next: 'Siguiente',
    items_per_page: 'Elementos por página', showing: 'Mostrando',
    export: 'Exportar', export_excel: 'Exportar Excel', export_all: 'Exportar todo',
    chat_driver: 'Chat conductor', chat_placeholder: 'Mensaje al conductor...',
    chat_no_messages: '¡Sin mensajes aún. Envía un mensaje para empezar!',
    chat_loading: 'Cargando chat...', chat_send: 'Enviar',
    order_status: 'Estado pedido', order_assign: 'Asignar', order_validate: 'Validar',
    order_cancel: 'Cancelar', order_detail: 'Detalle',
  },
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export function I18nProvider({ children }) {
  const load = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  };

  const [lang, setLangState]     = useState(() => load().lang     || 'fr');
  const [currency, setCurrencyState] = useState(() => load().currency || 'MAD');
  const [tz, setTzState]         = useState(() => load().tz       || 'Africa/Casablanca');

  /* Persist + apply DOM attributes whenever any setting changes */
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lang, currency, tz }));
    } catch { /* ignore */ }
  }, [lang, currency, tz]);

  /* Individual setters */
  const setLang = useCallback((l) => setLangState(l), []);
  const setCurrency = useCallback((c) => setCurrencyState(c), []);
  const setTz = useCallback((z) => setTzState(z), []);

  /* setAll — used by SettingsPage to apply all changes at once */
  const setAll = useCallback(({ langue, devise, tz: newTz }) => {
    if (langue)  setLangState(langue);
    if (devise)  setCurrencyState(devise);
    if (newTz)   setTzState(newTz);
  }, []);

  const t = useMemo(() => {
    const dict = DICTS[lang] || DICTS.fr;
    return (key) => dict[key] ?? DICTS.fr[key] ?? key;
  }, [lang]);

  const formatPrice = useCallback((price) => {
    const locale = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR';
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(price);
  }, [lang, currency]);

  const formatDate = useCallback((date, options = { dateStyle: 'medium' }) => {
    if (!date) return '';
    const locale = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR';
    return new Intl.DateTimeFormat(locale, options).format(new Date(date));
  }, [lang]);

  const value = useMemo(() => ({
    lang, setLang, langue: lang, setLangue: setLang,
    currency, setCurrency, devise: currency,
    tz, setTz,
    setAll,
    t, formatPrice, formatDate,
  }), [lang, currency, tz, setLang, setCurrency, setTz, setAll, t, formatPrice, formatDate]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export default I18nContext;
