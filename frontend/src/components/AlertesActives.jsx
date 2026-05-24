/**
 * Widget "Alertes actives" — incidents ouverts, tickets urgents, contrats expirant.
 * À placer en haut du dashboard admin.
 */
import { useState, useEffect } from 'react';
import { AlertTriangle, Ticket, FileText, X, ChevronRight } from 'lucide-react';
import { incidentsApi, ticketsApi, contratsApi } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const URGENCE_COLORS = {
  incident: { bg: 'bg-rose-500/15 border-rose-500/30', icon: 'text-rose-500', dot: 'bg-rose-500' },
  ticket:   { bg: 'bg-amber-500/15 border-amber-500/30', icon: 'text-amber-500', dot: 'bg-amber-500' },
  contrat:  { bg: 'bg-blue-500/15 border-blue-500/30', icon: 'text-blue-500', dot: 'bg-blue-500' },
};

export function AlertesActives() {
  const [alertes, setAlertes] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    const load = async () => {
      const nouvelles = [];

      try {
        const r = await incidentsApi.liste({ statut: 'ouvert', page_size: 5 });
        const items = r.data?.results || r.data || [];
        items.slice(0, 3).forEach(inc => nouvelles.push({
          id: `inc-${inc.id}`,
          type: 'incident',
          label: `Incident #${inc.id} — ${inc.type_incident || 'non classifié'}`,
          sub: inc.transporteur_nom || '',
          icon: AlertTriangle,
        }));
      } catch (_) {}

      try {
        const r = await ticketsApi.liste({ priorite: 'urgent', statut: 'ouvert', page_size: 5 });
        const items = r.data?.results || r.data || [];
        items.slice(0, 3).forEach(t => nouvelles.push({
          id: `tkt-${t.id}`,
          type: 'ticket',
          label: `Ticket urgent — ${t.sujet || t.objet || '#' + t.id}`,
          sub: t.auteur_nom || '',
          icon: Ticket,
        }));
      } catch (_) {}

      try {
        const r = await contratsApi.liste({ statut: 'actif', expiration_proche: true });
        const items = r.data?.results || r.data || [];
        items.slice(0, 2).forEach(c => nouvelles.push({
          id: `cnt-${c.id}`,
          type: 'contrat',
          label: `Contrat expirant — ${c.transporteur_nom || '#' + c.id}`,
          sub: c.date_fin ? `Expire le ${new Date(c.date_fin).toLocaleDateString('fr-FR')}` : '',
          icon: FileText,
        }));
      } catch (_) {}

      setAlertes(nouvelles);
    };
    load();
  }, []);

  const visibles = alertes.filter(a => !dismissed.has(a.id));
  if (visibles.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <AnimatePresence>
        {visibles.map((alerte) => {
          const couleurs = URGENCE_COLORS[alerte.type];
          const Icon = alerte.icon;
          return (
            <motion.div
              key={alerte.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                couleurs.bg
              )}
            >
              {/* Point animé */}
              <span className={cn('inline-block h-2 w-2 shrink-0 animate-pulse rounded-full', couleurs.dot)} />

              <Icon className={cn('h-4 w-4 shrink-0', couleurs.icon)} />

              <span className="font-medium leading-none">{alerte.label}</span>
              {alerte.sub && (
                <span className="hidden text-xs text-muted-foreground sm:inline">— {alerte.sub}</span>
              )}

              <button
                onClick={() => setDismissed(prev => new Set([...prev, alerte.id]))}
                className="ml-1 rounded p-0.5 opacity-50 hover:opacity-100 transition-opacity"
                aria-label="Fermer"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {visibles.length > 0 && (
        <div className="flex items-center gap-1 rounded-lg border border-dashed border-border/50 px-3 py-2 text-xs text-muted-foreground">
          <span>{visibles.length} alerte{visibles.length > 1 ? 's' : ''} active{visibles.length > 1 ? 's' : ''}</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}
