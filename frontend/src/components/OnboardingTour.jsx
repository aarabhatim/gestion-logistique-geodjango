import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';

/**
 * OnboardingTour — Présentation des 3 fonctionnalités clés (1ère connexion)
 *
 * Usage dans ClientDashboard.jsx :
 *   import OnboardingTour from '../../components/OnboardingTour';
 *   const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboarding_done'));
 *   {showOnboarding && <OnboardingTour onDone={() => { localStorage.setItem('onboarding_done','1'); setShowOnboarding(false); }} />}
 */

const STEPS = [
  { emoji: '🛒', titleKey: 'ob_step1_title', descKey: 'ob_step1_desc', color: 'from-orange-400 to-orange-600' },
  { emoji: '🗺️', titleKey: 'ob_step2_title', descKey: 'ob_step2_desc', color: 'from-blue-400 to-blue-600' },
  { emoji: '⭐', titleKey: 'ob_step3_title', descKey: 'ob_step3_desc', color: 'from-purple-400 to-purple-600' },
];

const OnboardingTour = ({ onDone }) => {
  const { t } = useI18n();
  const [current, setCurrent] = useState(0);
  const [exiting, setExiting] = useState(false);

  const next = () => {
    if (current < STEPS.length - 1) {
      setCurrent(prev => prev + 1);
    } else {
      finish();
    }
  };

  const finish = () => {
    setExiting(true);
    setTimeout(() => onDone?.(), 350);
  };

  const step = STEPS[current];

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}
      style={{ zIndex: 'var(--z-modal, 300)' }}
    >
      <div className="w-full max-w-sm mx-4 mb-6 sm:mb-0">
        {/* Card */}
        <div className="bg-[var(--color-surface)] rounded-3xl overflow-hidden shadow-2xl">
          {/* Gradient header */}
          <div className={`bg-gradient-to-br ${step.color} h-40 flex items-center justify-center`}>
            <span className="text-7xl">{step.emoji}</span>
          </div>

          <div className="p-6">
            <h2 className="text-xl font-bold text-[var(--color-text)] font-heading mb-2">{t(step.titleKey)}</h2>
            <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{t(step.descKey)}</p>

            {/* Dots */}
            <div className="flex justify-center gap-2 my-5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === current ? 'w-6 h-2 bg-[var(--color-primary)]' : 'w-2 h-2 bg-[var(--color-border)]'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={finish}
                className="flex-1 py-2.5 rounded-xl text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors"
              >
                {t('ob_skip')}
              </button>
              <button
                onClick={next}
                className="flex-1 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
              >
                {current < STEPS.length - 1 ? t('ob_next') : t('ob_start')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
