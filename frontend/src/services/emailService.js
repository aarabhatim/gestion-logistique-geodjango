/**
 * emailService.js — Emails via EmailJS REST API
 *
 * Template EmailJS requis (1 seul template flexible) :
 *   To Email  -> {{to_email}}    <- OBLIGATOIRE dans les settings du template
 *   Subject   -> {{subject}}
 *   Body HTML -> {{message}}
 */

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || 'service_0ocuks5';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_of6r6su';
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || 'bdz0uoCKUmfC4WkEl';
const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';

// ── Envoi générique ───────────────────────────────────────────────────────────
async function sendEmail(params) {
  try {
    const res = await fetch(EMAILJS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:      SERVICE_ID,
        template_id:     TEMPLATE_ID,
        user_id:         PUBLIC_KEY,
        template_params: params,
      }),
    });
    if (res.ok) {
      console.info('[EmailJS] Email envoye a', params.to_email);
      return true;
    }
    const txt = await res.text();
    console.error('[EmailJS] Erreur', res.status, txt);
    return false;
  } catch (err) {
    console.error('[EmailJS] Reseau:', err.message);
    return false;
  }
}

// ── Base HTML ─────────────────────────────────────────────────────────────────
function wrap(content) {
  const yr = new Date().getFullYear();
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px"><div style="text-align:center;margin-bottom:24px"><h1 style="color:#6366f1;font-size:28px;margin:0">DeliverMap</h1><p style="color:#64748b;font-size:13px;margin:4px 0 0">Livraison rapide au Maroc</p></div>${content}<hr style="border-color:#334155;margin:24px 0"><p style="color:#64748b;font-size:12px;text-align:center">DeliverMap &copy; ${yr}</p></div>`;
}

// ── Email bienvenue ───────────────────────────────────────────────────────────
export async function sendWelcomeEmail({ first_name, last_name, email, username, role }) {
  const name = ((first_name || '') + ' ' + (last_name || '')).trim() || username;
  const isDriver = role === 'TRANSPORTEUR';
  const dashUrl = window.location.origin + (isDriver ? '/chauffeur' : '/client');
  const roleLabel = isDriver ? 'Chauffeur partenaire' : 'Client';
  const roleEmoji = isDriver ? 'image' : '';

  const message = wrap(`
    <h2 style="color:#f8fafc;font-size:20px">Bienvenue sur DeliverMap !</h2>
    <p>Bonjour <strong>${first_name || username}</strong>,</p>
    <p>Votre compte a ete cree avec succes.</p>
    <div style="background:#1e293b;border-radius:8px;padding:16px;margin:20px 0">
      <p style="margin:4px 0"><strong>Identifiant :</strong> ${username}</p>
      <p style="margin:4px 0"><strong>Role :</strong> ${roleLabel}</p>
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="${dashUrl}" style="background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
        Acceder a mon espace
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px">Si vous n'avez pas cree ce compte, ignorez cet email.</p>
  `);

  return sendEmail({ to_name: name, to_email: email, subject: 'Bienvenue sur DeliverMap !', message, action_url: dashUrl, action_label: 'Acceder a mon espace' });
}

// ── Email reset mot de passe ──────────────────────────────────────────────────
export async function sendPasswordResetEmail({ email, name, resetUrl }) {
  const message = wrap(`
    <h2 style="color:#f8fafc;font-size:20px">Reinitialisation du mot de passe</h2>
    <p>Bonjour <strong>${name || 'utilisateur'}</strong>,</p>
    <p>Cliquez sur le bouton ci-dessous pour reinitialiser votre mot de passe :</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${resetUrl}" style="background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
        Reinitialiser mon mot de passe
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px">Ce lien expire dans <strong>1 heure</strong>.</p>
  `);

  return sendEmail({ to_name: name || 'Utilisateur', to_email: email, subject: '[DeliverMap] Reinitialisation de votre mot de passe', message, action_url: resetUrl, action_label: 'Reinitialiser' });
}
