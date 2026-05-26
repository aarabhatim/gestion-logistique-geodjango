import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, FeatureGroup, Polygon, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { zonesApi, transporteursApi } from '../../services/api';
import { MapPin, Plus, Trash2, Edit2, Save, X, Users } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';

export default function ZonesPage() {
  const { t } = useI18n();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', description: '', tarif_base: 0, tarif_km_supplementaire: 0, couleur: '#3b82f6', actif: true });
  const [transporteurs, setTransporteurs] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [z, tr] = await Promise.all([zonesApi.list(), transporteursApi.adminListe()]);
      setZones(z.data?.results || z.data || []);
      setTransporteurs(tr.data?.results || tr.data || []);
    } catch { setZones([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async () => {
    try {
      if (selected?.id) { await zonesApi.update(selected.id, form); showToast(t('zn_toast_updated')); }
      else { await zonesApi.create(form); showToast(t('zn_toast_created')); }
      setShowForm(false);
      setForm({ nom: '', description: '', tarif_base: 0, tarif_km_supplementaire: 0, couleur: '#3b82f6', actif: true });
      fetchAll();
    } catch { showToast(t('zn_error'), 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('zn_confirm_delete'))) return;
    try { await zonesApi.delete(id); showToast(t('zn_toast_deleted')); fetchAll(); }
    catch { showToast(t('zn_error'), 'error'); }
  };

  const handleAssign = async (zoneId, tid) => {
    try { await zonesApi.assignerTransporteur(zoneId, tid); showToast(t('zn_toast_assigned')); fetchAll(); }
    catch { showToast(t('zn_error'), 'error'); }
  };

  return (
    <div className="dashboard-container">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white', fontWeight: 600 }}>
          {toast.msg}
        </div>
      )}
      <div className="dashboard-header animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={22} /> {t('zn_title')}
          </h2>
          <p className="page-subtitle">{zones.length} {t('zn_subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelected(null); setShowForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> {t('zn_btn_new')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.25rem' }}>
        {/* Liste zones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></div>
          ) : zones.map(z => (
            <div key={z.id} className="glass-card" style={{ padding: '0.85rem 1rem', borderLeft: `3px solid ${z.couleur}`, cursor: 'pointer' }} onClick={() => setSelected(z)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{z.nom}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {t('zn_base_rate_label')}: <b>{z.tarif_base} DH</b> · +{z.tarif_km_supplementaire}/km
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <Users size={10} /> {z.transporteurs_count || 0} {(z.transporteurs_count || 0) !== 1 ? t('zn_driver_plural') : t('zn_driver_singular')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={e => {
                    e.stopPropagation();
                    setForm({ nom: z.nom, description: z.description || '', tarif_base: z.tarif_base, tarif_km_supplementaire: z.tarif_km_supplementaire, couleur: z.couleur, actif: z.actif });
                    setSelected(z);
                    setShowForm(true);
                  }}><Edit2 size={12} /></button>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={e => { e.stopPropagation(); handleDelete(z.id); }}><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carte */}
        <div className="glass-card animate-fade-in" style={{ overflow: 'hidden', borderRadius: 14 }}>
          <MapContainer center={[33.589886, -7.603869]} zoom={11} style={{ height: 500 }}>
            <TileLayer
              url="https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=5d2tALzIlgsl0ucJYKZL"
              attribution="&copy; MapTiler &copy; OpenStreetMap contributors"
            />
            {zones.map(z => z.polygone?.coordinates && (
              <Polygon key={z.id}
                positions={z.polygone.coordinates[0].map(([lng, lat]) => [lat, lng])}
                pathOptions={{ color: z.couleur, fillColor: z.couleur, fillOpacity: 0.15, weight: 2 }}>
                <Popup><b>{z.nom}</b><br />{t('zn_base_rate_label')}: {z.tarif_base} DH</Popup>
              </Polygon>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Detail panel — assign drivers */}
      {selected && !showForm && (
        <div className="glass-card animate-fade-in" style={{ marginTop: '1.25rem', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>{t('zn_assign_drivers_title')} — {selected.nom}</h3>
            <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setSelected(null)}><X size={14} /></button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {transporteurs.slice(0, 20).map(tr => (
              <button key={tr.id} className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => handleAssign(selected.id, tr.id)}>
                + {tr.nom_complet || tr.user_email}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card animate-fade-in" style={{ width: 420, padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: 15 }}>
              {selected?.id ? t('zn_modal_edit_title') : t('zn_modal_new_title')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['nom',         t('zn_field_zone_name')],
                ['description', t('adm_description')],
              ].map(([key, label]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input className="glass-input" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%' }} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('zn_field_base_rate')}</label>
                  <input type="number" className="glass-input" value={form.tarif_base} onChange={e => setForm(f => ({ ...f, tarif_base: e.target.value }))} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('zn_field_km_rate')}</label>
                  <input type="number" className="glass-input" value={form.tarif_km_supplementaire} onChange={e => setForm(f => ({ ...f, tarif_km_supplementaire: e.target.value }))} style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{t('zn_field_color')}</label>
                <input type="color" value={form.couleur} onChange={e => setForm(f => ({ ...f, couleur: e.target.value }))} style={{ height: 36, width: 60 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowForm(false)}>{t('adm_cancel')}</button>
                <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Save size={14} /> {t('adm_save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
