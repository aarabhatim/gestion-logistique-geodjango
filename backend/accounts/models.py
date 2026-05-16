from django.contrib.auth.models import AbstractUser
from django.contrib.gis.db import models as gis_models
from django.db import models


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('ADMIN', 'Administrateur'),
        ('CLIENT', 'Client'),
        ('TRANSPORTEUR', 'Transporteur'),
        ('FONDATEUR', 'Fondateur de boutique'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CLIENT')
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    location = gis_models.PointField(null=True, blank=True, srid=4326)
    is_banned = models.BooleanField(default=False)
    bio = models.TextField(blank=True)
    adresses_sauvegardees = models.JSONField(default=list, blank=True)

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        ordering = ['-date_joined']

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.role})'

    @property
    def is_admin_role(self):
        return self.role == 'ADMIN'

    @property
    def is_client_role(self):
        return self.role == 'CLIENT'

    @property
    def is_transporteur_role(self):
        return self.role == 'TRANSPORTEUR'

    @property
    def is_fondateur_role(self):
        return self.role == 'FONDATEUR'
