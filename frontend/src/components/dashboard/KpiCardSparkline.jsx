/**
 * KpiCard enrichie avec mini-graphique sparkline (7 derniers points).
 * Remplace KpiCard sur le dashboard admin principal.
 */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts';

const accentMap = {
  blue:    'from-blue-500/20 to-blue-600/5 text-blue-600 dark:text-blue-400 border-blue-500/20',
  emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  amber:   'from-amber-500/20 to-amber-600/5 text-amber-600 dark:text-amber-400 border-amber-500/20',
  violet:  'from-violet-500/20 to-violet-600/5 text-violet-600 dark:text-violet-400 border-violet-500/20',
  rose:    'from-rose-500/20 to-rose-600/5 text-rose-600 dark:text-rose-400 border-rose-500/20',
  cyan:    'from-cyan-500/20 to-cyan-600/5 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
};

const strokeMap = {
  blue: '#3b82f6', emerald: '#10b981', amber: '#f59e0b',
  violet: '#8b5cf6', rose: '#f43f5e', cyan: '#06b6d4',
};

/**
 * @param {string}   title
 * @param {string}   value       - valeur principale affichée
 * @param {string}   [sub]       - sous-texte
 * @param {React.ComponentType} icon
 * @param {string}   [accent]    - 'blue'|'emerald'|'amber'|'violet'|'rose'|'cyan'
 * @param {boolean}  [loading]
 * @param {number}   [index]     - pour stagger animation
 * @param {Array}    [sparkData] - [{v: number}, ...] — 7 points max
 * @param {string}   [trend]     - '+12%' ou '-3%'  (optionnel)
 */
export function KpiCardSparkline({
  title, value, sub, icon: Icon, accent = 'blue',
  loading, index = 0, sparkData = [], trend,
}) {
  const isPositive = trend && trend.startsWith('+');
  const isNegative = trend && trend.startsWith('-');

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
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {title}
              </p>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-24" />
              ) : (
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="font-display text-2xl font-bold tracking-tight">{value ?? '—'}</p>
                  {trend && (
                    <span className={cn(
                      'text-xs font-semibold',
                      isPositive && 'text-emerald-500',
                      isNegative && 'text-rose-500',
                      !isPositive && !isNegative && 'text-muted-foreground',
                    )}>
                      {trend}
                    </span>
                  )}
                </div>
              )}
              {sub && !loading && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>
              )}

              {/* Sparkline */}
              {sparkData.length > 1 && !loading && (
                <div className="mt-3 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparkData}>
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 6,
                          fontSize: 11,
                          padding: '4px 8px',
                        }}
                        formatter={(v) => [v, '']}
                        labelFormatter={() => ''}
                      />
                      <Line
                        type="monotone"
                        dataKey="v"
                        stroke={strokeMap[accent]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {Icon && (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background/60 backdrop-blur">
                <Icon className="h-5 w-5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default KpiCardSparkline;
