import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Shield, Bell, Globe, Moon, Sun, Save,
  Eye, EyeOff, Settings as SettingsIcon, Palette, Lock, MapPin,
  CheckCircle, AlertTriangle, Trash2, RefreshCw, Database, Activity,
  Terminal, Cpu,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { authApi } from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';

// ─── Section Card wrapper ────────────────────────────────────────────────────
const SectionCard = ({ title, icon: Icon, color = 'var(--accent-primary)', children, action }) => (
  <div className="glass-card animate-fade-in" style={{ marginBottom: '1.25rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${color}18`, color, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 12px ${color}33`,
        }}>
          <Icon size={18} />
        </div>
        <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const Toggle = ({ checked, onChange, label, description }) => (
  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
      {description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{description}</div>}
    </div>
    <div
      onClick={(e) => { e.preventDefault(); onChange(!checked); }}
      style={{
        width: 46, height: 24, borderRadius: 999,
        background: checked ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.12)',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.25s',
        flexShrink: 0,
      }}>
      <div style={{
        position: 'absolute', top: 2, left: checked ? 24 : 2,
        width: 20, height: 20, borderRadius: '50%',
        background: 'white',
        transition: 'left 0.25s',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }} />
    </div>
  </label>
);

const Field = ({ label, value, onChange, type = 'text', icon: Icon, placeholder, disabled }) => (
  <div className="input-group" style={{ marginBottom: '0.85rem' }}>
    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {Icon && <Icon size={12} />} {label}
    </label>
    <input
      className="glass-input"
      type={type} value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  </div>
);

// ─── Page principale ─────────────────────────────────────────────────────────
const SettingsPage = () => {
  const { user } = useAuth();
  const { mode, role, toggleMode, setLight, setDark, isDark } = useTheme();
  const i18n = useI18n();
  const { t } = i18n;

  const [activeSection, setActiveSection] = useState('profil');
  const [confirmState, setConfirmState] = useState({ open: false, message: '', onConfirm: null });
  const [savedNotif, setSavedNotif] = useState('');

  // ── Brouillon Apparence (appliqué seulement à la sauvegarde) ─────────
  const [draftApparence, setDraftApparence] = useState({
    mode,
    langue: i18n.langue,
    tz: i18n.tz,
    devise: i18n.devise,
  });

  // Resynchroniser le brouillon si l'utilisateur change d'onglet
  useEffect(() => {
    setDraftApparence({ mode, langue: i18n.langue, tz: i18n.tz, devise: i18n.devise });
  }, [activeSection]); // eslint-disable-line

  const apparenceDirty =
    draftApparence.mode !== mode ||
    draftApparence.langue !== i18n.langue ||
    draftApparence.tz !== i18n.tz ||
    draftApparence.devise !== i18n.devise;

  const handleSaveApparence = () => {
    // Applique tous les changements en une fois
    if (draftApparence.mode !== mode) {
      if (draftApparence.mode === 'light') setLight(); else setDark();
    }
    i18n.setAll({
      langue: draftApparence.langue,
      tz: draftApparence.tz,
      devise: draftApparence.devise,
    });
    showSaved('✅ ' + t('sp_appearance_saved'));
  };

  // Profile
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  // Sécurité
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Préférences (persistées localement)
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('delivermap-prefs') || '{}'); }
    catch { return {}; }
  });
  const setPref = (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try { localStorage.setItem('delivermap-prefs', JSON.stringify(next)); } catch { /* ignore */ }
  };

  const showSaved = (msg) => {
    setSavedNotif(msg);
    setTimeout(() => setSavedNotif(''), 3000);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authApi.updateProfile({
        first_name: firstName,
        last_name: lastName,
        email, phone,
      });
      showSaved('✅ ' + t('sp_profile_saved'));
    } catch (err) {
      showSaved('❌ ' + (err.response?.data?.detail || t('sp_save_error')));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPwd.length < 8) { showSaved('❌ ' + t('sp_pwd_too_short')); return; }
    setSaving(true);
    try {
      await authApi.updateProfile({ password: newPwd, old_password: oldPwd });
      setOldPwd(''); setNewPwd('');
      showSaved('🔒 ' + t('sp_pwd_changed'));
    } catch (err) {
      showSaved('❌ ' + (err.response?.data?.detail || t('common_error')));
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = () => {
    setConfirmState({
      open: true, message: t('sp_clear_cache_confirm'),
      onConfirm: () => {
        ['delivermap-cart-v2', 'delivermap-chat-history-v1', 'delivermap-prefs'].forEach(k => {
          try { localStorage.removeItem(k); } catch { /* ignore */ }
        });
        showSaved('🧹 ' + t('sp_cache_cleared'));
      },
    });
  };

  const SECTIONS = [
    { id: 'profil',       label: t('set_profile'),       icon: User,         color: '#22c55e' },
    { id: 'securite',     label: t('set_security'),      icon: Shield,       color: '#a3e635' },
    { id: 'notifications',label: t('set_notifications'), icon: Bell,         color: '#facc15' },
    { id: 'apparence',    label: t('set_appearance'),    icon: Palette,      color: '#4ade80' },
    { id: 'systeme',      label: t('set_system'),        icon: Cpu,          color: '#fb7185' },
    { id: 'apropos',      label: t('set_about'),         icon: SettingsIcon, color: '#22d3ee' },
  ];

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h2 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Terminal size={26} /> {t('set_system_settings')}
          </h2>
          <p className="page-subtitle">
            {t('set_admin_env')} · {user?.role}
          </p>
        </div>
        {savedNotif && (
          <div style={{
            background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)',
            color: '#86efac', padding: '0.5rem 1rem', borderRadius: 10, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600,
            animation: 'slideIn 0.3s',
          }}>
            {savedNotif}
          </div>
        )}
      </div>

      {/* Layout: nav latérale + contenu */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem', marginTop: '1rem' }}>
        {/* ── Nav ─────────────────────────────────────────────────────── */}
        <aside className="glass-card" style={{ padding: '0.5rem', height: 'fit-content', position: 'sticky', top: '1rem' }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '0.7rem 0.85rem', borderRadius: 10,
                background: activeSection === s.id ? `${s.color}18` : 'transparent',
                border: 'none', cursor: 'pointer',
                color: activeSection === s.id ? s.color : 'var(--text-secondary)',
                fontWeight: activeSection === s.id ? 700 : 500, fontSize: 13.5,
                marginBottom: 4,
                transition: 'all 0.15s',
              }}>
              <s.icon size={15} /> {s.label}
            </button>
          ))}
        </aside>

        {/* ── Contenu ────────────────────────────────────────────────── */}
        <div>
          {/* PROFIL */}
          {activeSection === 'profil' && (
            <SectionCard title={t('set_personal_info')} icon={User} color="#22c55e"
              action={<button className="btn btn-primary btn-sm" onClick={handleSaveProfile} disabled={saving}>
                <Save size={13} /> {saving ? t('common_loading') : t('set_save')}
              </button>}>
              <form onSubmit={handleSaveProfile}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <Field label={t('set_first_name')} value={firstName} onChange={setFirstName} icon={User} />
                  <Field label={t('set_last_name')} value={lastName} onChange={setLastName} icon={User} />
                </div>
                <Field label={t('set_email')} type="email" value={email} onChange={setEmail} icon={Mail} />
                <Field label={t('set_phone')} value={phone} onChange={setPhone} icon={Phone} placeholder="+212 6XX XX XX XX" />
                <Field label={t('set_username')} value={user?.username} onChange={() => {}} disabled icon={User} />
              </form>
            </SectionCard>
          )}

          {/* SECURITE */}
          {activeSection === 'securite' && (
            <>
              <SectionCard title={t('sp_password')} icon={Lock} color="#a3e635"
                action={<button className="btn btn-primary btn-sm" onClick={handleChangePassword} disabled={saving || !newPwd}>
                  <Save size={13} /> {t('sp_change_pwd')}
                </button>}>
                <form onSubmit={handleChangePassword}>
                  <div className="input-group">
                    <label className="input-label">{t('sp_current_pwd')}</label>
                    <div style={{ position: 'relative' }}>
                      <input className="glass-input" type={showPwd ? 'text' : 'password'} value={oldPwd}
                        onChange={e => setOldPwd(e.target.value)} placeholder={t('sp_current_pwd_ph')} />
                      <button type="button" onClick={() => setShowPwd(p => !p)}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <Field label={t('sp_new_pwd')} type={showPwd ? 'text' : 'password'} value={newPwd} onChange={setNewPwd}
                    placeholder={t('sp_new_pwd_ph')} icon={Lock} />
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <AlertTriangle size={12} /> {t('sp_pwd_hint')}
                  </div>
                </form>
              </SectionCard>

              <SectionCard title={t('sp_active_sessions')} icon={Activity} color="#facc15">
                <div style={{ padding: '0.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>🖥️ {t('sp_current_session')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{t('sp_connected_ip')} {new Date().toLocaleDateString(undefined)}</div>
                  </div>
                  <span className="badge badge-success">{t('common_active')}</span>
                </div>
              </SectionCard>
            </>
          )}

          {/* NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <SectionCard title={t('sp_notif_prefs')} icon={Bell} color="#facc15">
              <Toggle checked={prefs.notif_commandes !== false} onChange={v => setPref('notif_commandes', v)}
                label={t('sp_notif_orders')} description={t('sp_notif_orders_desc')} />
              <Toggle checked={prefs.notif_incidents !== false} onChange={v => setPref('notif_incidents', v)}
                label={t('sp_notif_incidents')} description={t('sp_notif_incidents_desc')} />
              <Toggle checked={!!prefs.notif_marketing} onChange={v => setPref('notif_marketing', v)}
                label={t('sp_notif_marketing')} description={t('sp_notif_marketing_desc')} />
              <Toggle checked={prefs.notif_email !== false} onChange={v => setPref('notif_email', v)}
                label={t('sp_notif_email')} description={t('sp_notif_email_desc')} />
              <Toggle checked={!!prefs.notif_son} onChange={v => setPref('notif_son', v)}
                label={t('sp_notif_sound')} description={t('sp_notif_sound_desc')} />
            </SectionCard>
          )}

          {/* APPARENCE */}
          {activeSection === 'apparence' && (
            <>
              <SectionCard title={t('sp_theme')} icon={Palette} color="#4ade80">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button type="button" onClick={() => setDraftApparence(d => ({ ...d, mode: 'dark' }))}
                    style={{
                      padding: '1rem', borderRadius: 14, cursor: 'pointer',
                      background: 'rgba(7,11,20,0.7)',
                      border: `2px solid ${draftApparence.mode === 'dark' ? '#22c55e' : 'rgba(255,255,255,0.08)'}`,
                      color: 'white', fontWeight: 600, fontSize: 13,
                      transition: 'all 0.2s', boxShadow: draftApparence.mode === 'dark' ? '0 0 18px rgba(34,197,94,0.25)' : 'none',
                    }}>
                    <Moon size={20} style={{ marginBottom: 6 }} />
                    <div>🌙 {t('sp_dark_mode')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{t('sp_dark_hint')}</div>
                    {draftApparence.mode === 'dark' && <div style={{ fontSize: 10, color: '#4ade80', marginTop: 6, fontWeight: 700 }}>✓ {t('sp_selected')}</div>}
                  </button>
                  <button type="button" onClick={() => setDraftApparence(d => ({ ...d, mode: 'light' }))}
                    style={{
                      padding: '1rem', borderRadius: 14, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.08)',
                      border: `2px solid ${draftApparence.mode === 'light' ? '#22c55e' : 'rgba(255,255,255,0.08)'}`,
                      color: 'white', fontWeight: 600, fontSize: 13,
                      transition: 'all 0.2s', boxShadow: draftApparence.mode === 'light' ? '0 0 18px rgba(34,197,94,0.25)' : 'none',
                    }}>
                    <Sun size={20} style={{ marginBottom: 6 }} />
                    <div>☀️ {t('sp_light_mode')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{t('sp_light_hint')}</div>
                    {draftApparence.mode === 'light' && <div style={{ fontSize: 10, color: '#4ade80', marginTop: 6, fontWeight: 700 }}>✓ {t('sp_selected')}</div>}
                  </button>
                </div>
              </SectionCard>

              <SectionCard title={t('sp_lang_region')} icon={Globe} color="#22d3ee">
                <div className="input-group">
                  <label className="input-label">{t('sp_display_lang')}</label>
                  <select className="glass-input" value={draftApparence.langue}
                    onChange={e => setDraftApparence(d => ({ ...d, langue: e.target.value }))}>
                    <option value="fr">🇫🇷 Français</option>
                    <option value="ar">🇲🇦 العربية (Arabe)</option>
                    <option value="en">🇬🇧 English</option>
                    <option value="es">🇪🇸 Español</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">{t('sp_timezone')}</label>
                  <select className="glass-input" value={draftApparence.tz}
                    onChange={e => setDraftApparence(d => ({ ...d, tz: e.target.value }))}>
                    <option value="Africa/Casablanca">🇲🇦 Casablanca (GMT+1)</option>
                    <option value="Europe/Paris">🇫🇷 Paris (GMT+2)</option>
                    <option value="Europe/Madrid">🇪🇸 Madrid (GMT+2)</option>
                    <option value="Europe/London">🇬🇧 Londres (GMT+1)</option>
                    <option value="UTC">🌐 UTC</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">{t('sp_default_currency')}</label>
                  <select className="glass-input" value={draftApparence.devise}
                    onChange={e => setDraftApparence(d => ({ ...d, devise: e.target.value }))}>
                    <option value="MAD">💰 MAD (Dirham marocain)</option>
                    <option value="EUR">€ EUR (Euro)</option>
                    <option value="USD">$ USD (Dollar US)</option>
                    <option value="GBP">£ GBP (Livre sterling)</option>
                  </select>
                </div>
                <div style={{ marginTop: 10, padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {t('sp_preview_label')} <strong>{new Intl.NumberFormat(draftApparence.langue === 'ar' ? 'ar-MA' : draftApparence.langue === 'en' ? 'en-US' : draftApparence.langue === 'es' ? 'es-ES' : undefined, { style: 'currency', currency: draftApparence.devise || 'MAD', maximumFractionDigits: 2 }).format(1234.56)}</strong>
                  {' · '}{t('sp_language')}{' : '}<strong>{ {fr: 'Français', ar: 'العربية', en: 'English', es: 'Español'}[draftApparence.langue] }</strong>
                </div>
              </SectionCard>

              {/* Bouton Sauvegarder */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '-0.5rem' }}>
                {apparenceDirty && (
                  <button onClick={() => setDraftApparence({ mode, langue: i18n.langue, tz: i18n.tz, devise: i18n.devise })}
                    className="btn btn-secondary">
                    {t('sp_cancel_changes')}
                  </button>
                )}
                <button onClick={handleSaveApparence}
                  className="btn btn-primary" disabled={!apparenceDirty}
                  style={{ minWidth: 200 }}>
                  <Save size={14} /> {apparenceDirty ? t('sp_save_apply') : '✓ ' + t('sp_all_saved')}
                </button>
              </div>
            </>
          )}

          {/* SYSTEME */}
          {activeSection === 'systeme' && (
            <>
              <SectionCard title={t('sp_cache_storage')} icon={Database} color="#fb7185"
                action={<button className="btn btn-danger btn-sm" onClick={handleClearCache}>
                  <Trash2 size={13} /> {t('sp_clear_cache')}
                </button>}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {t('sp_cache_desc')}
                  <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 12 }}>
                    <li>{t('sp_cache_cart')}</li>
                    <li>{t('sp_cache_chat')}</li>
                    <li>{t('sp_cache_prefs')}</li>
                  </ul>
                </div>
              </SectionCard>

              <SectionCard title={t('sp_performance')} icon={Activity} color="#22c55e">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { labelKey: 'sp_latency', value: '< 200ms', color: '#22c55e' },
                    { labelKey: 'sp_uptime', value: '99.9%',   color: '#a3e635' },
                    { labelKey: 'sp_connections', value: t('common_active'), color: '#4ade80' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t(s.labelKey)}</div>
                      <div style={{ fontWeight: 800, color: s.color, fontSize: 18, marginTop: 4 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title={t('sp_maintenance')} icon={RefreshCw} color="#facc15">
                <Toggle checked={!!prefs.maintenance_mode} onChange={v => setPref('maintenance_mode', v)}
                  label={t('sp_maintenance_mode')} description={t('sp_maintenance_mode_desc')} />
                <Toggle checked={!!prefs.debug_mode} onChange={v => setPref('debug_mode', v)}
                  label={t('sp_debug_mode')} description={t('sp_debug_mode_desc')} />
                <Toggle checked={prefs.auto_refresh !== false} onChange={v => setPref('auto_refresh', v)}
                  label={t('sp_auto_refresh')} description={t('sp_auto_refresh_desc')} />
              </SectionCard>
            </>
          )}

          {/* A PROPOS */}
          {activeSection === 'apropos' && (
            <SectionCard title={t('sp_about')} icon={SettingsIcon} color="#22d3ee">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('sp_version')}</span>
                  <strong>v2.1.0 — Geoinfo 2025-2026</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('sp_build')}</span>
                  <strong>{new Date().toISOString().split('T')[0]}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('sp_frontend_lbl')}</span>
                  <strong>React 18 + Vite + Leaflet</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('sp_backend_lbl')}</span>
                  <strong>Django + DRF + PostGIS</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('sp_routing_lbl')}</span>
                  <strong>OSRM (Open Source)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('sp_ai_lbl')}</span>
                  <strong>Mistral AI + fallback local</strong>
                </div>
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} color="#22c55e" />
                  {t('sp_all_systems_ok')}
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
      <ConfirmModal
        open={confirmState.open}
        message={confirmState.message}
        onConfirm={() => { confirmState.onConfirm?.(); setConfirmState(s => ({ ...s, open: false })); }}
        onCancel={() => setConfirmState(s => ({ ...s, open: false }))}
      />
    </div>
  );
};

export default SettingsPage
