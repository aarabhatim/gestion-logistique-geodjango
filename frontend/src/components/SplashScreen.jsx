import React, { useEffect, useState } from 'react';

/**
 * SplashScreen — Écran de démarrage animé (premier chargement)
 *
 * Usage dans App.jsx :
 *   import SplashScreen from './components/SplashScreen';
 *
 *   const [showSplash, setShowSplash] = useState(!sessionStorage.getItem('splashDone'));
 *
 *   if (showSplash) return <SplashScreen onDone={() => {
 *     sessionStorage.setItem('splashDone', '1');
 *     setShowSplash(false);
 *   }} />;
 */

const SplashScreen = ({ onDone }) => {
  const [phase, setPhase] = useState('enter'); // enter | logo | tagline | exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('logo'),    400);
    const t2 = setTimeout(() => setPhase('tagline'), 1200);
    const t3 = setTimeout(() => setPhase('exit'),    2400);
    const t4 = setTimeout(() => onDone?.(),          3000);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onDone]);

  return (
    <div
      className={`
        fixed inset-0 bg-[var(--color-primary)] flex flex-col items-center justify-center
        transition-all duration-500
        ${phase === 'exit' ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}
      `}
      style={{ zIndex: 9999 }}
    >
      {/* Logo */}
      <div
        className={`
          transition-all duration-700
          ${phase === 'enter' ? 'opacity-0 scale-75 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}
        `}
      >
        <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-4">
          <span className="text-5xl">🚀</span>
        </div>
        <h1
          className="text-4xl font-black text-white text-center font-heading tracking-tight"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          DeliverMap
        </h1>
      </div>

      {/* Tagline */}
      <p
        className={`
          text-white/80 text-base mt-3 text-center transition-all duration-500
          ${phase === 'tagline' || phase === 'exit' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        `}
      >
        Livraison rapide, suivi en temps réel
      </p>

      {/* Loader dots */}
      <div className="flex gap-1.5 mt-10">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
