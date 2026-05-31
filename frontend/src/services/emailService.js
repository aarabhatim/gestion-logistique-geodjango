/**
 * emailService.js — Envoi d'emails transactionnels via EmailJS
 *
 * Les credentials EmailJS sont intentionnellement côté client —
 * c'est le modèle prévu par EmailJS (clés exposées dans le JS du navigateur).
 *
 * Template variables utilisées :
 *   {{to_name}}        Prénom + Nom
 *   {{to_email}}       Email du destinataire
 *   {{username}}       Identifiant de connexion
 *   {{role_label}}     "Client" ou "Chauffeur partenaire"
 *   {{role_emoji}}     📦 ou 🚗
 *   {{dashboard_url}}  Lien vers le tableau de bord
 *   {{features}}       Description des fonctionnalités
 *   {{year}}           Année en cours
 */

// ── Credentials EmailJS ───────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID  = 'service_0ocuks5';
const EMAILJS_TEMPLATE_ID = 'template_of6r6su';
const EMAILJS_PUBLIC_KEY  = 'bdz0uoCKUmfC4WkEl';

// ── Métadonnées par rôle ──────────────────────────────────────────────────────
const ROLE_META = {
  CLIENT: {
    label:         'Client',
    emoji:         '📦',
    get dashboard_url() { return `${window.location.origin}/client`; },
    features:      'commandes en ligne, suivi live de vos livraisons et historique complet.',
  },
  TRANSPORTEUR: {
    label:         'Chauffeur partenaire',
    emoji:         '🚗',
    get dashboard_url() { return `${window.location.origin}/chauffeur`; },
    features:      'missions disponibles, suivi de vos revenus et navigation intégrée.',
  },
};

// ── Fonction principale ───────────────────────────────────────────────────────
/**
 * Envoie l'email de bienvenue après création de compte.
 * Non bloquant — ne stoppe jamais l'inscription en cas d'erreur email.
 *
 * @param {{ first_name: string, last_name: string, email: string, username: string, role: string }} userData
 */
export async function sendWelcomeEmail(userData) {
  console.log('[EmailService] Tentative d\'envoi à', userData.email, '| Rôle:', userData.role);

  const meta = ROLE_META[userData.role] ?? ROLE_META.CLIENT;

  const templateParams = {
    to_name:       (`${userData.first_name || ''} ${userData.last_name || ''}`).trim() || userData.username,
    to_email:      userData.email,
    username:      userData.username,
    role_label:    meta.label,
    role_emoji:    meta.emoji,
    dashboard_url: meta.dashboard_url,
    features:      meta.features,
    year:          new Date().getFullYear(),
  };

  console.log('[EmailService] Paramètres template:', templateParams);

  try {
    const payload = {
      service_id:      EMAILJS_SERVICE_ID,
      template_id:     EMAILJS_TEMPLATE_ID,
      user_id:         EMAILJS_PUBLIC_KEY,
      template_params: templateParams,
    };

    console.log('[EmailService] Envoi payload:', payload);

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();

    if (res.ok) {
      console.info('[EmailService] ✅ Email envoyé avec succès à', userData.email);
    } else {
      console.error(
        '[EmailService] ❌ Échec HTTP', res.status,
        '| Réponse:', responseText,
        '\n→ Vérifiez : Public Key, Service ID, Template ID dans le dashboard EmailJS'
      );
    }
  } catch (err) {
    console.error('[EmailService] ❌ Erreur réseau:', err.message);
  }
}
