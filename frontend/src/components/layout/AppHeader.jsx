import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Globe, Search, Sun, Moon } from 'lucide-react';
import { notificationsApi } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const LANGS = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'ar', flag: '🇲🇦', label: 'العربية' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
];

export function AppHeader() {
  const { t, langue, setLangue } = useI18n();
  const { mode, toggleMode } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [openNotif, setOpenNotif] = useState(false);
  const notifRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.nonLues();
      setNotifications(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setOpenNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAll = async () => {
    await notificationsApi.toutLire();
    await fetchNotifications();
    setOpenNotif(false);
  };

  const markOne = async (id) => {
    await notificationsApi.marquerLue(id);
    await fetchNotifications();
  };

  const currentLang = LANGS.find(l => l.code === langue) || LANGS[0];

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-xl">
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-10 pl-9 bg-muted/50" placeholder={t('search_placeholder')} />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleMode} aria-label="Thème">
          {mode === 'dark' ? <Sun className="h-[18px] w-[18px] text-amber-400" /> : <Moon className="h-[18px] w-[18px]" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Globe className="h-4 w-4" />
              <span>{currentLang.flag}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {LANGS.map(l => (
              <DropdownMenuItem key={l.code} onClick={() => setLangue(l.code)} className="gap-2">
                <span>{l.flag}</span> {l.label}
                {l.code === langue && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative" ref={notifRef}>
          <Button variant="outline" size="icon" onClick={() => setOpenNotif(s => !s)} className="relative">
            <Bell className="h-[18px] w-[18px]" />
            {notifications.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </Button>

          <AnimatePresence>
            {openNotif && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-card shadow-lg"
              >
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <span className="font-semibold">{t('notifications')}</span>
                  {notifications.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={markAll}>
                      {t('mark_all_read')}
                    </Button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">{t('no_notifications')}</p>
                  ) : (
                    notifications.map(n => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => markOne(n.id)}
                        className="flex w-full gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <span className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          n.type_notif === 'WARNING' ? 'bg-amber-500' : n.type_notif === 'LIVRAISON' ? 'bg-emerald-500' : 'bg-primary',
                        )} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{n.titre}</p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {new Date(n.date_creation).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
