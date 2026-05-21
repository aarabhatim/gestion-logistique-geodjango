import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Package, AlertTriangle } from 'lucide-react';
import { calendrierApi } from '../../services/api';

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const STATUT_COLORS = {
  VALIDEE: '#3b82f6', EN_PREPARATION: '#f59e0b',
  EN_ROUTE: '#10b981', LIVREE: '#22c55e', ANNULEE: '#ef4444',
};

export default function CalendrierPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [view, setView] = useState('month'); // 'month' | 'week'

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const r = await calendrierApi.livraisons({ year, month: month + 1 });
      setEvents(r.data.events || []);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [year, month]);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventsForDay = (d) => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return events.filter(e => e.date === key);
  };

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={22} /> Calendrier des livraisons
          </h2>
          <p className="page-subtitle">{events.length} livraison{events.length !== 1 ? 's' : ''} ce mois</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={prevMonth}><ChevronLeft size={16} /></button>
          <span style={{ display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: 15, padding: '0 8px' }}>
            {MOIS[month]} {year}
          </span>
          <button className="btn btn-secondary" onClick={nextMonth}><ChevronRight size={16} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDay ? '1fr 300px' : '1fr', gap: '1.25rem' }}>
        {/* Grid calendrier */}
        <div className="glass-card animate-fade-in" style={{ padding: '1rem' }}>
          {loading && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}><div className="spinner" style={{ margin: 'auto' }} /></div>}
          {!loading && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
                {JOURS.map(j => (
                  <div key={j} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', padding: '6px 0' }}>{j}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                {cells.map((d, idx) => {
                  if (!d) return <div key={`empty-${idx}`} />;
                  const dayEvents = eventsForDay(d);
                  const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                  const isSelected = d === selectedDay;
                  return (
                    <div key={d}
                      onClick={() => setSelectedDay(isSelected ? null : d)}
                      style={{
                        minHeight: 70, padding: '6px 4px', borderRadius: 10, cursor: 'pointer',
                        background: isSelected ? 'rgba(99,102,241,0.18)' : isToday ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
                        border: isSelected ? '1px solid rgba(99,102,241,0.5)' : isToday ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                        transition: 'all 0.15s',
                      }}>
                      <div style={{ fontSize: 12, fontWeight: isToday ? 900 : 600, color: isToday ? 'var(--accent-primary)' : undefined, marginBottom: 4 }}>{d}</div>
                      {dayEvents.slice(0, 3).map(e => (
                        <div key={e.id} style={{
                          fontSize: 9, padding: '1px 4px', borderRadius: 4, marginBottom: 2,
                          background: `${STATUT_COLORS[e.statut] || '#64748b'}25`,
                          color: STATUT_COLORS[e.statut] || '#64748b',
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}>
                          #{e.reference}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div style={{ fontSize: 9, color: 'var(--text-secondary)' }}>+{dayEvents.length - 3}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Panneau détail jour */}
        {selectedDay && (
          <div className="glass-card animate-fade-in" style={{ padding: '1rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: 14 }}>
              {selectedDay} {MOIS[month]} {year} — {selectedEvents.length} livraison{selectedEvents.length !== 1 ? 's' : ''}
            </div>
            {selectedEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: 12 }}>Aucune livraison</div>
            ) : (
              selectedEvents.map(e => (
                <div key={e.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>#{e.reference}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: `${STATUT_COLORS[e.statut] || '#64748b'}20`, color: STATUT_COLORS[e.statut] || '#64748b' }}>
                      {e.statut}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.client || '-'}</div>
                  {e.transporteur && <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>🚚 {e.transporteur}</div>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
