import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Package, ChevronRight, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const VEHICULE_TYPES = [
  { value: 'MOTO',        label: 'Moto / Scooter',   emoji: '🛵' },
  { value: 'VOITURE',     label: 'Voiture',           emoji: '🚗' },
  { value: 'CAMIONNETTE', label: 'Camionnette / Van', emoji: '🚐' },
  { value: 'CAMION',      label: 'Camion',            emoji: '🚚' },
];

const Register = () => {
  const { register } = useAuth();
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
        setError("Erreur lors de l'inscription. Vérifiez vos informations.");
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
          <h2 className="auth-title text-gradient">Compte créé !</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Redirection en cours...</p>
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
            <p className="auth-subtitle">Choisissez votre profil pour créer votre compte</p>

            <div className="role-cards">
              <button className="role-card glass-card" onClick={() => handleRoleSelect('CLIENT')}>
                <div className="role-card-icon role-client">
                  <Package size={40} />
                </div>
                <h3>Je suis Client</h3>
                <p>Je commande des produits et suis mes livraisons en temps réel.</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                  {['🛒 Catalogue', '📍 Suivi live', '⭐ Avis'].map(t => (
                    <span key={t} style={{ fontSize: 11, background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '2px 8px', borderRadius: 20 }}>{t}</span>
                  ))}
                </div>
                <span className="role-cta">Choisir <ChevronRight size={18} /></span>
              </button>

              <button className="role-card glass-card" onClick={() => handleRoleSelect('TRANSPORTEUR')}>
                <div className="role-card-icon role-chauffeur">
                  <Truck size={40} />
                </div>
                <h3>Je suis Chauffeur</h3>
                <p>Je gère mes missions de livraison et partage ma position en direct.</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                  {['🚗 Missions', '💰 Revenus', '🗺️ Navigation'].map(t => (
                    <span key={t} style={{ fontSize: 11, background: 'rgba(59,130,246,0.12)', color: '#60a5fa', padding: '2px 8px', borderRadius: 20 }}>{t}</span>
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

            <form onSubmit={handleSubmit}>
              {/* Identité */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Prénom *</label>
                  <input required className="glass-input" value={form.first_name}
                    onChange={e => set('first_name', e.target.value)} placeholder="Mohamed" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Nom *</label>
                  <input required className="glass-input" value={form.last_name}
                    onChange={e => set('last_name', e.target.value)} placeholder="El Alami" />
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Nom d'utilisateur *</label>
                <input required className="glass-input" value={form.username}
                  onChange={e => set('username', e.target.value)} placeholder="mohalami" autoComplete="username" />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Email *</label>
                <input required type="email" className="glass-input" value={form.email}
                  onChange={e => set('email', e.target.value)} placeholder="m.alami@gmail.com" autoComplete="email" />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Mot de passe * (min. 6 caractères)</label>
                <div style={{ position: 'relative' }}>
                  <input required type={showPwd ? 'text' : 'password'} className="glass-input"
                    minLength={6} value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="••••••••" autoComplete="new-password"
                    style={{ paddingRight: '2.5rem' }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Téléphone</label>
                <input className="glass-input" value={form.phone}
                  onChange={e => set('phone', e.target.value)} placeholder="+212 6XX XXX XXX" type="tel" />
              </div>

              {/* ── Champs spécifiques transporteur ───────────────────── */}
              {role === 'TRANSPORTEUR' && (
                <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: '0.75rem', letterSpacing: '0.06em' }}>
                    🚗 INFORMATIONS VÉHICULE
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Type de véhicule *</label>
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
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Plaque d'immatriculation *</label>
                      <input required={role === 'TRANSPORTEUR'} className="glass-input" value={form.plaque}
                        onChange={e => set('plaque', e.target.value)} placeholder="12345-A-1" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>N° permis (optionnel)</label>
                      <input className="glass-input" value={form.permis}
                        onChange={e => set('permis', e.target.value)} placeholder="B-123456" />
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem', fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={12} color="#f59e0b" />
                    Votre compte sera vérifié par l'admin avant activation
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.875rem', fontSize: 15 }}>
                {loading
                  ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 8 }} />Création...</>
                  : `Créer mon compte ${role === 'CLIENT' ? '📦' : '🚗'}`
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
