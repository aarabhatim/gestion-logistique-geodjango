import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Package, ChevronRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const STEPS = ['role', 'details'];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    username: '', email: '', password: '', first_name: '', last_name: '',
    telephone: '', entreprise: '', adresse: '', permis: '', date_naissance: '',
  });

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, role };
      // Map 'telephone' to 'phone' if needed for backend
      if (payload.telephone) {
        payload.phone = payload.telephone;
        delete payload.telephone;
      }
      if (!payload.date_naissance) {
        payload.date_naissance = null;
      }
      const user = await register(payload);
      if (user.role === 'CLIENT') navigate('/client');
      else if (user.role === 'TRANSPORTEUR') navigate('/chauffeur');
      else if (user.role === 'FONDATEUR') navigate('/store');
    } catch (err) {
      const errors = err.response?.data;
      if (errors) {
        const firstError = Object.values(errors)[0];
        setError(Array.isArray(firstError) ? firstError[0] : firstError);
      } else {
        setError("Erreur lors de l'inscription.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container animate-fade-in" style={{ maxWidth: step === 0 ? '640px' : '500px' }}>
        <div className="auth-logo">
          <div className="logo-icon"><Truck size={28} color="white" /></div>
          <h1 className="logo-text text-gradient">LogisTrack</h1>
        </div>

        {/* ÉTAPE 1 : Choix du rôle */}
        {step === 0 && (
          <div className="role-selection">
            <h2 className="auth-title">Bienvenue !</h2>
            <p className="auth-subtitle">Choisissez votre profil pour commencer</p>
            <div className="role-cards">

              <button className="role-card glass-card" onClick={() => handleRoleSelect('CLIENT')}>
                <div className="role-card-icon role-client">
                  <Package size={40} />
                </div>
                <h3>Je suis Client</h3>
                <p>Je veux expédier des marchandises et suivre mes commandes en temps réel.</p>
                <span className="role-cta">Choisir <ChevronRight size={18} /></span>
              </button>

              <button className="role-card glass-card" onClick={() => handleRoleSelect('TRANSPORTEUR')}>
                <div className="role-card-icon role-chauffeur">
                  <Truck size={40} />
                </div>
                <h3>Je suis Chauffeur</h3>
                <p>Je veux gérer mes missions de livraison et partager ma position en temps réel.</p>
                <span className="role-cta">Choisir <ChevronRight size={18} /></span>
              </button>

              <button className="role-card glass-card" onClick={() => handleRoleSelect('FONDATEUR')}>
                <div className="role-card-icon role-fondateur" style={{ background: 'var(--success-color)' }}>
                  <Package size={40} />
                </div>
                <h3>Je suis une Boutique</h3>
                <p>Je veux vendre mes produits et gérer mes livraisons locales.</p>
                <span className="role-cta">Choisir <ChevronRight size={18} /></span>
              </button>

            </div>
            <p className="auth-footer" style={{ textAlign: 'center', marginTop: '2rem' }}>
              Déjà un compte ? <Link to="/login" className="auth-link">Se connecter</Link>
            </p>
          </div>
        )}

        {/* ÉTAPE 2 : Formulaire d'inscription */}
        {step === 1 && (
          <div className="auth-card glass-card">
            <button className="btn-back" onClick={() => setStep(0)}>← Retour</button>
            <h2 className="auth-title">
              {role === 'CLIENT' ? '📦 Inscription Client' : role === 'TRANSPORTEUR' ? '🚛 Inscription Chauffeur' : '🏪 Inscription Boutique'}
            </h2>

            {error && <div className="auth-error"><AlertCircle size={16} /> {error}</div>}

            <form onSubmit={handleSubmit} className="auth-form form-grid">
              <div className="form-group">
                <label>Prénom</label>
                <input required type="text" className="glass-input" value={form.first_name}
                  onChange={e => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Nom</label>
                <input required type="text" className="glass-input" value={form.last_name}
                  onChange={e => setForm({ ...form, last_name: e.target.value })} />
              </div>
              <div className="form-group full-width">
                <label>Nom d'utilisateur</label>
                <input required type="text" className="glass-input" value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })} />
              </div>
              <div className="form-group full-width">
                <label>Email</label>
                <input required type="email" className="glass-input" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group full-width">
                <label>Mot de passe</label>
                <input required type="password" className="glass-input" minLength={6} value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="form-group full-width">
                <label>Téléphone</label>
                <input type="text" className="glass-input" value={form.telephone}
                  onChange={e => setForm({ ...form, telephone: e.target.value })} />
              </div>

              {/* Champs spécifiques au rôle */}
              {role === 'CLIENT' && (
                <>
                  <div className="form-group full-width">
                    <label>Entreprise (optionnel)</label>
                    <input type="text" className="glass-input" value={form.entreprise}
                      onChange={e => setForm({ ...form, entreprise: e.target.value })} />
                  </div>
                  <div className="form-group full-width">
                    <label>Adresse</label>
                    <input type="text" className="glass-input" value={form.adresse}
                      onChange={e => setForm({ ...form, adresse: e.target.value })} />
                  </div>
                </>
              )}
              {role === 'TRANSPORTEUR' && (
                <>
                  <div className="form-group">
                    <label>Numéro de permis</label>
                    <input type="text" className="glass-input" value={form.permis}
                      onChange={e => setForm({ ...form, permis: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Date de naissance</label>
                    <input type="date" className="glass-input" value={form.date_naissance}
                      onChange={e => setForm({ ...form, date_naissance: e.target.value })} />
                  </div>
                </>
              )}
              {role === 'FONDATEUR' && (
                <div className="form-group full-width">
                  <label>Nom de la boutique</label>
                  <input required type="text" className="glass-input" value={form.entreprise}
                    onChange={e => setForm({ ...form, entreprise: e.target.value })} />
                </div>
              )}

              <div className="form-actions full-width">
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Création en cours...' : "Créer mon compte"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
