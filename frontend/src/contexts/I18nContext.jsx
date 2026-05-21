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
    // Scoring
    scoring: 'Scoring', scoring_subtitle: 'Performance et classement des transporteurs',
    score_global: 'Score global', score_ponctualite: 'Ponctualité', score_fiabilite: 'Fiabilité',
    score_satisfaction: 'Satisfaction', score_rapidite: 'Rapidité',
    recalculate: 'Recalculer', recalculate_all: 'Recalculer tous',
    score_history: 'Historique des scores', no_score: 'Aucun score disponible',
    // Tickets
    tickets: 'Tickets', ticket_new: 'Nouveau ticket', ticket_title: 'Titre du ticket',
    ticket_category: 'Catégorie', ticket_priority: 'Priorité', ticket_status: 'Statut',
    ticket_open: 'Ouvert', ticket_in_progress: 'En cours', ticket_resolved: 'Résolu',
    ticket_closed: 'Fermé', ticket_urgent: 'Urgent', ticket_medium: 'Moyen', ticket_low: 'Faible',
    ticket_assign: 'Assigner', ticket_reply: 'Répondre', ticket_resolve: 'Résoudre',
    ticket_my_tickets: 'Mes tickets', ticket_all: 'Tous les tickets',
    ticket_sla: 'SLA dépassé', ticket_unassigned: 'Non assigné',
    create_ticket: 'Créer un ticket', recent_tickets: 'Tickets récents',
    // Contrats
    contrats: 'Contrats', contrat_new: 'Nouveau contrat', contrat_active: 'Actif',
    contrat_draft: 'Brouillon', contrat_expired: 'Expiré', contrat_terminated: 'Résilié',
    contrat_sign: 'Signer', contrat_activate: 'Activer', contrat_terminate: 'Résilier',
    contrat_pdf: 'Télécharger PDF', contrat_generate_pdf: 'Générer PDF',
    contrat_expiry: 'Date d\'expiration', contrat_type: 'Type de contrat',
    // Incidents
    incident_new: 'Signaler incident', incident_type: 'Type d\'incident',
    incident_status: 'Statut', incident_open: 'Ouvert', incident_in_progress: 'En cours',
    incident_resolved: 'Résolu', incident_take_charge: 'Prendre en charge',
    incident_resolve: 'Résoudre', incident_resolution_rate: 'Taux de résolution',
    incident_stats: 'Statistiques incidents', my_incidents: 'Mes signalements',
    // Pagination
    page: 'Page', of: 'sur', previous: 'Précédent', next: 'Suivant',
    items_per_page: 'Éléments par page', showing: 'Affichage',
    // Export
    export: 'Exporter', export_excel: 'Exporter Excel', export_all: 'Tout exporter',
    // KPIs Rapports
    avg_carrier_score: 'Score moyen transporteurs', tickets_by_category: 'Tickets par catégorie',
    resolution_rate: 'Taux de résolution incidents',
  },
  ar: {
    welcome: 'مرحبا', settings: 'الإعدادات', save: 'حفظ', saved: 'تم الحفظ',
    profile: 'الملف الشخصي', security: 'الأمان', notifications: 'الإشعارات',
    appearance: 'المظهر', system: 'النظام', about: 'حول',
    language: 'لغة العرض', timezone: 'المنطقة الزمنية', currency: 'العملة',
    theme: 'سمة الواجهة', dark_mode: 'الوضع الداكن', light_mode: 'الوضع الفاتح',
    logout: 'تسجيل الخروج',
  },
};

// ─── Provider ────────────────────────────────────────────────────────────────
export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.lang || 'fr'; }
    catch { return 'fr'; }
  });
  const [currency, setCurrency] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.currency || 'MAD'; }
    catch { return 'MAD'; }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, lang, currency }));
    } catch { /* ignore */ }
  }, [lang, currency]);

  const t = useMemo(() => {
    const dict = DICTS[lang] || DICTS.fr;
    return (key) => dict[key] ?? DICTS.fr[key] ?? key;
  }, [lang]);

  const formatPrice = React.useCallback((price) => {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-MA' : lang, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(price);
  }, [lang, currency]);

  const formatDate = React.useCallback((date, options = { dateStyle: 'medium' }) => {
    if (!date) return '';
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-MA' : lang, options).format(new Date(date));
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      langue: lang,
      setLangue: setLang,
      currency,
      setCurrency,
      devise: currency,
      t,
      formatPrice,
      formatDate,
    }),
    [lang, currency, t, formatPrice, formatDate],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export default I18nContext;
