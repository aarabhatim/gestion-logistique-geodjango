from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
import logging

logger = logging.getLogger(__name__)


def _send(subject, to_email, html_content, text_content=None):
    """Envoie un email HTML avec fallback texte."""
    try:
        if text_content is None:
            import re
            text_content = re.sub(r'<[^>]+>', ' ', html_content).strip()
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        return True
    except Exception as e:
        logger.error(f"Erreur envoi email a {to_email}: {e}")
        return False


def email_confirmation_commande(commande):
    """Email de confirmation de commande au client."""
    subject = f"[DeliverMap] Commande {commande.reference} confirmee"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#6366f1;font-size:28px;margin:0">DeliverMap</h1>
      </div>
      <h2 style="color:#f8fafc;font-size:20px">Commande confirmee !</h2>
      <p>Bonjour <strong>{commande.client.first_name}</strong>,</p>
      <p>Votre commande <strong style="color:#6366f1">{commande.reference}</strong> a ete confirmee.</p>
      <div style="background:#1e293b;border-radius:8px;padding:16px;margin:20px 0">
        <p style="margin:4px 0"><strong>Montant total :</strong> {commande.total_price} MAD</p>
        <p style="margin:4px 0"><strong>Mode de paiement :</strong> {commande.mode_paiement}</p>
        <p style="margin:4px 0"><strong>Adresse :</strong> {commande.adresse_livraison}</p>
      </div>
      <p style="color:#94a3b8;font-size:13px">Vous recevrez une notification quand votre commande sera en route.</p>
      <hr style="border-color:#334155;margin:24px 0">
      <p style="color:#64748b;font-size:12px;text-align:center">DeliverMap — Livraison rapide au Maroc</p>
    </div>
    """
    return _send(subject, commande.client.email, html)


def email_livraison_en_route(commande):
    """Email quand la livraison demarre."""
    subject = f"[DeliverMap] Votre commande {commande.reference} est en route !"
    transporteur = commande.transporteur
    nom_t = f"{transporteur.first_name} {transporteur.last_name}" if transporteur else "votre livreur"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#6366f1;font-size:28px;margin:0">DeliverMap</h1>
      </div>
      <h2 style="color:#f8fafc;font-size:20px">Votre commande est en route ! 🚚</h2>
      <p>Bonjour <strong>{commande.client.first_name}</strong>,</p>
      <p>La commande <strong style="color:#6366f1">{commande.reference}</strong> est prise en charge par <strong>{nom_t}</strong>.</p>
      <p style="color:#94a3b8;font-size:13px">Suivez votre livraison en temps reel dans l'application.</p>
      <hr style="border-color:#334155;margin:24px 0">
      <p style="color:#64748b;font-size:12px;text-align:center">DeliverMap — Livraison rapide au Maroc</p>
    </div>
    """
    return _send(subject, commande.client.email, html)


def email_commande_livree(commande):
    """Email de confirmation de livraison."""
    subject = f"[DeliverMap] Commande {commande.reference} livree avec succes !"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#6366f1;font-size:28px;margin:0">DeliverMap</h1>
      </div>
      <h2 style="color:#f8fafc;font-size:20px">Livraison effectuee ! ✅</h2>
      <p>Bonjour <strong>{commande.client.first_name}</strong>,</p>
      <p>Votre commande <strong style="color:#6366f1">{commande.reference}</strong> a ete livree avec succes.</p>
      <p>Vous pouvez maintenant laisser un avis sur votre experience.</p>
      <hr style="border-color:#334155;margin:24px 0">
      <p style="color:#64748b;font-size:12px;text-align:center">DeliverMap — Livraison rapide au Maroc</p>
    </div>
    """
    return _send(subject, commande.client.email, html)


def email_reset_password(user, reset_url):
    """Email de reinitialisation de mot de passe."""
    subject = "[DeliverMap] Reinitialisation de votre mot de passe"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#6366f1;font-size:28px;margin:0">DeliverMap</h1>
      </div>
      <h2 style="color:#f8fafc;font-size:20px">Reinitialisation du mot de passe</h2>
      <p>Bonjour <strong>{user.first_name}</strong>,</p>
      <p>Vous avez demande a reinitialiser votre mot de passe.</p>
      <div style="text-align:center;margin:28px 0">
        <a href="{reset_url}" style="background:#6366f1;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
          Reinitialiser mon mot de passe
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px">Ce lien expire dans 24 heures. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      <hr style="border-color:#334155;margin:24px 0">
      <p style="color:#64748b;font-size:12px;text-align:center">DeliverMap — Livraison rapide au Maroc</p>
    </div>
    """
    return _send(subject, user.email, html)


def email_alerte_stock(produit, fondateur_user):
    """Email d'alerte rupture de stock au fondateur."""
    subject = f"[DeliverMap] Alerte stock — {produit.nom}"
    niveau = "en rupture" if produit.stock == 0 else f"bas ({produit.stock} unites restantes)"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#6366f1;font-size:28px;margin:0">DeliverMap</h1>
      </div>
      <h2 style="color:#ef4444;font-size:20px">Alerte Stock ⚠️</h2>
      <p>Bonjour <strong>{fondateur_user.first_name}</strong>,</p>
      <p>Le produit <strong style="color:#f59e0b">{produit.nom}</strong> est {niveau}.</p>
      <div style="background:#1e293b;border-radius:8px;padding:16px;margin:20px 0">
        <p style="margin:4px 0"><strong>Stock actuel :</strong> <span style="color:#ef4444">{produit.stock}</span></p>
        <p style="margin:4px 0"><strong>Seuil d'alerte :</strong> {getattr(produit, 'seuil_alerte', 5)}</p>
      </div>
      <p style="color:#94a3b8;font-size:13px">Pensez a reapprovisionner votre stock pour continuer a recevoir des commandes.</p>
      <hr style="border-color:#334155;margin:24px 0">
      <p style="color:#64748b;font-size:12px;text-align:center">DeliverMap — Livraison rapide au Maroc</p>
    </div>
    """
    return _send(subject, fondateur_user.email, html)


def email_incident_signale(incident, admin_emails):
    """Email aux admins lors d un signalement d incident."""
    subject = f"[DeliverMap] Incident signale — {incident.get_type_incident_display()}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#6366f1;font-size:28px;margin:0">DeliverMap</h1>
      </div>
      <h2 style="color:#ef4444;font-size:20px">Incident signale 🚨</h2>
      <div style="background:#1e293b;border-radius:8px;padding:16px;margin:20px 0">
        <p style="margin:4px 0"><strong>Type :</strong> {incident.get_type_incident_display()}</p>
        <p style="margin:4px 0"><strong>Commande :</strong> {incident.commande}</p>
        <p style="margin:4px 0"><strong>Chauffeur :</strong> {incident.chauffeur.get_full_name() if incident.chauffeur else "N/A"}</p>
        <p style="margin:4px 0"><strong>Description :</strong> {incident.description[:200]}</p>
      </div>
      <p style="color:#94a3b8;font-size:13px">Connectez-vous sur le tableau de bord admin pour traiter cet incident.</p>
      <hr style="border-color:#334155;margin:24px 0">
      <p style="color:#64748b;font-size:12px;text-align:center">DeliverMap — Livraison rapide au Maroc</p>
    </div>
    """
    for email in admin_emails:
        _send(subject, email, html)
    return True


def email_ticket_reponse(ticket, message):
    """Email au demandeur quand une reponse est ajoutee au ticket."""
    subject = f"[DeliverMap] Reponse a votre ticket #{ticket.id} — {ticket.sujet}"
    demandeur = ticket.demandeur
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#6366f1;font-size:28px;margin:0">DeliverMap</h1>
      </div>
      <h2 style="color:#f8fafc;font-size:20px">Nouvelle reponse a votre ticket 💬</h2>
      <p>Bonjour <strong>{demandeur.first_name}</strong>,</p>
      <p>Une reponse a ete ajoutee a votre ticket <strong style="color:#6366f1">#{ticket.id} — {ticket.sujet}</strong>.</p>
      <div style="background:#1e293b;border-left:3px solid #6366f1;border-radius:8px;padding:16px;margin:20px 0">
        <p style="margin:0;font-size:14px">{message.contenu[:300]}</p>
        <p style="margin:8px 0 0;font-size:11px;color:#64748b">— {message.auteur.get_full_name()}</p>
      </div>
      <hr style="border-color:#334155;margin:24px 0">
      <p style="color:#64748b;font-size:12px;text-align:center">DeliverMap — Livraison rapide au Maroc</p>
    </div>
    """
    return _send(subject, demandeur.email, html)
