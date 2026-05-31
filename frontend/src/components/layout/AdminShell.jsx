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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#080E09' }}>
      <AppSidebar />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <AppHeader />
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          style={{
            flex: 1, overflow: 'auto',
            padding: fullBleed ? 0 : '24px',
          }}
        >
          {children}
        </motion.main>
      </div>
      <ChatbotWidget onNavigate={(path) => navigate(path)} />
    </div>
  );
}

export default AdminShell;
