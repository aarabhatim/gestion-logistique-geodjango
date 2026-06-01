import React, { useState, useEffect } from 'react';
import { AlertTriangle, Camera, MapPin, Send, X, ChevronLeft, CheckCircle } from 'lucide-react';
import { incidentsApi, commandesApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';

const TYPES_INCIDENT = [
  { value: 'accident',          labelKey: 'inc_type_ACCIDENT',      emoji: '🚨', descKey: 'inc_type_ACCIDENT_desc' },
  { value: 'panne',             labelKey: 'inc_type_PANNE',         emoji: '🔧', descKey: 'inc_type_PANNE_desc' },
  { value: 'vol',               labelKey: 'inc_type_VOL',           emoji: '🔓', descKey: 'inc_type_VOL_desc' },
  { value: 'colis_endommage',   labelKey: 'inc_type_COLIS_ENDOMMAGE', emoji: '📦', descKey: 'inc_type_COLIS_ENDOMMAGE_desc' },
  { value: 'retard',            labelKey: 'inc_type_RETARD',        emoji: '⏱', descKey: 'inc_type_RETARD_desc' },
  { value: 'client_absent',     labelKey: 'inc_type_CLIENT_ABSENT', emoji: '🚪', descKey: 'inc_type_CLIENT_ABSENT_desc' },
  { value: 'adresse_introuvable', labelKey: 'inc_type_ADRESSE_INTRO', emoji: '🗺', descKey: 'inc_type_ADRESSE_INTRO_desc' },
  { value: 'autre',             labelKey: 'inc_type_AUTRE',         emoji: '❓', descKey: 'inc_type_AUTRE_desc' },
];

const StepBadge = ({ n, active }) => (
  <div style={{
    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.1)',
    fontSize: 12, fontWeight: 700, color: active ? '#fff' : 'var(--text-secondary)',
  }}>{n}</div>
);

export const SignalerIncidentPanel = ({
  commandes: commandesProp = null,
  embedded = false,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [type, setType] = useState('');
  const [commandes, setCommandes] = useState(commandesProp || []);
  const [commandeIds, setCommandeIds] = useState([]);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [position, setPosition] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (commandesProp) {
      setCommandes(commandesProp);
      return;
    }
    commandesApi.list().then(r => {
      const items = r.data.results || r.data;
      const all = Array.isArray(items) ? items : [];
      setCommandes(all.filter(c => ['EN_PREPARATION', 'EN_ROUTE'].includes(c.statut)));
    }).catch(() => setCommandes([]));
  }, [commandesProp]);

  const toggleCommande = (id) => {
    setCommandeIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const getGPS = () => {
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => { setGpsError(t('si_gps_error')); setGpsLoading(false); },
      { timeout: 10000 },
    );
  };

  useEffect(() => {
    getGPS();
  }, []);

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files).slice(0, 4);
    setPhotos(files);
    setPhotoPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const removePhoto = (idx) => {
    setPhotos(p => p.filter((_, i) => i !== idx));
    setPhotoPreviews(p => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (commandeIds.length === 0) { setError(t('si_order_required')); return; }
    if (!description.trim()) { setError(t('si_desc_required')); return; }
    setSubmitting(true);
    setError('');
    try {
      for (const commandeId of commandeIds) {
        const formData = new FormData();
        formData.append('commande', commandeId);
        formData.append('type_incident', type);
        formData.append('description', description);
        if (position) {
          formData.append('latitude', position.lat);
          formData.append('longitude', position.lon);
        }
        const incRes = await incidentsApi.signaler(formData);
        for (const photo of photos) {
          const pd = new FormData();
          pd.append('image', photo);
          await incidentsApi.ajouterPhoto(incRes.data.id, pd).catch(() => {});
        }
      }
      setStep(3);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.detail || t('state_error'));
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabel = TYPES_INCIDENT.find(t => t.value === type);

  let body;
  if (step === 3) {
    body = (
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <CheckCircle size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
        <h3 style={{ marginBottom: '0.5rem' }}>{t('si_success_title')}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: 14 }}>
          {t('si_success_msg')}
        </p>
        <button type="button" onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>{t('action_close_lbl')}</button>
      </div>
    );
  } else {
    body = (
      <>
        {embedded && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
              <AlertTriangle size={18} color="#ef4444" /> Signaler un incident
            </h3>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={20} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', marginBottom: '1.25rem', alignItems: 'center' }}>
          <StepBadge n={1} active={step >= 1} />
          <span style={{ fontSize: 13, marginLeft: 8, marginRight: 12 }}>{t('si_step_type')}</span>
          <div style={{ flex: 1, height: 2, background: step > 1 ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)' }} />
          <StepBadge n={2} active={step >= 2} />
          <span style={{ fontSize: 13, marginLeft: 8 }}>{t('si_step_details')}</span>
        </div>

        {step === 1 && (
          <>
            <h4 style={{ marginBottom: '1rem', fontSize: 14 }}>{t('si_type_question')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {TYPES_INCIDENT.map(tp => (
                <div key={tp.value} onClick={() => setType(tp.value)} role="button" tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setType(tp.value)}
                  style={{
                    padding: '1rem', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${type === tp.value ? 'var(--accent-color)' : 'rgba(255,255,255,0.08)'}`,
                    background: type === tp.value ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{tp.emoji}</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t(tp.labelKey)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}></div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setStep(2)} disabled={!type} className="btn btn-primary" style={{ marginTop: '1.5rem', width: '100%' }}>
              Continuer
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" style={{ marginBottom: '1rem', fontSize: 12 }}>
              <ChevronLeft size={14} /> {t('si_change_type')}
            </button>
            <h4 style={{ marginBottom: '1rem', fontSize: 14 }}>{typeLabel?.emoji} {typeLabel ? t(typeLabel.labelKey) : ''}</h4>

            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{t('si_orders_with')}</p>
            {commandes.length === 0 ? (
              <p style={{ fontSize: 12, color: '#f59e0b', marginBottom: '1rem' }}>{t('si_no_mission')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem' }}>
                {commandes.map(c => (
                  <label key={c.id} style={{
                    display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${commandeIds.includes(c.id) ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'}`,
                    background: commandeIds.includes(c.id) ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                  }}>
                    <input type="checkbox" checked={commandeIds.includes(c.id)} onChange={() => toggleCommande(c.id)} />
                    <div>
                      <strong style={{ fontSize: 13 }}>#{c.reference || c.id}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {c.fondateur_detail?.nom_boutique || 'Boutique'} — {c.adresse_livraison || 'Livraison'}
                      </div>
                      <div style={{ fontSize: 11, color: '#10b981' }}>{c.statut}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <textarea className="glass-input" value={description} onChange={e => setDescription(e.target.value)}
              placeholder={t('si_desc_ph')}
              style={{ width: '100%', minHeight: 90, marginBottom: '1rem', fontSize: 13 }} />

            {position ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', fontSize: 12 }}>
                <MapPin size={14} color="#10b981" />
                <span>{position.lat.toFixed(5)}, {position.lon.toFixed(5)}</span>
                <button type="button" onClick={() => setPosition(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}><X size={12} /></button>
              </div>
            ) : (
              <button type="button" onClick={getGPS} className="btn btn-secondary" disabled={gpsLoading} style={{ marginBottom: '1rem', fontSize: 12 }}>
                <MapPin size={14} /> {gpsLoading ? 'Localisation...' : 'Position GPS'}
              </button>
            )}
            {gpsError && <p style={{ fontSize: 11, color: '#f59e0b', marginTop: -8, marginBottom: '1rem' }}>{gpsError}</p>}

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, marginBottom: '1rem' }}>
              <Camera size={14} /> Photos
              <input type="file" accept="image/*" multiple onChange={handlePhotos} style={{ display: 'none' }} />
            </label>
            {photoPreviews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
                {photoPreviews.map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={src} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                    <button type="button" onClick={() => removePhoto(i)} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer' }}>
                      <X size={10} color="white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && <p style={{ color: '#fca5a5', fontSize: 12, marginBottom: '1rem' }}>{error}</p>}

            <button type="button" onClick={handleSubmit} disabled={submitting} className="btn btn-primary" style={{ width: '100%' }}>
              <Send size={15} /> {submitting ? 'Envoi...' : 'Envoyer'}
            </button>
          </>
        )}
      </>
    );
  }

  if (embedded) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        onClick={onClose} role="presentation">
        <div className="glass-card animate-fade-in" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}
          onClick={e => e.stopPropagation()}>
          {body}
        </div>
      </div>
    );
  }

  return <div className="glass-card animate-fade-in" style={{ padding: '1.5rem' }}>{body}</div>;
};

const SignalerIncident = () => {
  const navigate = useNavigate();
  return (
    <div className="dashboard-container">
      <div className="dashboard-header animate-fade-in">
        <button type="button" onClick={() => navigate('/chauffeur')} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
          <ChevronLeft size={16} /> Retour
        </button>
        <h2 className="page-title text-gradient"><AlertTriangle size={24} /> Signaler un Incident</h2>
      </div>
      <SignalerIncidentPanel embedded={false} onClose={() => navigate('/chauffeur')} />
    </div>
  );
};

export default SignalerIncident;
