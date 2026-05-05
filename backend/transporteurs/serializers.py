from rest_framework_gis.serializers import GeoFeatureModelSerializer
from rest_framework import serializers
from .models import Transporteur, Vehicule, Chauffeur

class TransporteurSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Transporteur
        geo_field = "localisation"
        fields = '__all__'

class VehiculeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicule
        fields = '__all__'

class ChauffeurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chauffeur
        fields = '__all__'
