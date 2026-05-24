import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const accentMap = {
  green:   { iconBg: 'rgba(34,197,94,0.12)',  iconColor: '#22C55E', border: 'rgba(34,197,94,0.1)',  cardBg: 'linear-gradient(145deg,#0D2015,#102817)', glowColor: 'rgba(34,197,94,0.08)' },
  amber:   { iconBg: 'rgba(234,179,8,0.12)',  iconColor: '#EAB308', border: 'rgba(234,179,8,0.1)',  cardBg: 'linear-gradient(145deg,#131001,#1a1502)', glowColor: 'rgba(234,179,8,0.06)' },
  blue:    { iconBg: 'rgba(59,130,246,0.12)', iconColor: '#3b82f6', border: 'rgba(59,130,246,0.1)', cardBg: 'linear-gradient(145deg,#0D2015,#102817)', glowColor: 'rgba(59,130,246,0.06)' },
  emerald: { iconBg: 'rgba(34,197,94,0.12)',  iconColor: '#22C55E', border: 'rgba(34,197,94,0.1)',  cardBg: 'linear-gradient(145deg,#0D2015,#102817)', glowColor: 'rgba(34,197,94,0.08)' },
  violet:  { iconBg: 'rgba(139,92,246,0.12)', iconColor: '#8b5cf6', border: 'rgba(139,92,246,0.1)', cardBg: 'linear-gradient(145deg,#0D2015,#102817)', glowColor: 'rgba(139,92,246,0.06)' },
  rose:    { iconBg: 'rgba(239,68,68,0.12)',  iconColor: '#ef4444', border: 'rgba(239,68,68,0.1)',  cardBg: 'linear-gradient(145deg,#0D2015,#102817)', glowColor: 'rgba(239,68,68,0.06)' },
  cyan:    { iconBg: 'rgba(6,182,212,0.12)',  iconColor: '#06b6d4', border: 'rgba(6,182,212,0.1)',  cardBg: 'linear-gradient(145deg,#0D2015,#102817)', glowColor: 'rgba(6,182,212,0.06)' },
};

export function KpiCard({ title, value, sub, icon: Icon, accent = 'green', loading, index = 0, trend }) {
  const a = accentMap[accent] || accentMap.green;
  const trendUp = trend > 0;
  const trendColor = trendUp ? '#22C55E' : '#ef4444';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <div
        className="overflow-hidden"
        style={{
          background: a.cardBg,
          borderRadius: 20,
          padding: '20px 22px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
          border: '1px solid ' + a.border,
          transition: 'box-shadow 0.3s ease',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#9CA3AF' }}>
              {title}
            </p>
            {loading ? (
              <Skeleton className="mt-2 h-8 w-24" style={{ background: 'rgba(255,255,255,0.06)' }} />
            ) : (
              <p className="mt-1.5 text-2xl font-bold tracking-tight text-white leading-none">
                {value ?? '—'}
              </p>
            )}
            {!loading && (
              <div className="mt-2 flex items-center gap-2">
                {trend != null && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: trendColor }}>
                    {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(trend)}%
                  </span>
                )}
                {sub && (
                  <span className="text-[11px] truncate" style={{ color: '#6B7280' }}>{sub}</span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: a.iconBg, border: '1px solid ' + a.border }}
            >
              <Icon className="h-5 w-5" style={{ color: a.iconColor }} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
