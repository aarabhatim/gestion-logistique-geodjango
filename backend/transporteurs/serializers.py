from rest_framework import serializers
from .models import Transporteur

class TransporteurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transporteur
        fields = ('id', 'vehicule_type', 'capacite_kg', 'plaque', 'is_available', 'position_actuelle', 'is_verified', 'note_moyenne')
        read_only_fields = ('id', 'is_verified', 'note_moyenne')
