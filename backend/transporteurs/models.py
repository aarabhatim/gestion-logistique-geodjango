from django.contrib.gis.db import models


class Transporteur(models.Model):
    nom = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    telephone = models.CharField(max_length=20)
    adresse = models.TextField()
    localisation = models.PointField(null=True, blank=True, srid=4326)
    region_couverture = models.CharField(max_length=100, blank=True, default='')
    actif = models.BooleanField(default=True)
    date_inscription = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Transporteur"
        verbose_name_plural = "Transporteurs"
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Entrepot(models.Model):
    nom = models.CharField(max_length=100)
    adresse = models.TextField()
    localisation = models.PointField(srid=4326, null=True, blank=True)
    capacite_m2 = models.FloatField(default=0, help_text="Superficie en m²")
    responsable = models.CharField(max_length=100, blank=True)
    telephone = models.CharField(max_length=20, blank=True)
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Entrepôt"
        verbose_name_plural = "Entrepôts"
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
    COULEUR_CHOICES = [
        ('blanc', 'Blanc'),
        ('gris', 'Gris'),
        ('bleu', 'Bleu'),
        ('rouge', 'Rouge'),
        ('noir', 'Noir'),
        ('autre', 'Autre'),
    ]
    transporteur = models.ForeignKey(
        Transporteur, on_delete=models.CASCADE, related_name='vehicules'
    )
    immatriculation = models.CharField(max_length=20, unique=True)
    type_vehicule = models.CharField(max_length=20, choices=TYPE_CHOICES, default='camion')
    capacite_kg = models.FloatField(help_text="Capacité en kilogrammes")
    couleur = models.CharField(max_length=20, choices=COULEUR_CHOICES, default='blanc')
    annee_fabrication = models.IntegerField(null=True, blank=True)
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
    date_naissance = models.DateField(null=True, blank=True)
    note_moyenne = models.FloatField(default=5.0, help_text="Note sur 5")
    disponible = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Chauffeur"
        verbose_name_plural = "Chauffeurs"

    def __str__(self):
        return f"{self.prenom} {self.nom}"
