import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const accentMap = {
  blue: 'from-blue-500/20 to-blue-600/5 text-blue-600 dark:text-blue-400 border-blue-500/20',
  emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  amber: 'from-amber-500/20 to-amber-600/5 text-amber-600 dark:text-amber-400 border-amber-500/20',
  violet: 'from-violet-500/20 to-violet-600/5 text-violet-600 dark:text-violet-400 border-violet-500/20',
  rose: 'from-rose-500/20 to-rose-600/5 text-rose-600 dark:text-rose-400 border-rose-500/20',
  cyan: 'from-cyan-500/20 to-cyan-600/5 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
};

export function KpiCard({ title, value, sub, icon: Icon, accent = 'blue', loading, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <Card className={cn('overflow-hidden border bg-gradient-to-br', accentMap[accent])}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-24" />
              ) : (
                <p className="mt-1 font-display text-2xl font-bold tracking-tight">{value ?? '—'}</p>
              )}
              {sub && !loading && (
                <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>
              )}
            </div>
            {Icon && (
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background/60 backdrop-blur')}>
                <Icon className="h-5 w-5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
