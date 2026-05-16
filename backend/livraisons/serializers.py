from rest_framework import serializers
from .models import Livraison

class LivraisonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Livraison
        fields = ('id', 'commande', 'transporteur', 'trace_itineraire', 'depart', 'arrivee', 'distance_km', 'duree_estimee_min', 'statut_livraison', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')
