from django.contrib.gis.db import models

class Transporteur(models.Model):
    nom = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    telephone = models.CharField(max_length=20)
    adresse = models.TextField()
    localisation = models.PointField(null=True, blank=True, srid=4326)
    actif = models.BooleanField(default=True)
    date_inscription = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Transporteur"
        verbose_name_plural = "Transporteurs"
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Vehicule(models.Model):
    TYPE_CHOICES = [
        ('camion', 'Camion'),
        ('fourgon', 'Fourgon'),
        ('moto', 'Moto'),
        ('voiture', 'Voiture'),
    ]
    transporteur = models.ForeignKey(
        Transporteur, on_delete=models.CASCADE, related_name='vehicules'
    )
    immatriculation = models.CharField(max_length=20, unique=True)
    type_vehicule = models.CharField(max_length=20, choices=TYPE_CHOICES, default='camion')
    capacite_kg = models.FloatField(help_text="Capacité en kilogrammes")
    disponible = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Véhicule"
        verbose_name_plural = "Véhicules"

    def __str__(self):
        return f"{self.immatriculation} ({self.get_type_vehicule_display()})"


class Chauffeur(models.Model):
    transporteur = models.ForeignKey(
        Transporteur, on_delete=models.CASCADE, related_name='chauffeurs'
    )
    vehicule = models.OneToOneField(
        Vehicule, on_delete=models.SET_NULL, null=True, blank=True, related_name='chauffeur'
    )
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    telephone = models.CharField(max_length=20)
    permis = models.CharField(max_length=30)
    disponible = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Chauffeur"
        verbose_name_plural = "Chauffeurs"

    def __str__(self):
        return f"{self.prenom} {self.nom}"
