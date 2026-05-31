import React, { useState, useEffect, useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { Award, RefreshCw, TrendingUp, Star, BarChart2, ChevronUp, ChevronDown } from 'lucide-react';
import { scoringApi } from '../services/api';
import { useI18n } from '../contexts/I18nContext';

// Translated at render time via DIMENSIONS_I18N inside the Scoring component.
const DIMENSIONS = [
  { key: 'ponctualite',  i18n: 'sc_col_punctuality',  color: '#3b82f6' },
  { key: 'fiabilite',    i18n: 'sc_col_reliability',  color: '#10b981' },
  { key: 'satisfaction', i18n: 'sc_col_satisfaction', color: '#f59e0b' },
  { key: 'rapidite',     i18n: 'sc_col_speed',        color: '#22c55e' },
];

const ScoreBadge = ({ score }) => {
  const { t } = useI18n();
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? t('sc_excellent') : score >= 60 ? t('sc_good') : t('sc_to_improve');
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}22`,
      padding: '2px 8px', borderRadius: 6 }}>
      {score?.toFixed(1)} — {label}
    </span>
  );
};

const ScoreRadar = ({ data }) => {
  const { t } = useI18n();
  if (!data) return null;
  const chartData = DIMENSIONS.map(d => ({
    subject: t(d.i18n),
    value: Math.round((data[d.key] || 0) * 100) / 100,
    fullMark: 100,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
        <Radar name="Score" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
          formatter={(v) => [`${v}/100`, '']}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

const Scoring = () => {
  const { t } = useI18n();
  const [classement, setClassement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('score_global');
  const [sortDir, setSortDir] = useState('desc');
  const [selected, setSelected] = useState(null);
  const [recalcLoading, setRecalcLoading] = useState(false);

  const fetchClassement = async () => {
    setLoading(true);
    try {
      const res = await scoringApi.classement({ ordering: '-score_global' });
      const items = res.data.results || res.data;
      setClassement(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClassement(); }, []);

  const handleRecalcTous = async () => {
    setRecalcLoading(true);
    try {
      await scoringApi.recalculerTous();
      await fetchClassement();
    } catch { alert(t('sc_err_recalc')); }
    finally { setRecalcLoading(false); }
  };

  const handleRecalc = async (id) => {
    try {
      const res = await scoringApi.recalculer(id);
      setClassement(prev => prev.map(s => s.id === id ? { ...s, ...res.data } : s));
      if (selected?.id === id) setSelected(res.data);
    } catch { alert(t('state_error')); }
  };

  const sorted = useMemo(() => {
    return [...classement].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [classement, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Award size={24} /> {t('scoring')}
          </h2>
          <p className="page-subtitle">{t('scoring_subtitle')}</p>
        </div>
        <button onClick={handleRecalcTous} className="btn btn-secondary"
          disabled={recalcLoading}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} className={recalcLoading ? 'spin' : ''} />
          {recalcLoading ? t('common_loading') : t('recalculate_all')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap: '1.25rem' }}>
        {/* Tableau classement */}
        <div className="glass-card animate-fade-in" style={{ overflow: 'auto' }}>
          <table className="data-table" style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>{t('transporteurs')}</th>
                {DIMENSIONS.map(d => (
                  <th key={d.key} onClick={() => toggleSort(d.key)}
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    {t(d.i18n)} <SortIcon k={d.key} />
                  </th>
                ))}
                <th onClick={() => toggleSort('score_global')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}>
                  {t('sc_col_global')} <SortIcon k="score_global" />
                </th>
                <th>{t('sc_col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                  <RefreshCw size={18} className="spin" style={{ opacity: 0.5 }} />
                </td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: 13 }}>
                  {t('common_no_results')}
                </td></tr>
              ) : (
                sorted.map((s, idx) => {
                  const nom = s.transporteur_nom || s.transporteur?.first_name || `#${s.transporteur || s.id}`;
                  const isSelected = selected?.id === s.id;
                  return (
                    <tr key={s.id}
                      onClick={() => setSelected(isSelected ? null : s)}
                      style={{ cursor: 'pointer', background: isSelected ? 'rgba(34,197,94,0.1)' : '' }}>
                      <td>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{nom}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {s.nb_livraisons || 0} {t('sc_deliveries_count')}
                        </div>
                      </td>
                      {DIMENSIONS.map(d => (
                        <td key={d.key}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${s[d.key] || 0}%`, height: '100%', background: d.color, borderRadius: 4 }} />
                            </div>
                            <span style={{ fontSize: 11, color: d.color, minWidth: 28, textAlign: 'right' }}>
                              {(s[d.key] || 0).toFixed(0)}
                            </span>
                          </div>
                        </td>
                      ))}
                      <td>
                        <ScoreBadge score={s.score_global} />
                      </td>
                      <td>
                        <button onClick={(e) => { e.stopPropagation(); handleRecalc(s.id); }}
                          className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <RefreshCw size={11} /> {t('sc_recalc')}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Detail radar */}
        {selected && (
          <div className="glass-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart2 size={14} /> {t('sc_perf_profile')}
              </h4>
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18 }}>
                ×
              </button>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {selected.transporteur_nom || `Transporteur #${selected.transporteur}`}
              </div>
              <ScoreBadge score={selected.score_global} />
            </div>
            <ScoreRadar data={selected} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {DIMENSIONS.map(d => (
                <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 90 }}>{t(d.i18n)}</span>
                  <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${selected[d.key] || 0}%`, height: '100%', background: d.color, borderRadius: 6,
                      transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: d.color, minWidth: 32, textAlign: 'right' }}>
                    {(selected[d.key] || 0).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
            {selected.nb_livraisons !== undefined && (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', paddingTop: 8,
                borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <TrendingUp size={11} style={{ marginRight: 4 }} />
                Basé sur {selected.nb_livraisons} livraisons
                {selected.note_moyenne > 0 && ` · Note moyenne : ${selected.note_moyenne?.toFixed(1)}/5`}
                <Star size={10} style={{ marginLeft: 2, marginBottom: -1 }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scoring;
