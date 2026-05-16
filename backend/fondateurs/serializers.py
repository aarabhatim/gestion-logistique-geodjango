from rest_framework import serializers
from .models import Fondateur, Produit, ProduitImage, CodePromo

class ProduitImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProduitImage
        fields = ('id', 'image')

class ProduitSerializer(serializers.ModelSerializer):
    images = ProduitImageSerializer(many=True, read_only=True)

    class Meta:
        model = Produit
        fields = ('id', 'nom', 'description', 'prix', 'stock', 'categorie', 'disponible', 'images')
        read_only_fields = ('id',)

    def create(self, validated_data):
        # We assume fondateur is set by the view using request.user.fondateur_profile
        return super().create(validated_data)

class CodePromoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodePromo
        fields = '__all__'
        read_only_fields = ('id', 'usage_actuel', 'created_at', 'fondateur')

class FondateurSerializer(serializers.ModelSerializer):
    produits = ProduitSerializer(many=True, read_only=True)
    codes_promo = CodePromoSerializer(many=True, read_only=True)

    class Meta:
        model = Fondateur
        fields = ('id', 'nom_boutique', 'logo', 'categorie', 'adresse', 'location', 'zone_livraison', 'is_verified', 'produits', 'codes_promo')
        read_only_fields = ('id', 'is_verified')
