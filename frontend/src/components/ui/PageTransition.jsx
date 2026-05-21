/**
 * PageTransition — Framer Motion transitions entre routes
 *
 * Prérequis : npm install framer-motion (déjà installé selon le projet)
 *
 * Usage dans App.jsx :
 *   import { AnimatePresence } from 'framer-motion';
 *   import PageTransition from './components/ui/PageTransition';
 *
 *   // Wrapper autour de Routes :
 *   <AnimatePresence mode="wait">
 *     <Routes location={location} key={location.pathname}>
 *       <Route path="..." element={<PageTransition><VotrePage /></PageTransition>} />
 *     </Routes>
 *   </AnimatePresence>
 *
 * OU plus simplement, wrapper chaque page :
 *   const MaPage = () => <PageTransition>...contenu...</PageTransition>
 */

import React from 'react';
import { motion } from 'framer-motion';

const variants = {
  fade: {
    initial:  { opacity: 0 },
    animate:  { opacity: 1 },
    exit:     { opacity: 0 },
  },
  slide: {
    initial:  { opacity: 0, x: 24 },
    animate:  { opacity: 1, x: 0 },
    exit:     { opacity: 0, x: -24 },
  },
  slideUp: {
    initial:  { opacity: 0, y: 20 },
    animate:  { opacity: 1, y: 0 },
    exit:     { opacity: 0, y: -20 },
  },
  scale: {
    initial:  { opacity: 0, scale: 0.96 },
    animate:  { opacity: 1, scale: 1 },
    exit:     { opacity: 0, scale: 0.96 },
  },
};

const PageTransition = ({
  children,
  variant = 'slideUp',
  duration = 0.22,
  className = '',
}) => {
  const v = variants[variant] || variants.slideUp;

  return (
    <motion.div
      initial={v.initial}
      animate={v.animate}
      exit={v.exit}
      transition={{ duration, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
