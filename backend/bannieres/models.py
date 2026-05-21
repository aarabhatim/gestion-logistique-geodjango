from django.db import models
from django.utils import timezone


class Banniere(models.Model):
    TYPES = [
        ('info', 'Information'),
        ('warning', 'Avertissement'),
        ('danger', 'Danger / Maintenance'),
        ('success', 'Succes'),
    ]
    ROLES_CIBLES = [
        ('all', 'Tous les utilisateurs'),
        ('ADMIN', 'Admins'),
        ('FONDATEUR', 'Fondateurs'),
        ('TRANSPORTEUR', 'Transporteurs'),
        ('CLIENT', 'Clients'),
    ]
    titre = models.CharField(max_length=150)
    message = models.TextField()
    type = models.CharField(max_length=10, choices=TYPES, default='info')
    role_cible = models.CharField(max_length=20, choices=ROLES_CIBLES, default='all')
    actif = models.BooleanField(default=True)
    date_debut = models.DateTimeField(default=timezone.now)
    date_fin = models.DateTimeField(null=True, blank=True)
    dismissible = models.BooleanField(default=True)
    lien_url = models.URLField(blank=True)
    lien_texte = models.CharField(max_length=60, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Banniere'
        verbose_name_plural = 'Bannieres'

    def __str__(self):
        return self.titre

    @property
    def est_active(self):
        if not self.actif:
            return False
        now = timezone.now()
        if self.date_fin and now > self.date_fin:
            return False
        return True
