from rest_framework import serializers
from .models import FavorisBoutique, FavorisProduit


class FavorisBoutiqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = FavorisBoutique
        fields = ['id', 'boutique_id', 'created_at']
        read_only_fields = ['id', 'created_at']


class FavorisProduitSerializer(serializers.ModelSerializer):
    class Meta:
        model = FavorisProduit
        fields = ['id', 'produit_id', 'created_at']
        read_only_fields = ['id', 'created_at']
