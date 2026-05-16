from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.gis.geos import Point
from .models import Fondateur, Produit, ImageProduit, CodePromo


class ImageProduitSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImageProduit
        fields = ['id', 'image', 'ordre']


class ProduitSerializer(serializers.ModelSerializer):
    images = ImageProduitSerializer(many=True, read_only=True)
    prix_effectif = serializers.ReadOnlyField()
    en_stock = serializers.ReadOnlyField()
    stock_faible = serializers.ReadOnlyField()
    fondateur_nom = serializers.CharField(source='fondateur.nom_boutique', read_only=True)

    class Meta:
        model = Produit
        fields = [
            'id', 'fondateur', 'fondateur_nom', 'nom', 'description',
            'prix', 'prix_promo', 'prix_effectif',
            'stock', 'stock_alerte', 'stock_faible', 'en_stock',
            'categorie', 'disponible', 'image_principale', 'images',
            'nombre_commandes', 'date_creation',
        ]
        read_only_fields = ['fondateur', 'nombre_commandes']


class ProduitCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produit
        fields = [
            'nom', 'description', 'prix', 'prix_promo',
            'stock', 'stock_alerte', 'categorie', 'disponible', 'image_principale',
        ]

    def create(self, validated_data):
        validated_data['fondateur'] = self.context['fondateur']
        return super().create(validated_data)


class FondateurSerializer(serializers.ModelSerializer):
    longitude = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    nombre_produits = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)

    class Meta:
        model = Fondateur
        fields = [
            'id', 'user', 'user_email', 'user_phone',
            'nom_boutique', 'description', 'logo', 'categorie',
            'adresse', 'ville', 'latitude', 'longitude',
            'rayon_livraison_km',
            'is_verified', 'is_open', 'horaires',
            'frais_livraison_base', 'commande_minimum',
            'note_moyenne', 'nombre_avis', 'nombre_commandes', 'nombre_produits',
            'date_creation',
        ]
        read_only_fields = ['user', 'is_verified', 'note_moyenne', 'nombre_avis', 'nombre_commandes']

    def get_latitude(self, obj):
        return obj.location.y if obj.location else None

    def get_longitude(self, obj):
        return obj.location.x if obj.location else None

    def get_nombre_produits(self, obj):
        return obj.produits.filter(disponible=True).count()


class FondateurCreateUpdateSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(write_only=True, required=False)
    longitude = serializers.FloatField(write_only=True, required=False)

    class Meta:
        model = Fondateur
        fields = [
            'nom_boutique', 'description', 'logo', 'categorie',
            'adresse', 'ville', 'latitude', 'longitude',
            'rayon_livraison_km', 'is_open', 'horaires',
            'frais_livraison_base', 'commande_minimum',
            'document_verification',
        ]

    def create(self, validated_data):
        lat = validated_data.pop('latitude', None)
        lon = validated_data.pop('longitude', None)
        if lat and lon:
            validated_data['location'] = Point(lon, lat, srid=4326)
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        lat = validated_data.pop('latitude', None)
        lon = validated_data.pop('longitude', None)
        if lat and lon:
            instance.location = Point(lon, lat, srid=4326)
        return super().update(instance, validated_data)


class FondateurProximiteSerializer(serializers.ModelSerializer):
    """Serializer allégé pour la liste des fondateurs proches."""
    distance_km = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Fondateur
        fields = [
            'id', 'nom_boutique', 'logo', 'categorie',
            'adresse', 'ville', 'latitude', 'longitude',
            'note_moyenne', 'nombre_avis', 'is_open',
            'frais_livraison_base', 'commande_minimum',
            'rayon_livraison_km', 'distance_km',
        ]

    def get_distance_km(self, obj):
        if hasattr(obj, 'distance') and obj.distance:
            return round(obj.distance.km, 2)
        return None

    def get_latitude(self, obj):
        return obj.location.y if obj.location else None

    def get_longitude(self, obj):
        return obj.location.x if obj.location else None


class CodePromoSerializer(serializers.ModelSerializer):
    est_valide = serializers.ReadOnlyField()

    class Meta:
        model = CodePromo
        fields = [
            'id', 'code', 'type_reduction', 'valeur',
            'montant_minimum', 'actif', 'usage_max', 'usage_count',
            'date_debut', 'date_fin', 'est_valide',
        ]
        read_only_fields = ['usage_count']


class VerifierCodePromoSerializer(serializers.Serializer):
    code = serializers.CharField()
    montant = serializers.DecimalField(max_digits=10, decimal_places=2)
    fondateur_id = serializers.IntegerField()
