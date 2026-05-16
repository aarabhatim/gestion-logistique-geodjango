import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.username, form.password);
      // Redirect based on role (backend roles are uppercase)
      if (user.role === 'ADMIN') navigate('/');
      else if (user.role === 'CLIENT') navigate('/client');
      else if (user.role === 'TRANSPORTEUR') navigate('/chauffeur');
      else if (user.role === 'FONDATEUR') navigate('/store');
      else navigate('/'); // Fallback
    } catch (err) {
      setError(err.response?.data?.non_field_errors?.[0] || 'Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container animate-fade-in">
        <div className="auth-logo">
          <div className="logo-icon"><Truck size={28} color="white" /></div>
          <h1 className="logo-text text-gradient">LogisTrack</h1>
        </div>

        <div className="auth-card glass-card">
          <h2 className="auth-title">Connexion</h2>
          <p className="auth-subtitle">Accédez à votre espace logistique</p>

          {error && (
            <div className="auth-error">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label><User size={14} /> Nom d'utilisateur</label>
              <input
                type="text"
                className="glass-input"
                placeholder="votre_username"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label><Lock size={14} /> Mot de passe</label>
              <input
                type="password"
                className="glass-input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="auth-footer">
            Pas encore de compte ?{' '}
            <Link to="/register" className="auth-link">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
