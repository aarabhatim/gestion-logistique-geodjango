import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Truck, Users, AlertCircle, TrendingUp, Store, Star, CheckCircle,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { analyticsApi } from '@/services/api';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const STATUT_COLORS = {
  EN_ATTENTE: '#f59e0b',
  VALIDEE: '#3b82f6',
  EN_PREPARATION: '#8b5cf6',
  EN_ROUTE: '#06b6d4',
  LIVREE: '#10b981',
  ANNULEE: '#ef4444',
};

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--foreground))',
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.adminDashboard()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const kpis = data?.kpis || {};
  const evolution = (data?.evolution_6m || []).map(e => ({
    mois: e.mois ? new Date(e.mois).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : '',
    commandes: e.count,
    ca: Math.round(e.ca || 0),
  }));
  const parStatut = (data?.par_statut || []).map(s => ({
    name: s.statut,
    value: s.count,
    color: STATUT_COLORS[s.statut] || '#64748b',
  }));
  const topFondateurs = data?.top_fondateurs || [];
  const topTransporteurs = data?.top_transporteurs || [];

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        title="Vue d'ensemble"
        description="Tableau de bord DeliverMap — indicateurs en temps réel"
        badge="Live"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard index={0} loading={loading} title="Commandes totales" value={kpis.commandes_total} icon={Package}
          sub={`${kpis.commandes_aujourd_hui || 0} aujourd'hui`} accent="blue" />
        <KpiCard index={1} loading={loading} title="En cours" value={kpis.commandes_en_cours} icon={Truck}
          sub={`Taux livraison ${kpis.taux_livraison || 0}%`} accent="cyan" />
        <KpiCard index={2} loading={loading} title="Clients" value={kpis.clients_total} icon={Users}
          sub="Inscrits" accent="emerald" />
        <KpiCard index={3} loading={loading} title="Boutiques actives" value={kpis.fondateurs_actifs} icon={Store}
          sub={`${kpis.fondateurs_en_attente || 0} en attente`} accent="violet" />
        <KpiCard index={4} loading={loading} title="Transporteurs" value={kpis.transporteurs_actifs} icon={CheckCircle}
          sub={`${kpis.transporteurs_en_livraison || 0} en livraison`} accent="emerald" />
        <KpiCard index={5} loading={loading} title="CA total" value={`${Math.round(kpis.ca_total || 0).toLocaleString()} MAD`}
          icon={TrendingUp} sub={`${Math.round(kpis.ca_mois || 0).toLocaleString()} MAD ce mois`} accent="amber" />
        <KpiCard index={6} loading={loading} title="Signalées" value={kpis.commandes_signalees} icon={AlertCircle}
          sub="À traiter" accent="rose" />
        <KpiCard index={7} loading={loading} title="Taux livraison" value={`${kpis.taux_livraison || 0}%`} icon={Star}
          sub="Livrées / total" accent="blue" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle>Évolution des commandes (6 mois)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={evolution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mois" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="commandes" name="Commandes" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={parStatut} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {parStatut.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 grid gap-6 lg:grid-cols-2"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top boutiques</CardTitle>
            <Badge variant="info">CA</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {topFondateurs.length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée</p>}
            {topFondateurs.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                <span className="text-sm font-medium">{f.fondateur__nom_boutique || '—'}</span>
                <span className="text-sm font-semibold text-primary">{Math.round(f.ca || 0).toLocaleString()} MAD</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top transporteurs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topTransporteurs.length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée</p>}
            {topTransporteurs.map((t, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                <span className="text-sm font-medium">
                  {t.user__first_name} {t.user__last_name}
                  <span className="ml-2 text-xs text-muted-foreground">{t.vehicule_type}</span>
                </span>
                <Badge variant="secondary">{t.nombre_livraisons} livraisons</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
