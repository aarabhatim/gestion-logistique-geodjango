from django.contrib.gis.db import models
from django.contrib.auth.models import User
from transporteurs.models import Vehicule


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Administrateur'),
        ('client', 'Client'),
        ('chauffeur', 'Chauffeur'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='client')
    telephone = models.CharField(max_length=20, blank=True)
    avatar = models.CharField(max_length=255, blank=True, default='')
    date_inscription = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Profil Utilisateur"

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.role})"

    def is_admin(self):
        return self.role == 'admin'

    def is_client(self):
        return self.role == 'client'

    def is_chauffeur(self):
        return self.role == 'chauffeur'


class ClientProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='client_profile')
    entreprise = models.CharField(max_length=150, blank=True, default='')
    adresse = models.TextField(blank=True)
    note_fidelite = models.IntegerField(default=3)
    localisation = models.PointField(null=True, blank=True, srid=4326)

    class Meta:
        verbose_name = "Profil Client"

    def __str__(self):
        return f"Client: {self.user.get_full_name()}"


class ChauffeurProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='chauffeur_profile')
    vehicule = models.OneToOneField(
        Vehicule, on_delete=models.SET_NULL, null=True, blank=True, related_name='chauffeur_profile'
    )
    permis = models.CharField(max_length=30, blank=True)
    date_naissance = models.DateField(null=True, blank=True)
    note_moyenne = models.FloatField(default=5.0)
    disponible = models.BooleanField(default=True)
    # Position GPS actuelle du chauffeur
    position_actuelle = models.PointField(null=True, blank=True, srid=4326)
    derniere_position_maj = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Profil Chauffeur"

    def __str__(self):
        return f"Chauffeur: {self.user.get_full_name()}"
