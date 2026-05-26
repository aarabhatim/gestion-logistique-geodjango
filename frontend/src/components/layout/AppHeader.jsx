import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Globe, Search, Sun, Moon, Trash2, CheckCheck, X, Plus } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/contexts/I18nContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export function AppHeader() {
  const { t } = useI18n();
  const { mode, toggleMode, isAdmin } = useTheme();
  const { user } = useAuth();
  const {
    notifications, unreadCount, loading, hasMore,
    fetchNotifications, fetchNextPage, marquerLue, supprimer, toutLire, supprimerLues,
  } = useNotifications();

  const [openNotif, setOpenNotif] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (openNotif) fetchNotifications(true, showAll);
  }, [openNotif, showAll, fetchNotifications]);

  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setOpenNotif(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user ? ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || 'A' : 'A';

  const headerBg = isAdmin
    ? 'linear-gradient(90deg,rgba(7,20,13,0.96) 0%,rgba(8,26,16,0.96) 100%)'
    : 'hsl(var(--background) / 0.8)';
  const headerBorder = isAdmin ? 'rgba(34,197,94,0.08)' : 'hsl(var(--border))';
  const ctrlStyle = isAdmin
    ? { background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', color: 'white' }
    : {};

  return (
    <header
      className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b px-6 backdrop-blur-xl"
      style={{ borderColor: headerBorder, background: headerBg }}
    >
      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-9 text-sm"
          style={isAdmin ? { background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10, color: 'white' } : {}}
          placeholder={t('search_placeholder')}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {isAdmin && (
          <button
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(90deg,#16a34a,#22c55e)', boxShadow: '0 4px 16px rgba(34,197,94,0.25)', transition: 'transform 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Plus size={15} />
            {t('sb_add_expedition')}
          </button>
        )}

        <Button variant="ghost" size="icon" onClick={toggleMode} aria-label="Theme"
          className="h-9 w-9 rounded-xl" style={ctrlStyle}>
          {mode === 'dark' ? <Sun className="h-[17px] w-[17px] text-amber-400" /> : <Moon className="h-[17px] w-[17px]" />}
        </Button>

        {/* Sélecteur de langue — composant unifié, identique au client */}
        <LanguageSwitcher variant="dark" />

        <div className="relative" ref={notifRef}>
          <Button variant="outline" size="icon" onClick={() => setOpenNotif(s => !s)}
            className="relative h-9 w-9 rounded-xl" style={ctrlStyle}>
            <Bell className="h-[17px] w-[17px]" style={isAdmin ? { color: '#9ca3af' } : {}} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                style={{ background: '#ef4444' }}>
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
                className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-2xl border shadow-lg flex flex-col"
                style={{
                  maxHeight: 'calc(80vh - 64px)',
                  background: isAdmin ? '#0D2015' : 'hsl(var(--card))',
                  borderColor: isAdmin ? 'rgba(34,197,94,0.12)' : 'hsl(var(--border))',
                }}
              >
                <div className="flex items-center justify-between border-b px-4 py-3 shrink-0"
                  style={{ borderColor: isAdmin ? 'rgba(34,197,94,0.08)' : undefined }}>
                  <span className="font-semibold text-sm flex items-center gap-2">
                    {t('notifications')}
                    {unreadCount > 0 && <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-bold">{unreadCount}</Badge>}
                  </span>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={toutLire} title={t('mark_all_read')}>
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={supprimerLues} title={t('sb_notifications_delete_read')}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpenNotif(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex border-b text-xs font-medium shrink-0"
                  style={{ borderColor: isAdmin ? 'rgba(34,197,94,0.08)' : undefined }}>
                  {[t('sb_notifications_unread'), t('sb_notifications_all')].map((label, i) => {
                    const active = i === 0 ? !showAll : showAll;
                    return (
                      <button key={label} onClick={() => setShowAll(i === 1)}
                        className={cn('flex-1 py-2.5 text-center border-b-2 transition-all',
                          active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}>
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="overflow-y-auto flex-1 divide-y divide-border/50">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">{t('no_notifications')}</p>
                    </div>
                  ) : (
                    <>
                      {notifications.map(n => (
                        <div key={n.id}
                          className={cn('flex gap-3 px-4 py-3 items-start relative group transition-colors',
                            n.lue ? 'hover:bg-muted/10' : 'bg-primary/5 hover:bg-primary/10'
                          )}>
                          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full',
                            n.type_notif === 'WARNING' || n.type === 'WARNING' ? 'bg-amber-500' :
                            n.type_notif === 'DANGER'  || n.type === 'DANGER'  ? 'bg-destructive' :
                            n.type_notif === 'SUCCESS' || n.type_notif === 'LIVRAISON' ? 'bg-emerald-500' : 'bg-primary',
                          )} />
                          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => !n.lue && marquerLue(n.id)}>
                            <p className={cn('text-xs font-semibold truncate', !n.lue ? 'text-foreground' : 'text-muted-foreground')}>{n.titre}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                            <p className="mt-1 text-[9px] text-muted-foreground">{new Date(n.date_creation).toLocaleString('fr-FR')}</p>
                          </div>
                          <Button variant="ghost" size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => supprimer(n.id)} title={t('common_close')}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {showAll && hasMore && (
                        <div className="p-3 text-center border-t shrink-0">
                          <Button variant="outline" size="sm" className="w-full text-xs" onClick={fetchNextPage} disabled={loading}>
                            {loading ? t('common_loading') : t('sb_notifications_load_more')}
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

        <Avatar className="h-9 w-9 cursor-pointer"
          style={{ border: '2px solid ' + (isAdmin ? 'rgba(34,197,94,0.3)' : 'hsl(var(--border))') }}>
          <AvatarFallback className="text-xs font-bold text-white"
            style={{ background: isAdmin ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'hsl(var(--primary))' }}>
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
