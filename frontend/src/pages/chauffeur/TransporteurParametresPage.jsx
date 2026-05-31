/**
 * TransporteurParametresPage — Paramètres du compte chauffeur
 * Layout plein écran : nav gauche + contenu droit
 */
import { useState, useEffect } from 'react';
import {
  User, Lock, Info, Save, Eye, EyeOff,
  CheckCircle, AlertCircle, Loader, ToggleLeft, ToggleRight,
  Phone, Mail, Truck, Shield, ChevronRight,
} from 'lucide-react';
import { transporteursApi, authApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';

const T = {
  bg: '#0B0B0B', surface: '#111111', card: '#161616', card2: '#1C1C1C',
  primary: '#FF8A00', primary2: '#FF6B00',
  text: '#FFFFFF', text2: '#888888', border: 'rgba(255,255,255,0.06)',
  danger: '#EF4444', success: '#22C55E', warning: '#F59E0B',
};
const grad = `linear-gradient(135deg, ${T.primary}, ${T.primary2})`;

const SECTIONS = [
  { id: 'profil',        labelKey: 'tp_sec_profil',    icon: User,   descKey: 'tp_sec_profil_desc' },
  { id: 'disponibilite', labelKey: 'tp_sec_dispo',     icon: Truck,  descKey: 'tp_sec_dispo_desc' },
  { id: 'securite',      labelKey: 'tp_sec_security',  icon: Lock,   descKey: 'tp_sec_sec_desc' },
  { id: 'apropos',       labelKey: 'tp_sec_about',     icon: Info,   descKey: 'tp_sec_about_desc' },
];

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 12,
  background: '#111111', border: '1px solid rgba(255,255,255,0.06)',
  color: '#FFFFFF', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 0.2s',
};

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 7 }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '24px 0' }} />;
}

function Toast({ msg, type }) {
  const bg = type === 'success' ? '#15803d' : '#b91c1c';
  return (
    <div style={{
      position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '14px 22px', borderRadius: 16, background: bg,
      color: 'white', fontWeight: 600, fontSize: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
    </div>
  );
}

function SaveBtn({ onClick, loading, label }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '12px 28px', borderRadius: 12, border: 'none',
      background: loading ? 'rgba(255,138,0,0.35)' : grad,
      color: 'white', fontWeight: 700, fontSize: 14,
      cursor: loading ? 'not-allowed' : 'pointer',
      boxShadow: loading ? 'none' : '0 4px 18px rgba(255,138,0,0.3)',
    }}>
      {loading
        ? <Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
        : <Save size={15} />}
      {label || t('tp_save')}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </button>
  );
}

function PwField({ label, fieldKey, value, onChange, show, onToggle }) {
  return (
    <Field label={label} required>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          style={{ ...inputStyle, paddingRight: 44 }}
          onFocus={e => { e.target.style.borderColor = '#FF8A00'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          placeholder="••••••••"
        />
        <button
          onClick={onToggle}
          style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 2 }}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </Field>
  );
}

export default function TransporteurParametresPage() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('profil');
  const [profile, setProfile]   = useState(null);
  const [loadingP, setLoadingP] = useState(true);
  const [toast, setToast]       = useState(null);

  const [profil, setProfil]         = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [savingProfil, setSavingProfil] = useState(false);
  const [disponible, setDisponible]     = useState(false);
  const [togglingDispo, setTogglingDispo] = useState(false);

  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew1, setPwNew1]       = useState('');
  const [pwNew2, setPwNew2]       = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew1, setShowNew1]       = useState(false);
  const [showNew2, setShowNew2]       = useState(false);
  const [savingPw, setSavingPw]       = useState(false);

  const showToast = (msg, type) => {
    setToast({ msg, type: type || 'success' });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setLoadingP(true);
    transporteursApi.monProfil()
      .then(r => {
        setProfile(r.data);
        setDisponible(r.data.is_available || r.data.disponible || false);
        setProfil({
          first_name: r.data.first_name || user?.first_name || '',
          last_name:  r.data.last_name  || user?.last_name  || '',
          email:      r.data.email      || user?.email      || '',
          phone:      r.data.phone      || r.data.telephone || '',
        });
      })
      .catch(() => {
        setProfil({ first_name: user?.first_name || '', last_name: user?.last_name || '', email: user?.email || '', phone: '' });
      })
      .finally(() => setLoadingP(false));
  }, [user]);

  const handleSaveProfil = async () => {
    setSavingProfil(true);
    try {
      await authApi.updateProfile({ first_name: profil.first_name, last_name: profil.last_name, email: profil.email, phone: profil.phone });
      showToast(t('tp_profil_updated'));
    } catch (e) {
      showToast(e.response?.data?.detail || t('state_error'), 'error');
    } finally { setSavingProfil(false); }
  };

  const handleToggleDispo = async () => {
    setTogglingDispo(true);
    try {
      const r = await transporteursApi.toggleDisponibilite();
      const nx = r.data?.is_available || r.data?.disponible || !disponible;
      setDisponible(nx);
      showToast(nx ? t('tp_online_msg') : t('tp_offline_msg'));
    } catch {
      showToast(t('tp_status_err'), 'error');
    } finally { setTogglingDispo(false); }
  };

  const handleChangePw = async () => {
    if (!pwCurrent || !pwNew1 || !pwNew2) return showToast(t('tp_fill_all'), 'error');
    if (pwNew1 !== pwNew2) return showToast(t('tp_pw_mismatch'), 'error');
    if (pwNew1.length < 8) return showToast(t('tp_pw_min'), 'error');
    setSavingPw(true);
    try {
      await authApi.changePassword({ old_password: pwCurrent, new_password: pwNew1 });
      setPwCurrent(''); setPwNew1(''); setPwNew2('');
      showToast(t('tp_pw_changed'));
    } catch (e) {
      showToast(e.response?.data?.old_password?.[0] || e.response?.data?.detail || 'Erreur', 'error');
    } finally { setSavingPw(false); }
  };

  const renderContent = () => {

    /* ── PROFIL ── */
    if (activeSection === 'profil') {
      return (
        <div>
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>{t('tp_profil_title')}</h3>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#888' }}>{t('tp_profil_sub')}</p>
          </div>

          {loadingP ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <Loader size={28} color="#FF8A00" style={{ animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, padding: '20px 24px', background: '#1C1C1C', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 68, height: 68, borderRadius: '50%', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: 'white', flexShrink: 0, boxShadow: '0 4px 16px rgba(255,138,0,0.3)' }}>
                  {(profil.first_name[0] || '').toUpperCase()}{(profil.last_name[0] || '').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{profil.first_name} {profil.last_name}</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 3 }}>{profil.email}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,138,0,0.12)', color: '#FF8A00', fontSize: 11, fontWeight: 700 }}>
                    Transporteur
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <Field label={t('tp_firstname')} required>
                  <input style={inputStyle} value={profil.first_name}
                    onChange={e => setProfil(p => ({ ...p, first_name: e.target.value }))}
                    onFocus={e => { e.target.style.borderColor = '#FF8A00'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    placeholder={t('tp_firstname')} />
                </Field>
                <Field label={t('tp_lastname')} required>
                  <input style={inputStyle} value={profil.last_name}
                    onChange={e => setProfil(p => ({ ...p, last_name: e.target.value }))}
                    onFocus={e => { e.target.style.borderColor = '#FF8A00'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    placeholder={t('tp_lastname')} />
                </Field>
              </div>

              <Field label={t('tp_email')} required>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#888', pointerEvents: 'none' }} />
                  <input style={{ ...inputStyle, paddingLeft: 38 }} value={profil.email} type="email"
                    onChange={e => setProfil(p => ({ ...p, email: e.target.value }))}
                    onFocus={e => { e.target.style.borderColor = '#FF8A00'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    placeholder={t('tp_email')} />
                </div>
              </Field>

              <Field label={t('tp_phone')}>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#888', pointerEvents: 'none' }} />
                  <input style={{ ...inputStyle, paddingLeft: 38 }} value={profil.phone}
                    onChange={e => setProfil(p => ({ ...p, phone: e.target.value }))}
                    onFocus={e => { e.target.style.borderColor = '#FF8A00'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    placeholder={t('tp_phone')} />
                </div>
              </Field>

              {profile && (
                <div>
                  <Divider />
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#888', letterSpacing: '0.06em', marginBottom: 14 }}>{t('tp_vehicle_lbl')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ padding: '12px 16px', borderRadius: 12, background: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 5 }}>{t('tp_type_lbl')}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{profile.vehicule_type || profile.type_vehicule || '-'}</div>
                    </div>
                    <div style={{ padding: '12px 16px', borderRadius: 12, background: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 5 }}>{t('tp_plate_lbl')}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{profile.plaque || profile.plaque_immatriculation || '-'}</div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 28 }}>
                <SaveBtn onClick={handleSaveProfil} loading={savingProfil} />
              </div>
            </div>
          )}
        </div>
      );
    }

    /* ── DISPONIBILITÉ ── */
    if (activeSection === 'disponibilite') {
      return (
        <div>
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>{t('tp_dispo_title')}</h3>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#888' }}>{t('tp_dispo_sub')}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', borderRadius: 20, background: disponible ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.05)', border: disponible ? '2px solid rgba(34,197,94,0.25)' : '2px solid rgba(239,68,68,0.2)', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
                {disponible ? t('tp_online') : t('tr_offline')}
              </div>
              <div style={{ fontSize: 14, color: '#888' }}>
                {disponible ? t('tp_receiving') : t('tp_not_receiving')}
              </div>
            </div>
            <button onClick={handleToggleDispo} disabled={togglingDispo}
              style={{ background: 'none', border: 'none', cursor: togglingDispo ? 'not-allowed' : 'pointer', padding: 0, opacity: togglingDispo ? 0.5 : 1, flexShrink: 0 }}>
              {togglingDispo
                ? <Loader size={44} color="#FF8A00" style={{ animation: 'spin 0.8s linear infinite' }} />
                : disponible
                  ? <ToggleRight size={56} color="#22C55E" />
                  : <ToggleLeft  size={56} color="#888" />}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { icon: '📦', titleKey: 'tp_missions_card', descKey: 'tp_missions_desc', color: '#FF8A00' },
              { icon: '💰', titleKey: 'tp_revenues_card',  descKey: 'tp_revenues_desc', color: '#22C55E' },
              { icon: '⭐', titleKey: 'tp_score_card',    descKey: 'tp_score_desc', color: '#60a5fa' },
              { icon: '⏱️', titleKey: 'tp_reactivity', descKey: 'tp_reactivity_desc', color: '#F59E0B' },
            ].map(item => (
              <div key={item.title} style={{ padding: '20px', borderRadius: 16, background: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 5 }}>{t(item.titleKey)}</div>
                <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{t(item.descKey)}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    /* ── SÉCURITÉ ── */
    if (activeSection === 'securite') {
      return (
        <div>
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>{t('tp_security_title')}</h3>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#888' }}>{t('tp_security_sub')}</p>
          </div>

          <div style={{ maxWidth: 480 }}>
            <PwField label={t('tp_current_pw')} fieldKey="current"
              value={pwCurrent} onChange={e => setPwCurrent(e.target.value)}
              show={showCurrent} onToggle={() => setShowCurrent(s => !s)} />
            <PwField label={t('tp_new_pw')} fieldKey="new1"
              value={pwNew1} onChange={e => setPwNew1(e.target.value)}
              show={showNew1} onToggle={() => setShowNew1(s => !s)} />
            <PwField label={t('tp_confirm_pw')} fieldKey="new2"
              value={pwNew2} onChange={e => setPwNew2(e.target.value)}
              show={showNew2} onToggle={() => setShowNew2(s => !s)} />

            <div style={{ padding: '14px 18px', borderRadius: 12, background: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 28, fontSize: 13, color: '#888', lineHeight: 1.8 }}>
              Règles : minimum 8 caractères, une majuscule, un chiffre.
            </div>

            <SaveBtn onClick={handleChangePw} loading={savingPw} label={t('tp_change_pw_btn')} />
          </div>
        </div>
      );
    }

    /* ── À PROPOS ── */
    if (activeSection === 'apropos') {
      return (
        <div>
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>{t('tp_about_title')}</h3>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#888' }}>{t('tp_about_sub')}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32, maxWidth: 520 }}>
            {[
              { label: t('tp_about_app'), value: 'DeliverMap — Transporteur' },
              { label: t('tp_about_version'), value: '1.0.0' },
              { label: t('tp_about_role'), value: t('tp_driver_role') },
              { label: t('tp_about_user_id'), value: '#' + (user?.id || '-') },
              { label: t('tp_about_username'), value: user?.username || '-' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: 12, background: '#1C1C1C', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 14, color: '#888' }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{row.value}</span>
              </div>
            ))}
          </div>

          <Divider />

          <div style={{ maxWidth: 520 }}>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
              En vous déconnectant vous serez redirigé vers la page de connexion.
            </p>
            <button onClick={() => logout()} style={{
              width: '100%', padding: '14px', borderRadius: 14,
              border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)',
              color: '#EF4444', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <Shield size={16} /> Se déconnecter
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100%', background: '#0B0B0B' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Left nav ── */}
      <aside style={{ width: 260, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '8px 12px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: '0.08em', padding: '8px 12px 12px' }}>
          PARAMÈTRES
        </div>
        {SECTIONS.map(sec => {
          const active = activeSection === sec.id;
          const Icon = sec.icon;
          return (
            <button key={sec.id} onClick={() => setActiveSection(sec.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 12, border: 'none',
              background: active ? 'rgba(255,138,0,0.1)' : 'transparent',
              cursor: 'pointer', marginBottom: 2, textAlign: 'left',
              transition: 'background 0.15s',
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: active ? 'rgba(255,138,0,0.15)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={active ? '#FF8A00' : '#888'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#FF8A00' : '#fff' }}>{t(sec.labelKey)}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{t(sec.descKey)}</div>
              </div>
              {active && <ChevronRight size={14} color="#FF8A00" />}
            </button>
          );
        })}
      </aside>

      {/* ── Content ── */}
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        {renderContent()}
      </main>
    </div>
  );
}
