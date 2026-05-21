from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class AdresseBlacklist(models.Model):
    RAISONS = [
        ('fraude', 'Fraude / Arnaque'),
        ('inaccessible', 'Adresse inaccessible'),
        ('client_abusif', 'Client abusif'),
        ('zone_dangereuse', 'Zone dangereuse'),
        ('autre', 'Autre'),
    ]
    adresse = models.CharField(max_length=300)
    ville = models.CharField(max_length=100, blank=True)
    raison = models.CharField(max_length=20, choices=RAISONS, default='autre')
    description = models.TextField(blank=True)
    actif = models.BooleanField(default=True)
    ajoutee_par = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='blacklists'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Adresse blacklistee'
        verbose_name_plural = 'Adresses blacklistees'

    def __str__(self):
        return f'{self.adresse} ({self.raison})'
