"""
email_service.py — Envoi d'emails transactionnels depuis Django
Utilise Gmail SMTP configuré dans settings.py / backend/.env
"""

from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def send_welcome_email(user):
    """
    Envoie l'email de bienvenue après création de compte.
    Non bloquant — les erreurs sont loggées sans stopper l'inscription.
    """
    try:
        role_meta = {
            'CLIENT': {
                'label':    'Client',
                'emoji':    '📦',
                'features': 'commandes en ligne, suivi live de vos livraisons et historique complet.',
                'url_path': '/client',
            },
            'TRANSPORTEUR': {
                'label':    'Chauffeur partenaire',
                'emoji':    '🚗',
                'features': 'missions disponibles, suivi de vos revenus et navigation intégrée.',
                'url_path': '/chauffeur',
            },
        }
        meta = role_meta.get(user.role, role_meta['CLIENT'])

        subject = f"🎉 Bienvenue sur DeliverMap, {user.first_name or user.username} !"

        # Contexte pour le template
        context = {
            'to_name':    f"{user.first_name} {user.last_name}".strip() or user.username,
            'username':   user.username,
            'to_email':   user.email,
            'role_label': meta['label'],
            'role_emoji': meta['emoji'],
            'features':   meta['features'],
            'year':       __import__('datetime').date.today().year,
        }

        # Corps texte brut (fallback)
        text_body = (
            f"Bonjour {context['to_name']},\n\n"
            f"Votre compte DeliverMap ({meta['label']}) a été créé avec succès.\n"
            f"Identifiant : {user.username}\n"
            f"Email : {user.email}\n\n"
            f"Connectez-vous sur DeliverMap pour accéder à votre espace.\n\n"
            f"L'équipe DeliverMap"
        )

        # Corps HTML professionnel
        html_body = _build_html_email(context)

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)

        logger.info(f"[Email] ✅ Email de bienvenue envoyé à {user.email}")

    except Exception as e:
        # Ne jamais bloquer l'inscription si l'email échoue
        logger.error(f"[Email] ❌ Échec envoi email à {getattr(user, 'email', '?')}: {e}")


def _build_html_email(ctx):
    """Génère le HTML de l'email de bienvenue."""
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- Logo -->
    <tr><td align="center" style="padding-bottom:32px;">
      <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:16px;display:inline-block;padding:14px 24px;">
        <span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">🚚 DeliverMap</span>
      </div>
    </td></tr>

    <!-- Card -->
    <tr><td style="background:#1e293b;border-radius:20px;overflow:hidden;border:1px solid #334155;">
      <div style="height:4px;background:linear-gradient(90deg,#3b82f6,#8b5cf6,#06b6d4);"></div>
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px;">

        <!-- Emoji -->
        <tr><td align="center" style="padding-bottom:20px;">
          <div style="font-size:60px;">🎉</div>
        </td></tr>

        <!-- Titre -->
        <tr><td align="center" style="padding-bottom:8px;">
          <h1 style="margin:0;font-size:26px;font-weight:800;color:#f1f5f9;">
            Bienvenue, {ctx['to_name']} !
          </h1>
        </td></tr>

        <!-- Badge rôle -->
        <tr><td align="center" style="padding-bottom:28px;">
          <span style="background:rgba(59,130,246,0.15);color:#60a5fa;font-size:13px;font-weight:700;
                       padding:6px 18px;border-radius:999px;border:1px solid rgba(59,130,246,0.3);">
            {ctx['role_emoji']} {ctx['role_label']}
          </span>
        </td></tr>

        <!-- Texte intro -->
        <tr><td style="padding-bottom:28px;">
          <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;text-align:center;">
            Votre compte <strong style="color:#e2e8f0;">DeliverMap</strong> a été créé avec succès.<br/>
            Vous avez maintenant accès à vos {ctx['features']}
          </p>
        </td></tr>

        <!-- Info box -->
        <tr><td style="padding-bottom:32px;">
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#0f172a;border-radius:12px;border:1px solid #334155;">
            <tr><td style="padding:20px 24px;">
              <table width="100%">
                <tr>
                  <td style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;
                             letter-spacing:.08em;padding-bottom:10px;border-bottom:1px solid #1e293b;">
                    Identifiant
                  </td>
                  <td align="right" style="font-size:14px;color:#e2e8f0;font-weight:700;font-family:monospace;
                              padding-bottom:10px;border-bottom:1px solid #1e293b;">
                    {ctx['username']}
                  </td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;
                             letter-spacing:.08em;padding-top:10px;">Email</td>
                  <td align="right" style="font-size:14px;color:#e2e8f0;font-weight:700;padding-top:10px;">
                    {ctx['to_email']}
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Note sécurité -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:10px;">
            <tr><td style="padding:14px 18px;">
              <p style="margin:0;font-size:13px;color:#fbbf24;line-height:1.6;">
                🔒 <strong>Sécurité</strong> — Si vous n'êtes pas à l'origine de cette inscription,
                ignorez cet email ou contactez notre support.
              </p>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:28px 0 0;text-align:center;">
      <p style="margin:0 0 6px;font-size:12px;color:#475569;">
        Vous recevez cet email car vous venez de créer un compte sur DeliverMap.
      </p>
      <p style="margin:0;font-size:12px;color:#334155;">
        © {ctx['year']} DeliverMap · Tous droits réservés
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>"""
