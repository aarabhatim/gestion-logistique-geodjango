import uuid
from django.db import models
from django.conf import settings


class SessionGroupe(models.Model):
    STATUS_CHOICES = [
        ('OUVERTE', 'Ouverte'),
        ('VERROUILLEE', 'Verrouillée'),
        ('COMMANDEE', 'Commandée'),
        ('ANNULEE', 'Annulée'),
    ]
    code = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    createur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sessions_groupe_creees'
    )
    boutique_id = models.PositiveIntegerField()
    statut = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OUVERTE')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Session Groupe'
        verbose_name_plural = 'Sessions Groupe'

    def __str__(self):
        return f"Session {self.code} — {self.statut}"

    @property
    def lien_invitation(self):
        return f"/rejoindre-groupe/{self.code}"


class MembreGroupe(models.Model):
    session = models.ForeignKey(
        SessionGroupe,
        on_delete=models.CASCADE,
        related_name='membres'
    )
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sessions_groupe_rejointes'
    )
    rejoint_le = models.DateTimeField(auto_now_add=True)
    est_pret = models.BooleanField(default=False)

    class Meta:
        unique_together = ('session', 'utilisateur')
        verbose_name = 'Membre Groupe'

    def __str__(self):
        return f"{self.utilisateur} dans session {self.session.code}"


class ArticleGroupe(models.Model):
    """Un article ajouté par un membre à la session groupe."""
    session = models.ForeignKey(
        SessionGroupe,
        on_delete=models.CASCADE,
        related_name='articles'
    )
    membre = models.ForeignKey(
        MembreGroupe,
        on_delete=models.CASCADE,
        related_name='articles'
    )
    produit_id = models.PositiveIntegerField()
    nom_produit = models.CharField(max_length=255)
    quantite = models.PositiveIntegerField(default=1)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Article Groupe'

    @property
    def sous_total(self):
        return self.quantite * self.prix_unitaire
