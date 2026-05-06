from django.db import models


class Notification(models.Model):
    TYPE_CHOICES = [
        ('info', 'Information'),
        ('success', 'Succès'),
        ('warning', 'Avertissement'),
        ('danger', 'Alerte'),
    ]

    titre = models.CharField(max_length=200)
    message = models.TextField()
    type_notif = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')
    lue = models.BooleanField(default=False)
    date_creation = models.DateTimeField(auto_now_add=True)
    # Lien optionnel vers une commande (référence)
    commande_ref = models.CharField(max_length=20, blank=True, default='')

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-date_creation']

    def __str__(self):
        return f"[{self.type_notif.upper()}] {self.titre}"
