import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { FR, EN, AR, ES, DICTS } from '../i18n/index.js';

const STORAGE_KEY = 'delivermap-i18n-v1';
const I18nContext = createContext(null);

// ─── Locale map ───────────────────────────────────────────────────────────────
export const LOCALE_MAP = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA', es: 'es-ES' };

// ─── Helpers standalone (utilisables hors React) ──────────────────────────────
export function formatDateLocale(date, lang, options) {
  if (!date) return '\u2014';
  const locale = LOCALE_MAP[lang] || 'fr-FR';
  try {
    return new Date(date).toLocaleDateString(locale, options);
  } catch {
    return new Date(date).toLocaleDateString('fr-FR', options);
  }
}

export function formatTimeLocale(date, lang, options) {
  if (!date) return '\u2014';
  const locale = LOCALE_MAP[lang] || 'fr-FR';
  try {
    return new Date(date).toLocaleTimeString(locale, options);
  } catch {
    return new Date(date).toLocaleTimeString('fr-FR', options);
  }
}

export function formatDateTimeLocale(date, lang, options) {
  if (!date) return '\u2014';
  const locale = LOCALE_MAP[lang] || 'fr-FR';
  try {
    return new Date(date).toLocaleString(locale, options);
  } catch {
    return new Date(date).toLocaleString('fr-FR', options);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'fr'; } catch { return 'fr'; }
  });

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const dict = DICTS[lang] || FR;

  const t = useCallback((key, params) => {
    const val = dict[key] ?? FR[key] ?? key;
    if (import.meta.env.DEV && dict[key] === undefined && FR[key] === undefined) {
      console.warn(`[i18n] Missing key "${key}" for lang "${lang}"`);
    }
    if (params && typeof val === 'string') {
      return val.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
    }
    return val;
  }, [dict, lang]);

  const locale = LOCALE_MAP[lang] || 'fr-FR';

  const formatDate = useCallback((date, options) => {
    if (!date) return '\u2014';
    try { return new Date(date).toLocaleDateString(locale, options); }
    catch { return new Date(date).toLocaleDateString('fr-FR', options); }
  }, [locale]);

  const formatTime = useCallback((date, options) => {
    if (!date) return '\u2014';
    try { return new Date(date).toLocaleTimeString(locale, options); }
    catch { return new Date(date).toLocaleTimeString('fr-FR', options); }
  }, [locale]);

  const formatDateTime = useCallback((date, options) => {
    if (!date) return '\u2014';
    try { return new Date(date).toLocaleString(locale, options); }
    catch { return new Date(date).toLocaleString('fr-FR', options); }
  }, [locale]);

  const formatPrice = useCallback((amount, currencyCode = 'MAD') => {
    if (amount == null) return '\u2014';
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency', currency: currencyCode, minimumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${Number(amount).toLocaleString('fr-MA')} ${currencyCode}`;
    }
  }, [locale]);

  const formatNumber = useCallback((n) => {
    if (n == null) return '\u2014';
    try { return new Intl.NumberFormat(locale).format(n); }
    catch { return String(n); }
  }, [locale]);

  // Traduit un code statut backend (ex: 'EN_ROUTE') vers le libelle localise
  const tStatus = useCallback((code) => {
    if (!code) return '';
    return t(`status_${code}`);
  }, [t]);

  const value = useMemo(() => ({
    t, lang, setLang,
    // alias pour compatibilite avec anciens fichiers
    langue: lang, setLangue: setLang,
    locale,
    formatDate, formatTime, formatDateTime,
    formatPrice, formatNumber, tStatus,
    isRtl: lang === 'ar',
  }), [t, lang, setLang, locale, formatDate, formatTime, formatDateTime, formatPrice, formatNumber, tStatus]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

export default I18nContext;
