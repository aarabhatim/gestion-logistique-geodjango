import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Globe, Search, Sun, Moon, Trash2, CheckCheck, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/contexts/I18nContext';
import { useNotifications } from '@/contexts/NotificationContext';
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
  
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    fetchNotifications,
    fetchNextPage,
    marquerLue,
    supprimer,
    toutLire,
    supprimerLues,
  } = useNotifications();

  const [openNotif, setOpenNotif] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (openNotif) {
      fetchNotifications(true, showAll);
    }
  }, [openNotif, showAll, fetchNotifications]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setOpenNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
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
                className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-xl border bg-card shadow-lg flex flex-col"
                style={{ maxHeight: 'calc(80vh - 64px)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
                  <span className="font-semibold text-sm flex items-center gap-2">
                    {t('notifications')}
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-bold">
                        {unreadCount}
                      </Badge>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={toutLire} title={t('mark_all_read')}>
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={supprimerLues} title="Supprimer les lues">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpenNotif(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="flex border-b text-xs font-medium shrink-0">
                  <button
                    onClick={() => setShowAll(false)}
                    className={cn(
                      "flex-1 py-2 text-center border-b-2 transition-all",
                      !showAll ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Non lues
                  </button>
                  <button
                    onClick={() => setShowAll(true)}
                    className={cn(
                      "flex-1 py-2 text-center border-b-2 transition-all",
                      showAll ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Toutes
                  </button>
                </div>

                {/* Scrollable list */}
                <div className="overflow-y-auto flex-1 divide-y divide-border/50">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">{t('no_notifications')}</p>
                    </div>
                  ) : (
                    <>
                      {notifications.map(n => (
                        <div
                          key={n.id}
                          className={cn(
                            "flex gap-3 px-4 py-3 items-start relative group transition-colors",
                            n.lue ? "bg-card hover:bg-muted/30" : "bg-primary/5 hover:bg-primary/10"
                          )}
                        >
                          <span className={cn(
                            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                            n.type_notif === 'WARNING' || n.type === 'WARNING' ? 'bg-amber-500' : 
                            n.type_notif === 'DANGER' || n.type === 'DANGER' ? 'bg-destructive' :
                            n.type_notif === 'SUCCESS' || n.type_notif === 'LIVRAISON' ? 'bg-emerald-500' : 'bg-primary',
                          )} />
                          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => !n.lue && marquerLue(n.id)}>
                            <p className={cn("text-xs font-semibold truncate", !n.lue ? "text-foreground" : "text-muted-foreground")}>{n.titre}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                            <p className="mt-1 text-[9px] text-muted-foreground">
                              {new Date(n.date_creation).toLocaleString('fr-FR')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => supprimer(n.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}

                      {showAll && hasMore && (
                        <div className="p-3 text-center border-t shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            onClick={fetchNextPage}
                            disabled={loading}
                          >
                            {loading ? "Chargement..." : "Charger plus"}
                          </Button>
                        </div>
                      )}
                    </>
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
