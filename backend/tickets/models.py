from django.conf import settings
from django.db import models
from django.utils import timezone


class Ticket(models.Model):
    CATEGORIE_CHOICES = [
        ('reclamation', 'Réclamation'),
        ('assistance', 'Demande d\'assistance'),
        ('incident', 'Incident'),
        ('retard', 'Retard de livraison'),
        ('retour', 'Retour produit'),
        ('autre', 'Autre'),
    ]
    PRIORITE_CHOICES = [
        ('faible', 'Faible'),
        ('moyen', 'Moyen'),
        ('urgent', 'Urgent'),
    ]
    STATUT_CHOICES = [
        ('ouvert', 'Ouvert'),
        ('en_cours', 'En cours'),
        ('en_attente', 'En attente de réponse'),
        ('resolu', 'Résolu'),
        ('ferme', 'Fermé'),
    ]

    # ── Acteurs ───────────────────────────────────────────────────────────────
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='tickets_crees',
    )
    assigne_a = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='tickets_assignes',
        limit_choices_to={'role': 'ADMIN'},
    )

    # ── Contenu ───────────────────────────────────────────────────────────────
    titre = models.CharField(max_length=300)
    description = models.TextField()
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES, default='autre')
    priorite = models.CharField(max_length=10, choices=PRIORITE_CHOICES, default='moyen')
    statut = models.CharField(max_length=15, choices=STATUT_CHOICES, default='ouvert')

    # ── Relation optionnelle à une commande ───────────────────────────────────
    commande = models.ForeignKey(
        'commandes.Commande', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='tickets',
    )

    # ── SLA ───────────────────────────────────────────────────────────────────
    sla_heures = models.IntegerField(
        default=24,
        help_text="Délai de résolution attendu en heures"
    )
    sla_depasse = models.BooleanField(default=False)
    sla_alerte_envoyee = models.BooleanField(default=False)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolu_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Ticket'
        verbose_name_plural = 'Tickets'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['statut', 'priorite']),
            models.Index(fields=['auteur']),
        ]

    def __str__(self):
        return f"[{self.get_priorite_display().upper()}] #{self.pk} {self.titre}"

    @property
    def est_en_retard(self):
        if self.statut in ('resolu', 'ferme'):
            return False
        from datetime import timedelta
        deadline = self.created_at + timedelta(hours=self.sla_heures)
        return timezone.now() > deadline

    def verifier_sla(self):
        """Vérifie le SLA et envoie une alerte si dépassé."""
        if self.est_en_retard and not self.sla_alerte_envoyee:
            self.sla_depasse = True
            self.sla_alerte_envoyee = True
            self.save(update_fields=['sla_depasse', 'sla_alerte_envoyee'])
            # Notifier l'admin assigné ou tous les admins
            from django.contrib.auth import get_user_model
            from notifications.models import envoyer_notification
            User = get_user_model()
            destinataires = (
                [self.assigne_a] if self.assigne_a
                else list(User.objects.filter(role='ADMIN', is_active=True))
            )
            for admin in destinataires:
                envoyer_notification(
                    admin,
                    titre=f"⏰ SLA dépassé — Ticket #{self.pk}",
                    message=f"Le ticket '{self.titre}' (priorité {self.get_priorite_display()}) "
                            f"dépasse son délai de {self.sla_heures}h.",
                    type_notif='WARNING',
                )


class TicketMessage(models.Model):
    """Message/réponse dans le thread d'un ticket."""
    ticket = models.ForeignKey(
        Ticket, on_delete=models.CASCADE, related_name='messages'
    )
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='ticket_messages',
    )
    contenu = models.TextField()
    is_note_interne = models.BooleanField(
        default=False,
        help_text="Note visible uniquement par les admins"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # Pièce jointe optionnelle
    piece_jointe = models.FileField(
        upload_to='tickets/pieces_jointes/', null=True, blank=True
    )

    class Meta:
        verbose_name = 'Message ticket'
        verbose_name_plural = 'Messages tickets'
        ordering = ['created_at']

    def __str__(self):
        return f"Message #{self.pk} de {self.auteur.username} sur Ticket #{self.ticket.pk}"
