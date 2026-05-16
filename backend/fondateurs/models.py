from django.contrib.gis.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class Fondateur(models.Model):
    class Categorie(models.TextChoices):
        SUPERMARCHE = 'SUPERMARCHE', _('Supermarché')
        BOUTIQUE = 'BOUTIQUE', _('Boutique')
        PHARMACIE = 'PHARMACIE', _('Pharmacie')
        AUTRE = 'AUTRE', _('Autre')

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='fondateur_profile')
    nom_boutique = models.CharField(max_length=200)
    logo = models.ImageField(upload_to='fondateurs/logos/', null=True, blank=True)
    categorie = models.CharField(max_length=20, choices=Categorie.choices, default=Categorie.AUTRE)
    adresse = models.TextField()
    location = models.PointField(srid=4326, null=True, blank=True)
    zone_livraison = models.PolygonField(srid=4326, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Fondateur'
        verbose_name_plural = 'Fondateurs'

    def __str__(self):
        return self.nom_boutique

class Produit(models.Model):
    fondateur = models.ForeignKey(Fondateur, on_delete=models.CASCADE, related_name='produits')
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    categorie = models.CharField(max_length=50, blank=True)
    disponible = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Produit'
        verbose_name_plural = 'Produits'

    def __str__(self):
        return f"{self.nom} - {self.fondateur.nom_boutique}"

class ProduitImage(models.Model):
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='produits/images/')
    
    def __str__(self):
        return f"Image for {self.produit.nom}"

class CodePromo(models.Model):
    class TypeRemise(models.TextChoices):
        POURCENTAGE = 'POURCENTAGE', _('Pourcentage (%)')
        FIXE = 'FIXE', _('Montant fixe')

    fondateur = models.ForeignKey(Fondateur, on_delete=models.CASCADE, related_name='codes_promo')
    code = models.CharField(max_length=20, unique=True)
    type_remise = models.CharField(max_length=20, choices=TypeRemise.choices, default=TypeRemise.POURCENTAGE)
    valeur = models.DecimalField(max_digits=10, decimal_places=2)
    date_debut = models.DateTimeField()
    date_fin = models.DateTimeField()
    usage_max = models.IntegerField(null=True, blank=True)
    usage_actuel = models.IntegerField(default=0)
    actif = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Code Promo'
        verbose_name_plural = 'Codes Promo'

    def __str__(self):
        return f"{self.code} - {self.fondateur.nom_boutique}"
