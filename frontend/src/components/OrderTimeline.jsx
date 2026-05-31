import React from 'react';
import { useI18n } from '../contexts/I18nContext';

/**
 * OrderTimeline — Timeline visuelle des étapes commande
 *
 * Usage dans ClientDashboard.jsx :
 *   import OrderTimeline from '../components/OrderTimeline';
 *   <OrderTimeline statut={commande.statut} eta="8 min" />
 *
 * Props :
 *   statut   — string : EN_ATTENTE | VALIDEE | EN_PREPARATION | EN_ROUTE | LIVREE | ANNULEE
 *   eta      — string : ETA dynamique ("Votre commande arrive dans 8 min")
 *   compact  — bool   : affichage horizontal compact pour les cartes
 */

const STEPS = [
  { key: 'EN_ATTENTE',    label: 'Commande',    icon: '🛒', short: 'Commande' },
  { key: 'VALIDEE',       label: 'Validée',     icon: '✅', short: 'Validée' },
  { key: 'EN_PREPARATION',label: 'Préparation', icon: '👨‍🍳', short: 'Prépa' },
  { key: 'EN_ROUTE',      label: 'En route',    icon: '🚗', short: 'Route' },
  { key: 'LIVREE',        label: 'Livrée',      icon: '🏠', short: 'Livrée' },
];

const ORDER = ['EN_ATTENTE', 'VALIDEE', 'EN_PREPARATION', 'EN_ROUTE', 'LIVREE'];

const OrderTimeline = ({ statut, eta, compact = false }) => {
  const { t, tStatus } = useI18n();
  const currentIndex = ORDER.indexOf(statut);
  const cancelled = statut === 'ANNULEE';

  if (cancelled) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-danger-10)] border border-[var(--color-danger)] border-opacity-20">
        <span className="text-2xl">❌</span>
        <div>
          <p className="font-semibold text-[var(--color-danger)]">{t('status_ANNULEE')}</p>
          <p className="text-xs text-[var(--color-danger)] opacity-70">{t('status_ANNULEE')}</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const done = i <= currentIndex;
          const active = i === currentIndex;
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-xs
                    transition-all duration-300
                    ${active ? 'bg-[var(--color-primary)] text-white shadow-lg scale-110 ring-2 ring-[var(--color-primary)] ring-offset-1' : ''}
                    ${done && !active ? 'bg-[var(--color-success)] text-white' : ''}
                    ${!done ? 'bg-[var(--color-border)] text-[var(--color-text-muted)]' : ''}
                  `}
                >
                  {done && !active ? '✓' : step.icon}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${i < currentIndex ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ETA dynamique */}
      {eta && statut === 'EN_ROUTE' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-primary-10)] border border-[var(--color-primary)] border-opacity-20">
          <span className="text-xl">⏱️</span>
          <div>
            <p className="font-semibold text-[var(--color-primary)]">{eta}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{t('common_loading')}</p>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="relative">
        {/* Ligne de connexion */}
        <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-[var(--color-border)]" />
        <div
          className="absolute left-5 top-5 w-0.5 bg-[var(--color-success)] transition-all duration-700"
          style={{ height: currentIndex > 0 ? `${(currentIndex / (STEPS.length - 1)) * 100}%` : '0%' }}
        />

        <div className="space-y-1">
          {STEPS.map((step, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            const pending = i > currentIndex;

            return (
              <div key={step.key} className="relative flex items-center gap-4 py-2">
                {/* Cercle */}
                <div
                  className={`
                    relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-base flex-shrink-0
                    transition-all duration-300 border-2
                    ${active
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg scale-110'
                      : done
                      ? 'bg-[var(--color-success)] border-[var(--color-success)] text-white'
                      : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]'
                    }
                  `}
                >
                  {done ? '✓' : step.icon}
                </div>

                {/* Label */}
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold transition-colors ${
                      active ? 'text-[var(--color-primary)]' :
                      done ? 'text-[var(--color-success)]' :
                      'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {tStatus(step.key)}
                  </p>
                  {active && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                      {t('drv_in_progress')}
                    </p>
                  )}
                  {done && (
                    <p className="text-xs text-[var(--color-success)] mt-0.5">{t('adm_resolved')}</p>
                  )}
                </div>

                {/* Pulsation sur étape active */}
                {active && (
                  <div className="absolute left-0 w-10 h-10 rounded-full bg-[var(--color-primary)] opacity-20 animate-ping z-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderTimeline;
