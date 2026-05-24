import { useState, useEffect, useRef } from 'react';
import { galerieApi, mediaUrl } from '../../services/api';
import useAuthStore from '../../stores/authStore';
import '../../styles/marjane.css';

const TYPE_LABELS = { logo: 'Logo', banniere: 'Bannière boutique', photo: 'Photo boutique' };
const TYPE_ICONS  = { logo: '🏷️', banniere: '🖼️', photo: '📷' };

export default function GaleriePage() {
  const { user } = useAuthStore();
  const fondateurId = user?.fondateur_id || user?.id;

  const [medias, setMedias]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState(null);
  const [success, setSuccess]         = useState(null);
  const [type, setType]               = useState('photo');
  const [preview, setPreview]         = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef(null);

  const load = () => {
    setLoading(true);
    galerieApi.list(fondateurId)
      .then(r => setMedias(r.data?.results || r.data || []))
      .catch(() => setMedias([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(file);
    setError(null);
  };

  const handleUpload = () => {
    if (!selectedFile) { setError('Sélectionnez un fichier'); return; }
    setUploading(true); setError(null); setSuccess(null);
    const fd = new FormData();
    fd.append('image', selectedFile);
    fd.append('type', type);
    galerieApi.upload(fondateurId, fd)
      .then(() => {
        setSuccess('Image uploadée avec succès');
        setSelectedFile(null); setPreview(null);
        if (fileRef.current) fileRef.current.value = '';
        load();
        setTimeout(() => setSuccess(null), 3000);
      })
      .catch(e => setError(e.response?.data?.image?.[0] || 'Erreur upload'))
      .finally(() => setUploading(false));
  };

  const handleDelete = (mediaId) => {
    if (!window.confirm('Supprimer cette image ?')) return;
    galerieApi.delete(fondateurId, mediaId)
      .then(load)
      .catch(() => setError('Erreur suppression'));
  };

  const grouped = { logo: [], banniere: [], photo: [] };
  medias.forEach(m => { if (grouped[m.type]) grouped[m.type].push(m); });

  return (
    <div className="mj-page" style={{ maxWidth: 1000, padding: '0 0 40px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'linear-gradient(135deg, var(--mj-red), #f97316)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>🖼️</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--mj-text)', fontFamily: 'var(--mj-font)' }}>
            Galerie de la boutique
          </h1>
          <div style={{ color: 'var(--mj-text-3)', fontSize: 13, marginTop: 2 }}>
            Logo, bannière et photos de votre boutique
          </div>
        </div>
      </div>

      {/* ── Toast success ── */}
      {success && (
        <div style={{
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
          color: '#15803d', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 14,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          ✅ {success}
        </div>
      )}
      {error && (
        <div style={{
          background: 'var(--mj-red-light)', border: '1px solid rgba(227,6,19,0.2)',
          color: '#E30613', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 14,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          ❌ {error}
        </div>
      )}

      {/* ── Upload zone ── */}
      <div className="mj-card" style={{ marginBottom: 28 }}>
        <h3 style={{ margin: '0 0 16px', color: 'var(--mj-text)', fontSize: 15, fontWeight: 700, fontFamily: 'var(--mj-font)' }}>
          Ajouter une image
        </h3>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_LABELS).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                background: type === t ? 'var(--mj-red)' : 'var(--mj-bg)',
                border: `1px solid ${type === t ? 'var(--mj-red)' : 'var(--mj-border)'}`,
                color: type === t ? 'white' : 'var(--mj-text-3)',
                borderRadius: 10, padding: '8px 16px', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, transition: 'all 0.2s ease',
                fontFamily: 'var(--mj-font)',
              }}
            >
              {TYPE_ICONS[t]} {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 150, height: 110, borderRadius: 14,
              border: `2px dashed ${preview ? 'var(--mj-red)' : 'var(--mj-border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
              background: 'var(--mj-bg)', position: 'relative',
              transition: 'border-color 0.2s ease',
            }}
            onMouseEnter={e => { if (!preview) e.currentTarget.style.borderColor = 'var(--mj-red)'; }}
            onMouseLeave={e => { if (!preview) e.currentTarget.style.borderColor = 'var(--mj-border)'; }}
          >
            {preview ? (
              <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--mj-text-3)' }}>
                <div style={{ fontSize: 30, marginBottom: 6 }}>📁</div>
                <div style={{ fontSize: 12 }}>Cliquer pour<br />choisir</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </div>

          {/* Info + button */}
          <div style={{ flex: 1, minWidth: 200 }}>
            {selectedFile ? (
              <div style={{
                color: 'var(--mj-text-3)', fontSize: 13, marginBottom: 14,
                background: 'var(--mj-bg)', borderRadius: 10, padding: '8px 12px',
              }}>
                📎 <strong>{selectedFile.name}</strong>
                <span style={{ marginLeft: 6, color: 'var(--mj-text-3)' }}>
                  ({(selectedFile.size / 1024).toFixed(0)} Ko)
                </span>
              </div>
            ) : (
              <div style={{ color: 'var(--mj-text-3)', fontSize: 13, marginBottom: 14 }}>
                Formats acceptés : JPG, PNG, WebP — Max 5 Mo
              </div>
            )}
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className={`mj-btn ${uploading || !selectedFile ? 'mj-btn-secondary' : 'mj-btn-primary'}`}
            >
              {uploading ? '⏳ Upload en cours…' : '⬆️ Uploader'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Gallery sections ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="mj-skeleton" style={{ height: 18, width: 120, marginBottom: 14 }} />
              <div style={{ display: 'flex', gap: 12 }}>
                {[1, 2].map(j => <div key={j} className="mj-skeleton" style={{ width: 160, height: 110, borderRadius: 12 }} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        Object.entries(grouped).map(([gType, items]) => (
          <div key={gType} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>{TYPE_ICONS[gType]}</span>
              <h3 style={{ margin: 0, color: 'var(--mj-text)', fontSize: 16, fontWeight: 700, fontFamily: 'var(--mj-font)' }}>
                {TYPE_LABELS[gType]}
              </h3>
              <span className="mj-badge" style={{ background: 'var(--mj-red-light)', color: 'var(--mj-red)' }}>
                {items.length}
              </span>
            </div>

            {items.length === 0 ? (
              <div style={{
                background: 'var(--mj-bg)', border: '1px dashed var(--mj-border)',
                borderRadius: 12, padding: '20px', textAlign: 'center',
                color: 'var(--mj-text-3)', fontSize: 13,
              }}>
                Aucune image — cliquez sur "Ajouter" ci-dessus
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {items.map(m => (
                  <div key={m.id} style={{ position: 'relative' }}>
                    <img
                      src={mediaUrl(m.image)}
                      alt={m.type}
                      style={{
                        width: gType === 'logo' ? 100 : gType === 'banniere' ? 260 : 160,
                        height: gType === 'logo' ? 100 : 110,
                        objectFit: 'cover', borderRadius: 12,
                        border: '1px solid var(--mj-border)',
                        display: 'block',
                      }}
                    />
                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(m.id)}
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        background: 'rgba(227,6,19,0.85)', border: 'none',
                        borderRadius: '50%', width: 26, height: 26,
                        cursor: 'pointer', color: '#fff', fontSize: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--mj-red-dark)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(227,6,19,0.85)'}
                    >
                      ✕
                    </button>
                    {m.ordre !== undefined && (
                      <div style={{
                        position: 'absolute', bottom: 6, left: 6,
                        background: 'rgba(0,0,0,0.5)', color: '#fff',
                        borderRadius: 6, padding: '2px 7px', fontSize: 11,
                      }}>
                        #{m.ordre}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
