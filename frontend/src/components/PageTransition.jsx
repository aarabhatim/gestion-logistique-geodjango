import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const variants = {
  initial:  { opacity: 0, y: 14, scale: 0.99 },
  animate:  { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  exit:     { opacity: 0, y: -8, scale: 0.99, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
};

/**
 * Wrapper à utiliser autour du contenu d'une page pour appliquer
 * une animation d'entrée/sortie fluide (fade + légère translation verticale).
 *
 * Usage dans App.jsx :
 *   <PageTransition>
 *     <MonComposant />
 *   </PageTransition>
 */
const PageTransition = ({ children }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ width: '100%', height: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
