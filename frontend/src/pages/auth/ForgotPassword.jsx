import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}auth/password-reset/`, { email });
      setSent(true);
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-container animate-fade-in" style={{ maxWidth: 460, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📧</div>
          <CheckCircle size={48} color="#10b981" style={{ marginBottom: 16 }} />
          <h2 className="auth-title">Email envoyé !</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
            Si l'adresse <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> est
            associée à un compte, vous recevrez un lien de réinitialisation dans quelques minutes.
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 12 }}>
            Pensez à vérifier vos spams.
          </p>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 24, color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Retour à la connexion
          </Link>
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
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20, textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Retour à la connexion
          </Link>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
            <h2 className="auth-title" style={{ fontSize: '1.4rem' }}>Mot de passe oublié</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6 }}>
              Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
          </div>

          {error && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: '1rem', fontSize: 13, color: '#fca5a5' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Adresse email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  required
                  type="email"
                  className="glass-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  style={{ paddingLeft: '2.25rem' }}
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: 15 }}
            >
              {loading
                ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 8 }} />Envoi...</>
                : 'Envoyer le lien de réinitialisation'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
