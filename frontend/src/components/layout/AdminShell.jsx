import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import ChatbotWidget from '@/components/ChatbotWidget';
import { cn } from '@/lib/utils';

export function AdminShell({ children, fullBleed = false }) {
  const { setAdminRole, setDefaultRole, setDark } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    setAdminRole();
    setDark();
    return () => setDefaultRole();
  }, [setAdminRole, setDefaultRole, setDark]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader />
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className={cn('flex-1 overflow-auto', fullBleed ? 'p-0' : 'p-6')}
        >
          {children}
        </motion.main>
      </div>
      <ChatbotWidget onNavigate={(path) => navigate(path)} />
    </div>
  );
}
