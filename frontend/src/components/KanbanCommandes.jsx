/**
 * Vue Kanban des commandes admin.
 * Colonnes : EN_ATTENTE | EN_PREPARATION | EN_ROUTE | LIVREE
 * Usage : <KanbanCommandes commandes={[]} onAvancer={fn} onDetail={fn} />
 */
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle, Clock, User, ArrowRight, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';

const COLONNES = [
  {
    statut: 'EN_ATTENTE',
    label: 'En attente',
    color: 'border-amber-500/40 bg-amber-500/5',
    headerColor: 'text-amber-500',
    dot: 'bg-amber-400',
    icon: Clock,
  },
  {
    statut: 'EN_PREPARATION',
    label: 'En préparation',
    color: 'border-violet-500/40 bg-violet-500/5',
    headerColor: 'text-violet-400',
    dot: 'bg-violet-400',
    icon: Package,
  },
  {
    statut: 'EN_ROUTE',
    label: 'En route',
    color: 'border-cyan-500/40 bg-cyan-500/5',
    headerColor: 'text-cyan-400',
    dot: 'bg-cyan-400',
    icon: Truck,
  },
  {
    statut: 'LIVREE',
    label: 'Livrée',
    color: 'border-emerald-500/40 bg-emerald-500/5',
    headerColor: 'text-emerald-400',
    dot: 'bg-emerald-400',
    icon: CheckCircle,
  },
];

const NEXT_STATUT = {
  EN_ATTENTE: 'VALIDEE',
  VALIDEE: 'EN_PREPARATION',
  EN_PREPARATION: 'EN_ROUTE',
  EN_ROUTE: 'LIVREE',
};

function CommandeCard({ commande, onAvancer, onDetail }) {
  const { t, tStatus } = useI18n();
  const isRetard = commande.eta && new Date(commande.eta) < new Date() && commande.statut !== 'LIVREE';
  const montant = commande.montant_total ?? commande.total ?? 0;
  const client = commande.client_nom ?? commande.client ?? '—';
  const boutique = commande.fondateur_nom ?? commande.boutique ?? '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'group relative rounded-lg border bg-card/80 p-3 shadow-sm hover:shadow-md transition-shadow cursor-default',
        isRetard ? 'border-rose-500/50' : 'border-border/50',
      )}
    >
      {/* Barre latérale colorée selon retard */}
      <div className={cn(
        'absolute inset-y-0 left-0 w-0.5 rounded-l-lg',
        isRetard ? 'bg-rose-500' : 'bg-transparent',
      )} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-mono font-semibold text-primary">
            #{commande.reference || commande.id}
          </span>
          {isRetard && (
            <span className="ml-2 rounded px-1 py-0.5 text-[10px] font-bold bg-rose-500/15 text-rose-400">
              EN RETARD
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs font-bold text-foreground">
          {Number(montant).toLocaleString()} MAD
        </span>
      </div>

      <div className="mt-1.5 space-y-0.5">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{client}</span>
        </div>
        {boutique && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Package className="h-3 w-3 shrink-0" />
            <span className="truncate">{boutique}</span>
          </div>
        )}
        <div className="text-[10px] text-muted-foreground/60">
          {new Date(commande.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onDetail(commande)}
          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] bg-secondary hover:bg-secondary/80 transition-colors"
        >
          {t('order_detail')}
        </button>
        {NEXT_STATUT[commande.statut] && onAvancer && (
          <button
            onClick={() => onAvancer(commande)}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] bg-primary/15 text-primary hover:bg-primary/25 transition-colors font-semibold"
          >
            {t('adm_validate')} <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Assigné à */}
      {commande.transporteur_detail && (
        <div className="mt-2 flex items-center gap-1 rounded bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-400">
          <Truck className="h-3 w-3" />
          {commande.transporteur_detail.first_name} {commande.transporteur_detail.last_name}
        </div>
      )}
    </motion.div>
  );
}

export function KanbanCommandes({ commandes = [], onAvancer, onDetail, loading = false }) {
  const { tStatus } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {COLONNES.map((col) => {
        const cards = commandes.filter(c => c.statut === col.statut);
        const Icon = col.icon;
        return (
          <div
            key={col.statut}
            className={cn('rounded-xl border p-3', col.color)}
          >
            {/* Header colonne */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn('inline-block h-2 w-2 rounded-full', col.dot)} />
                <Icon className={cn('h-4 w-4', col.headerColor)} />
                <span className={cn('text-sm font-semibold', col.headerColor)}>
                  {tStatus(col.statut)}
                </span>
              </div>
              <span className="rounded-full bg-background/60 px-2 py-0.5 text-xs font-bold text-foreground">
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[80px]">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-background/40" />
                ))
              ) : cards.length === 0 ? (
                <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border/30 text-xs text-muted-foreground/40">
                  {t('co_no_orders')}
                </div>
              ) : (
                cards.map(c => (
                  <CommandeCard
                    key={c.id}
                    commande={c}
                    onAvancer={onAvancer}
                    onDetail={onDetail}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default KanbanCommandes;
