from rest_framework import serializers
from .models import CampagnePromo


class CampagnePromoSerializer(serializers.ModelSerializer):
    est_valide = serializers.ReadOnlyField()
    taux_conversion = serializers.ReadOnlyField()

    class Meta:
        model = CampagnePromo
        fields = '__all__'
