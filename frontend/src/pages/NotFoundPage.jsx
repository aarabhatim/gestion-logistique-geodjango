import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

export default function NotFoundPage() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { t }     = useI18n();

  const handleHome = () => {
    if (!user) { navigate('/login'); return; }
    if (user.role === 'CLIENT')       navigate('/client');
    else if (user.role === 'TRANSPORTEUR') navigate('/chauffeur');
    else if (user.role === 'FONDATEUR')    navigate('/boutique');
    else navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B0B0B',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#FFFFFF',
      textAlign: 'center',
      padding: '24px',
    }}>
      {/* Big 404 */}
      <div style={{
        fontSize: 'clamp(80px, 20vw, 160px)',
        fontWeight: 900,
        lineHeight: 1,
        background: 'linear-gradient(135deg, #FF8A00, #FF6B00)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: 8,
        userSelect: 'none',
      }}>
        404
      </div>

      {/* Truck SVG illustration */}
      <svg width="120" height="60" viewBox="0 0 120 60" fill="none" style={{ marginBottom: 32, opacity: 0.7 }}>
        <rect x="0" y="20" width="75" height="30" rx="4" fill="#1A1A1A" stroke="#FF8A00" strokeWidth="1.5"/>
        <rect x="75" y="28" width="38" height="22" rx="4" fill="#1A1A1A" stroke="#FF8A00" strokeWidth="1.5"/>
        <rect x="80" y="32" width="18" height="12" rx="2" fill="#FF8A0022"/>
        <circle cx="20" cy="52" r="8" fill="#222" stroke="#FF8A00" strokeWidth="2"/>
        <circle cx="20" cy="52" r="4" fill="#FF8A00"/>
        <circle cx="95" cy="52" r="8" fill="#222" stroke="#FF8A00" strokeWidth="2"/>
        <circle cx="95" cy="52" r="4" fill="#FF8A00"/>
        <line x1="0" y1="36" x2="75" y2="36" stroke="#FF8A0044" strokeWidth="1"/>
        <rect x="6" y="26" width="50" height="8" rx="2" fill="#FF8A0011"/>
        <text x="31" y="33" textAnchor="middle" fill="#FF8A00" fontSize="6" fontWeight="700">PERDU</text>
      </svg>

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: '#FFFFFF' }}>
        {t('not_found_title') || 'Page introuvable'}
      </h1>
      <p style={{ fontSize: 15, color: '#A3A3A3', maxWidth: 420, lineHeight: 1.6, marginBottom: 40 }}>
        {t('not_found_desc') || 'La page que vous cherchez a peut-être été déplacée, supprimée ou n\'existe pas.'}
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '12px 24px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)',
            background: '#1A1A1A',
            color: '#A3A3A3', cursor: 'pointer',
            fontWeight: 600, fontSize: 14,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF8A00'; e.currentTarget.style.color = '#FFFFFF'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#A3A3A3'; }}
        >
          ← {t('not_found_back') || 'Retour'}
        </button>
        <button
          onClick={handleHome}
          style={{
            padding: '12px 28px', borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(90deg, #FF8A00, #FF6B00)',
            color: '#FFFFFF', cursor: 'pointer',
            fontWeight: 700, fontSize: 14,
            boxShadow: '0 4px 16px rgba(255,138,0,0.35)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          🏠 {t('not_found_home') || 'Tableau de bord'}
        </button>
      </div>
    </div>
  );
}
