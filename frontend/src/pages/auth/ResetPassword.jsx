import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Truck, Eye, EyeOff, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import './Auth.css';

const ResetPassword = () => {
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const token                   = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');

  // Rediriger si pas de token
  useEffect(() => {
    if (!token) navigate('/forgot-password', { replace: true });
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}auth/password-reset/confirm/`, {
        token,
        new_password: password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const msg = err.response?.data?.error;
      setError(msg || 'Lien invalide ou expiré. Demandez un nouveau lien.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container animate-fade-in" style={{ maxWidth: 460, textAlign: 'center' }}>
          <CheckCircle size={64} color="#10b981" style={{ marginBottom: 16 }} />
          <h2 className="auth-title">Mot de passe modifié !</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            Votre mot de passe a été réinitialisé avec succès.<br />
            Redirection vers la connexion…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container animate-fade-in" style={{ maxWidth: 460 }}>

        {/* Logo */}
        <div className="auth-logo">
          <div className="logo-icon"><Truck size={28} color="white" /></div>
          <h1 className="logo-text text-gradient">DeliverMap</h1>
        </div>

        <div className="auth-card glass-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
            <h2 className="auth-title" style={{ fontSize: '1.4rem' }}>Nouveau mot de passe</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6 }}>
              Choisissez un mot de passe sécurisé d'au moins 6 caractères.
            </p>
          </div>

          {error && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: '1rem', fontSize: 13, color: '#fca5a5' }}>
              <XCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Nouveau mot de passe */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Nouveau mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  required
                  type={showPwd ? 'text' : 'password'}
                  className="glass-input"
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingRight: '2.5rem' }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirmation */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Confirmer le mot de passe
              </label>
              <input
                required
                type={showPwd ? 'text' : 'password'}
                className="glass-input"
                minLength={6}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {confirm && password !== confirm && (
                <p style={{ color: '#fca5a5', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={12} /> Les mots de passe ne correspondent pas
                </p>
              )}
              {confirm && password === confirm && confirm.length >= 6 && (
                <p style={{ color: '#10b981', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={12} /> Mots de passe identiques
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || password !== confirm}
              style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: 15 }}
            >
              {loading
                ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 8 }} />Réinitialisation...</>
                : 'Réinitialiser mon mot de passe'
              }
            </button>

            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: 13, color: 'var(--text-secondary)' }}>
              <Link to="/forgot-password" style={{ color: '#3b82f6', fontWeight: 600 }}>
                Demander un nouveau lien
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
