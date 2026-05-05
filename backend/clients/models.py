from django.contrib.gis.db import models

class Client(models.Model):
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    telephone = models.CharField(max_length=20)
    adresse = models.TextField()
    # Point géographique (longitude, latitude)
    localisation = models.PointField(null=True, blank=True, srid=4326)
    date_inscription = models.DateTimeField(auto_now_add=True)
    actif = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Client"
        verbose_name_plural = "Clients"
        ordering = ['-date_inscription']

    def __str__(self):
        return f"{self.prenom} {self.nom}"
