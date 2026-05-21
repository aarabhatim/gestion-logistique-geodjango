import { useState, useEffect, useRef } from 'react';
import { galerieApi } from '../../services/api';
import useAuthStore from '../../stores/authStore';

const TYPE_LABELS = { logo: 'Logo', banniere: 'Bannière boutique', photo: 'Photo boutique' };
const TYPE_ICONS  = { logo: '🏷️', banniere: '🖼️', photo: '📷' };

export default function GaleriePage() {
  const { user } = useAuthStore();
  const fondateurId = user?.fondateur_id || user?.id;

  const [medias, setMedias]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const [type, setType]         = useState('photo');
  const [preview, setPreview]   = useState(null);
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
    <div style={{ padding: '24px 28px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
        }}>🖼️</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f1f5f9)' }}>
            Galerie de la boutique
          </h1>
          <div style={{ color: 'var(--text-secondary, #64748b)', fontSize: 13 }}>
            Logo, bannière et photos de votre boutique
          </div>
        </div>
      </div>

      {success && (
        <div style={{
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
          color: '#86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14
        }}>✅ {success}</div>
      )}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14
        }}>❌ {error}</div>
      )}

      {/* Upload zone */}
      <div style={{
        background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 16, padding: '22px 26px', marginBottom: 28
      }}>
        <h3 style={{ margin: '0 0 16px', color: 'var(--text-primary, #e2e8f0)', fontSize: 15 }}>
          Ajouter une image
        </h3>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_LABELS).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                background: type === t ? 'rgba(99,102,241,0.3)' : 'rgba(30,41,59,0.5)',
                border: `1px solid ${type === t ? 'rgba(99,102,241,0.6)' : 'rgba(71,85,105,0.3)'}`,
                color: type === t ? '#a5b4fc' : '#64748b',
                borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13
              }}
            >
              {TYPE_ICONS[t]} {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 140, height: 100, borderRadius: 12,
              border: '2px dashed rgba(99,102,241,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
              background: 'rgba(15,23,42,0.5)', position: 'relative'
            }}
          >
            {preview ? (
              <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: 28 }}>📁</div>
                <div style={{ fontSize: 11 }}>Cliquer pour choisir</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile}
              style={{ display: 'none' }} />
          </div>
          <div style={{ flex: 1 }}>
            {selectedFile && (
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>
                📎 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} Ko)
              </div>
            )}
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              style={{
                background: uploading || !selectedFile
                  ? 'rgba(99,102,241,0.2)'
                  : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border: 'none', color: uploading || !selectedFile ? '#64748b' : '#fff',
                borderRadius: 10, padding: '10px 22px', cursor: uploading || !selectedFile ? 'not-allowed' : 'pointer',
                fontWeight: 600, fontSize: 14
              }}
            >
              {uploading ? 'Upload en cours…' : '⬆️ Uploader'}
            </button>
          </div>
        </div>
      </div>

      {/* Gallery sections */}
      {loading ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Chargement…</div>
      ) : (
        Object.entries(grouped).map(([gType, items]) => (
          <div key={gType} style={{ marginBottom: 28 }}>
            <h3 style={{
              margin: '0 0 14px', color: 'var(--text-primary, #e2e8f0)', fontSize: 15,
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span>{TYPE_ICONS[gType]}</span> {TYPE_LABELS[gType]}
              <span style={{
                background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                borderRadius: 12, padding: '1px 10px', fontSize: 12, fontWeight: 600
              }}>{items.length}</span>
            </h3>
            {items.length === 0 ? (
              <div style={{
                background: 'rgba(30,41,59,0.4)', border: '1px dashed rgba(71,85,105,0.3)',
                borderRadius: 12, padding: '20px', textAlign: 'center', color: '#475569', fontSize: 13
              }}>
                Aucune image — cliquez sur "Ajouter" ci-dessus
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {items.map(m => (
                  <div key={m.id} style={{ position: 'relative' }}>
                    <img
                      src={m.image}
                      alt={m.type}
                      style={{
                        width: gType === 'logo' ? 100 : gType === 'banniere' ? 260 : 160,
                        height: gType === 'logo' ? 100 : 110,
                        objectFit: 'cover', borderRadius: 10,
                        border: '1px solid rgba(99,102,241,0.25)'
                      }}
                    />
                    <button
                      onClick={() => handleDelete(m.id)}
                      style={{
                        position: 'absolute', top: 5, right: 5,
                        background: 'rgba(239,68,68,0.8)', border: 'none',
                        borderRadius: '50%', width: 24, height: 24,
                        cursor: 'pointer', color: '#fff', fontSize: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >✕</button>
                    {m.ordre !== undefined && (
                      <div style={{
                        position: 'absolute', bottom: 5, left: 5,
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        borderRadius: 4, padding: '1px 6px', fontSize: 10
                      }}>#{m.ordre}</div>
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
