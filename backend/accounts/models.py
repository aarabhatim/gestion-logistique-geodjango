from django.contrib.auth.models import AbstractUser
from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', _('Admin')
        CLIENT = 'CLIENT', _('Client')
        TRANSPORTEUR = 'TRANSPORTEUR', _('Transporteur')
        FONDATEUR = 'FONDATEUR', _('Fondateur')

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CLIENT,
        help_text=_('Rôle de l\'utilisateur sur la plateforme')
    )
    phone = models.CharField(max_length=20, blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    location = models.PointField(srid=4326, null=True, blank=True, help_text=_('Dernière position connue ou adresse principale'))

    class Meta:
        verbose_name = _('Utilisateur')
        verbose_name_plural = _('Utilisateurs')

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
