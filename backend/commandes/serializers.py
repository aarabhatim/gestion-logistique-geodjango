from rest_framework import serializers
from .models import Commande, CommandeProduit, Avis
from fondateurs.serializers import ProduitSerializer
from transporteurs.serializers import TransporteurSerializer

class CommandeProduitSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommandeProduit
        fields = ('id', 'produit', 'quantite', 'prix_unitaire')

class CommandeSerializer(serializers.ModelSerializer):
    produits_commande = CommandeProduitSerializer(many=True, read_only=True)

    class Meta:
        model = Commande
        fields = ('id', 'client', 'fondateur', 'transporteur', 'statut', 'adresse_livraison', 'location_livraison', 'created_at', 'estimated_delivery', 'total_price', 'produits_commande')
        read_only_fields = ('id', 'created_at', 'client')

class AvisSerializer(serializers.ModelSerializer):
    class Meta:
        model = Avis
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'auteur')
