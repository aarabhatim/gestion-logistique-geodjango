"""
Celery periodic tasks for DeliverMap.

Register in settings.py CELERY_BEAT_SCHEDULE (already done below),
or via django-celery-beat DatabaseScheduler from the admin.

Tasks:
  - verifier_expirations_contrats  : daily at 08:00 -- marks expired contrats
  - alertes_retard_livraisons      : every 15 min   -- notifies on late deliveries
  - nettoyer_notifications         : weekly Sunday  -- purges old read notifications
"""
from celery import shared_task
from django.utils import timezone
from datetime import timedelta


# ── Contrats : expiration automatique ────────────────────────────────────────

@shared_task(name='tasks.verifier_expirations_contrats')
def verifier_expirations_contrats():
    """
    Marque comme EXPIRE tout contrat dont la date_fin est depassee
    et dont le statut est encore ACTIF.
    Returns the number of contracts expired.
    """
    from contrats.models import Contrat
    from notifications.models import envoyer_notification

    now = timezone.now().date()
    expires = Contrat.objects.filter(statut='actif', date_fin__lt=now)
    count = 0
    for contrat in expires:
        contrat.statut = 'expire'
        contrat.save(update_fields=['statut'])
        count += 1
        # Notify the fondateur
        try:
            fondateur_user = contrat.fondateur.user if contrat.fondateur else None
            if fondateur_user:
                envoyer_notification(
                    fondateur_user,
                    titre=f"Contrat #{contrat.pk} expire",
                    message=f"Le contrat avec {contrat.transporteur} a expire le {contrat.date_fin}.",
                    type_notif='WARNING',
                )
        except Exception:
            pass
        # Notify admin
        from django.contrib.auth import get_user_model
        User = get_user_model()
        for admin in User.objects.filter(role='ADMIN', is_active=True):
            envoyer_notification(
                admin,
                titre=f"Contrat #{contrat.pk} expire",
                message=f"Le contrat #{contrat.pk} a expire automatiquement.",
                type_notif='WARNING',
            )
    return f"{count} contrat(s) expires"


# ── Livraisons : alertes retard ───────────────────────────────────────────────

@shared_task(name='tasks.alertes_retard_livraisons')
def alertes_retard_livraisons():
    """
    Detecte les commandes EN_ROUTE depuis plus de 3h sans etre livrees
    et envoie une alerte aux admins.
    Returns the number of alerts sent.
    """
    from commandes.models import Commande
    from notifications.models import envoyer_notification
    from django.contrib.auth import get_user_model

    User = get_user_model()
    seuil = timezone.now() - timedelta(hours=3)
    retards = Commande.objects.filter(
        statut='EN_ROUTE',
        updated_at__lte=seuil,
    ).select_related('client', 'transporteur', 'fondateur')

    count = 0
    for commande in retards:
        # Avoid spamming: only alert once per hour (check last notification)
        from notifications.models import Notification
        deja_notifie = Notification.objects.filter(
            titre__contains=f"Retard #{commande.pk}",
            created_at__gte=timezone.now() - timedelta(hours=1),
        ).exists()
        if deja_notifie:
            continue

        admins = User.objects.filter(role='ADMIN', is_active=True)
        for admin in admins:
            envoyer_notification(
                admin,
                titre=f"Retard #{commande.pk} -- livraison en cours",
                message=(
                    f"La commande #{commande.pk} est en route depuis plus de 3h. "
                    f"Transporteur : {commande.transporteur}."
                ),
                type_notif='WARNING',
                commande_id=commande.pk,
            )
        count += 1
    return f"{count} alerte(s) retard envoyee(s)"


# ── Notifications : nettoyage hebdomadaire ────────────────────────────────────

@shared_task(name='tasks.nettoyer_notifications')
def nettoyer_notifications():
    """
    Supprime les notifications lues de plus de 30 jours.
    Returns the number of notifications deleted.
    """
    from notifications.models import Notification

    seuil = timezone.now() - timedelta(days=30)
    qs = Notification.objects.filter(lue=True, date_creation__lte=seuil)
    count, _ = qs.delete()
    return f"{count} notification(s) supprimee(s)"


# ── SLA tickets : alerte depassement ─────────────────────────────────────────

@shared_task(name='tasks.alertes_sla_tickets')
def alertes_sla_tickets():
    """
    Detecte les tickets dont le SLA est depasse (non resolus) et notifie les admins.
    """
    from tickets.models import Ticket
    from notifications.models import envoyer_notification
    from django.contrib.auth import get_user_model

    User = get_user_model()
    now = timezone.now()
    tickets_en_retard = []

    for ticket in Ticket.objects.exclude(statut__in=['resolu', 'ferme']).select_related('auteur', 'assigne_a'):
        sla_deadline = ticket.created_at + timedelta(hours=ticket.sla_heures)
        if now > sla_deadline:
            tickets_en_retard.append(ticket)

    admins = User.objects.filter(role='ADMIN', is_active=True)
    count = 0
    for ticket in tickets_en_retard:
        for admin in admins:
            # Only alert once per 2h
            from notifications.models import Notification
            deja = Notification.objects.filter(
                destinataire=admin,
                titre__contains=f"SLA #{ticket.pk}",
                created_at__gte=now - timedelta(hours=2),
            ).exists()
            if not deja:
                envoyer_notification(
                    admin,
                    titre=f"SLA depasse -- Ticket #{ticket.pk}",
                    message=f"Le ticket '{ticket.titre}' ({ticket.get_priorite_display()}) a depasse son SLA de {ticket.sla_heures}h.",
                    type_notif='WARNING',
                )
                count += 1
    return f"{count} alerte(s) SLA envoyee(s)"


@shared_task(name='tasks.detecter_immobilite_chauffeurs')
def detecter_immobilite_chauffeurs():
    """Alerte si un chauffeur est immobile depuis 15+ min en mission."""
    from tracking.models import PositionVehicule
    from commandes.models import Commande
    from notifications.models import Notification
    from django.contrib.auth import get_user_model
    from django.utils import timezone
    from datetime import timedelta
    User = get_user_model()
    seuil = timezone.now() - timedelta(minutes=15)

    # Commandes en route
    commandes_actives = Commande.objects.filter(statut='EN_ROUTE')
    for cmd in commandes_actives:
        if cmd.transporteur_assigne is None:
            continue
        # Verifier derniere position
        last_pos = PositionVehicule.objects.filter(
            commande=cmd
        ).order_by('-horodatage').first()
        if last_pos and last_pos.horodatage < seuil:
            try:
                transporteur_user = cmd.transporteur_assigne.user
                admins = User.objects.filter(role='ADMIN')
                for admin in admins:
                    Notification.objects.get_or_create(
                        destinataire=admin,
                        type_notif='WARNING',
                        message=f"Chauffeur {transporteur_user.get_full_name() or transporteur_user.email} immobile depuis 15+ min (cmd #{cmd.reference})",
                        defaults={'lue': False},
                    )
            except Exception:
                pass
