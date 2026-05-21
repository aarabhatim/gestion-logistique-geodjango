from django.conf import settings
from django.contrib.gis.db import models as gis_models
from django.db import models
from django.utils import timezone


class Fondateur(models.Model):
    CATEGORIE_CHOICES = [
        ('SUPERMARCHE', 'Supermarché'),
        ('BOUTIQUE', 'Boutique / Mode'),
        ('PHARMACIE', 'Pharmacie'),
        ('RESTAURATION', 'Restauration'),
        ('ELECTRONIQUE', 'Électronique'),
        ('AUTRE', 'Autre'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='fondateur_profile',
    )
    nom_boutique = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='boutiques/logos/', blank=True, null=True)
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES, default='AUTRE')

    adresse = models.CharField(max_length=500)
    ville = models.CharField(max_length=100, default='Casablanca')
    location = gis_models.PointField(srid=4326, null=True, blank=True)
    zone_livraison = gis_models.PolygonField(srid=4326, null=True, blank=True)
    rayon_livraison_km = models.FloatField(default=5.0)

    is_verified = models.BooleanField(default=False)
    is_open = models.BooleanField(default=True)
    horaires = models.JSONField(default=dict, blank=True)

    frais_livraison_base = models.DecimalField(max_digits=8, decimal_places=2, default=15.00)
    commande_minimum = models.DecimalField(max_digits=8, decimal_places=2, default=50.00)

    note_moyenne = models.FloatField(default=0.0)
    nombre_avis = models.IntegerField(default=0)
    nombre_commandes = models.IntegerField(default=0)

    document_verification = models.FileField(upload_to='boutiques/docs/', blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Fondateur'
        verbose_name_plural = 'Fondateurs'
        ordering = ['-date_creation']

    def __str__(self):
        return f'{self.nom_boutique} ({self.get_categorie_display()})'

    def update_note(self):
        from commandes.models import Avis
        avis = Avis.objects.filter(commande__fondateur=self, cible_type='FONDATEUR')
        if avis.exists():
            self.note_moyenne = round(avis.aggregate(models.Avg('note'))['note__avg'], 2)
            self.nombre_avis = avis.count()
            self.save(update_fields=['note_moyenne', 'nombre_avis'])


class ImageProduit(models.Model):
    produit = models.ForeignKey('Produit', on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='produits/images/')
    ordre = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['ordre']


class Produit(models.Model):
    CATEGORIE_CHOICES = [
        ('ALIMENTAIRE', 'Alimentaire'),
        ('BOISSONS', 'Boissons'),
        ('HYGIENE', 'Hygiène & Beauté'),
        ('ELECTRONIQUE', 'Électronique'),
        ('VETEMENTS', 'Vêtements'),
        ('MEDICAMENTS', 'Médicaments'),
        ('MAISON', 'Maison & Déco'),
        ('SPORT', 'Sport'),
        ('AUTRE', 'Autre'),
    ]

    fondateur = models.ForeignKey(Fondateur, on_delete=models.CASCADE, related_name='produits')
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    prix_promo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stock = models.IntegerField(default=0)
    stock_alerte = models.IntegerField(default=5)
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES, default='AUTRE')
    disponible = models.BooleanField(default=True)
    image_principale = models.ImageField(upload_to='produits/', blank=True, null=True)
    nombre_commandes = models.IntegerField(default=0)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Produit'
        verbose_name_plural = 'Produits'
        ordering = ['-date_creation']

    def __str__(self):
        return f'{self.nom} - {self.fondateur.nom_boutique}'

    @property
    def prix_effectif(self):
        return self.prix_promo if self.prix_promo else self.prix

    @property
    def en_stock(self):
        return self.stock > 0 and self.disponible

    @property
    def stock_faible(self):
        return self.stock <= self.stock_alerte


class CodePromo(models.Model):
    TYPE_CHOICES = [
        ('POURCENTAGE', 'Pourcentage (%)'),
        ('MONTANT', 'Montant fixe (MAD)'),
    ]

    fondateur = models.ForeignKey(Fondateur, on_delete=models.CASCADE, related_name='codes_promo')
    code = models.CharField(max_length=20, unique=True)
    type_reduction = models.CharField(max_length=15, choices=TYPE_CHOICES, default='POURCENTAGE')
    valeur = models.DecimalField(max_digits=8, decimal_places=2)
    montant_minimum = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    actif = models.BooleanField(default=True)
    usage_max = models.IntegerField(default=100)
    usage_count = models.IntegerField(default=0)
    date_debut = models.DateTimeField(default=timezone.now)
    date_fin = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Code Promo'
        verbose_name_plural = 'Codes Promo'

    def __str__(self):
        return f'{self.code} - {self.fondateur.nom_boutique}'

    @property
    def est_valide(self):
        if not self.actif:
            return False
        if self.usage_count >= self.usage_max:
            return False
        now = timezone.now()
        if now < self.date_debut:
            return False
        if self.date_fin and now > self.date_fin:
            return False
        return True

    def calculer_reduction(self, montant):
        if not self.est_valide or montant < self.montant_minimum:
            return 0
        if self.type_reduction == 'POURCENTAGE':
            return round(float(montant) * float(self.valeur) / 100, 2)
        return min(float(self.valeur), float(montant))


class FondateurMedia(models.Model):
    TYPES = [
        ('logo', 'Logo'),
        ('banniere', 'Banniere boutique'),
        ('photo', 'Photo boutique'),
    ]
    fondateur = models.ForeignKey(
        'Fondateur', on_delete=models.CASCADE, related_name='medias'
    )
    type = models.CharField(max_length=10, choices=TYPES, default='photo')
    image = models.ImageField(upload_to='boutiques/medias/')
    ordre = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['ordre', 'created_at']

    def __str__(self):
        return f"{self.fondateur} - {self.type}"
