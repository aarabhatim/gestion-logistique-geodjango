import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Package, ChevronRight, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { sendWelcomeEmail } from '../../services/emailService';
import './Auth.css';

const VEHICULE_TYPES = [
  { value: 'MOTO',        label: 'Moto / Scooter',   emoji: '🛵' },
  { value: 'VOITURE',     label: 'Voiture',           emoji: '🚗' },
  { value: 'CAMIONNETTE', label: 'Camionnette / Van', emoji: '🚐' },
  { value: 'CAMION',      label: 'Camion',            emoji: '🚚' },
];

const Register = () => {
  const { register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    username: '', email: '', password: '', first_name: '', last_name: '',
    phone: '', adresse: '',
    // Chauffeur
    vehicule_type: 'VOITURE', plaque: '', permis: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleRoleSelect = (r) => {
    setRole(r);
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        username: form.username,
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        role,                             // 'CLIENT' or 'TRANSPORTEUR'
      };
      if (role === 'TRANSPORTEUR') {
        payload.vehicule_type = form.vehicule_type;
        payload.plaque = form.plaque;
        payload.permis = form.permis;
      }

      const user = await register(payload);
      setSuccess(true);

      // Envoi de l'email de bienvenue (non bloquant)
      sendWelcomeEmail({
        first_name: form.first_name,
        last_name:  form.last_name,
        email:      form.email,
        username:   form.username,
        role:       user.role,
      });

      setTimeout(() => {
        if (user.role === 'CLIENT') navigate('/client');
        else if (user.role === 'TRANSPORTEUR') navigate('/chauffeur');
        else navigate('/');
      }, 1200);
    } catch (err) {
      const errors = err.response?.data;
      if (errors && typeof errors === 'object') {
        const msgs = Object.entries(errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`);
        setError(msgs.join(' · '));
      } else {
        setError(t('reg_error_generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container animate-fade-in" style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2 className="auth-title text-gradient">{t('reg_account_created')}</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{t('reg_redirecting')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container animate-fade-in" style={{ maxWidth: step === 0 ? '680px' : '520px' }}>
        <div className="auth-logo">
          <div className="logo-icon"><Truck size={28} color="white" /></div>
          <h1 className="logo-text text-gradient">DeliverMap</h1>
        </div>

        {/* ── STEP 0: Role selection ────────────────────────────────────── */}
        {step === 0 && (
          <div className="role-selection">
            <h2 className="auth-title">Bienvenue !</h2>
            <p className="auth-subtitle">{t('reg_choose_role')}</p>

            <div className="role-cards">
              <button className="role-card glass-card" onClick={() => handleRoleSelect('CLIENT')}>
                <div className="role-card-icon role-client">
                  <Package size={40} />
                </div>
                <h3>Je suis Client</h3>
                <p>{t('reg_client_desc')}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                  {['🛒 Catalogue', '📍 Suivi live', '⭐ Avis'].map(lbl => (
                    <span key={lbl} style={{ fontSize: 11, background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '2px 8px', borderRadius: 20 }}>{lbl}</span>
                  ))}
                </div>
                <span className="role-cta">Choisir <ChevronRight size={18} /></span>
              </button>

              <button className="role-card glass-card" onClick={() => handleRoleSelect('TRANSPORTEUR')}>
                <div className="role-card-icon role-chauffeur">
                  <Truck size={40} />
                </div>
                <h3>Je suis Chauffeur</h3>
                <p>{t('reg_driver_desc')}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                  {['🚗 Missions', '💰 Revenus', '🗺️ Navigation'].map(lbl => (
                    <span key={lbl} style={{ fontSize: 11, background: 'rgba(59,130,246,0.12)', color: '#60a5fa', padding: '2px 8px', borderRadius: 20 }}>{lbl}</span>
                  ))}
                </div>
                <span className="role-cta">Choisir <ChevronRight size={18} /></span>
              </button>
            </div>

            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: 14 }}>
              Déjà un compte ?{' '}
              <Link to="/login" style={{ color: '#3b82f6', fontWeight: 600 }}>Se connecter</Link>
            </p>
          </div>
        )}

        {/* ── STEP 1: Registration form ─────────────────────────────────── */}
        {step === 1 && (
          <div className="auth-card glass-card">
            <button className="btn-back" onClick={() => { setStep(0); setError(''); }}>← Retour</button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>{role === 'CLIENT' ? '📦' : '🚗'}</div>
              <h2 className="auth-title" style={{ fontSize: '1.4rem' }}>
                {role === 'CLIENT' ? 'Inscription Client' : 'Inscription Chauffeur'}
              </h2>
              <span style={{
                display: 'inline-block', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
                background: role === 'CLIENT' ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)',
                color: role === 'CLIENT' ? '#10b981' : '#60a5fa',
                padding: '3px 12px', borderRadius: 20, marginTop: 4,
              }}>
                {role}
              </span>
            </div>

            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: '1rem', fontSize: 13, color: '#fca5a5' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} aria-label={t('reg_title') || "Formulaire d'inscription"} noValidate>
              {/* Identité */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label htmlFor="reg-firstname" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('reg_firstname')}</label>
                  <input id="reg-firstname" required className="glass-input" value={form.first_name}
                    aria-required="true" aria-label={t('reg_firstname')}
                    onChange={e => set('first_name', e.target.value)} placeholder="Mohamed" />
                </div>
                <div>
                  <label htmlFor="reg-lastname" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('reg_lastname')}</label>
                  <input id="reg-lastname" required className="glass-input" value={form.last_name}
                    aria-required="true" aria-label={t('reg_lastname')}
                    onChange={e => set('last_name', e.target.value)} placeholder="El Alami" />
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label htmlFor="reg-username" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('reg_username')}</label>
                <input id="reg-username" required className="glass-input" value={form.username}
                  aria-required="true" aria-label={t('reg_username')}
                  onChange={e => set('username', e.target.value)} placeholder="mohalami" autoComplete="username" />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label htmlFor="reg-email" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Email *</label>
                <input id="reg-email" required type="email" className="glass-input" value={form.email}
                  aria-required="true" aria-label="Adresse email"
                  onChange={e => set('email', e.target.value)} placeholder="m.alami@gmail.com" autoComplete="email" />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label htmlFor="reg-password" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('reg_password_label')}</label>
                <div style={{ position: 'relative' }}>
                  <input id="reg-password" required type={showPwd ? 'text' : 'password'} className="glass-input"
                    minLength={6} value={form.password}
                    aria-required="true" aria-label={t('reg_password_label')}
                    onChange={e => set('password', e.target.value)}
                    placeholder="••••••••" autoComplete="new-password"
                    style={{ paddingRight: '2.5rem' }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    {showPwd ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label htmlFor="reg-phone" style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('reg_phone_label')}</label>
                <input id="reg-phone" className="glass-input" value={form.phone}
                  aria-label={t('reg_phone_label')}
                  onChange={e => set('phone', e.target.value)} placeholder="+212 6XX XXX XXX" type="tel" />
              </div>

              {/* ── Champs spécifiques transporteur ───────────────────── */}
              {role === 'TRANSPORTEUR' && (
                <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: '0.75rem', letterSpacing: '0.06em' }}>
                    {t('reg_vehicle_info')}
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('reg_vehicle_type')}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {VEHICULE_TYPES.map(({ value, label, emoji }) => (
                        <button key={value} type="button" onClick={() => set('vehicule_type', value)}
                          style={{
                            padding: '8px 10px', borderRadius: 10, border: `2px solid ${form.vehicule_type === value ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                            background: form.vehicule_type === value ? 'rgba(59,130,246,0.15)' : 'transparent',
                            cursor: 'pointer', color: 'white', fontSize: 13, textAlign: 'left',
                            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                          }}>
                          <span>{emoji}</span> {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('reg_plate_label')}</label>
                      <input required={role === 'TRANSPORTEUR'} className="glass-input" value={form.plaque}
                        onChange={e => set('plaque', e.target.value)} placeholder="12345-A-1" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('reg_permit_label')}</label>
                      <input className="glass-input" value={form.permis}
                        onChange={e => set('permis', e.target.value)} placeholder="B-123456" />
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem', fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={12} color="#f59e0b" />
                    {t('reg_account_pending')}
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.875rem', fontSize: 15 }}>
                {loading
                  ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 8 }} />Création...</>
                  : `${t('reg_create_account')} ${role === 'CLIENT' ? '📦' : '🚗'}`
                }
              </button>

              <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: 13 }}>
                Déjà un compte ?{' '}
                <Link to="/login" style={{ color: '#3b82f6', fontWeight: 600 }}>Se connecter</Link>
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
