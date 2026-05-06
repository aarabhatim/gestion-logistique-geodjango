from rest_framework_gis.serializers import GeoFeatureModelSerializer
from rest_framework import serializers
from .models import Transporteur, Vehicule, Chauffeur, Entrepot


class TransporteurSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Transporteur
        geo_field = "localisation"
        fields = '__all__'


class EntrepotSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Entrepot
        geo_field = "localisation"
        fields = '__all__'


class VehiculeSerializer(serializers.ModelSerializer):
    transporteur_nom = serializers.CharField(source='transporteur.nom', read_only=True)

    class Meta:
        model = Vehicule
        fields = '__all__'


class ChauffeurSerializer(serializers.ModelSerializer):
    transporteur_nom = serializers.CharField(source='transporteur.nom', read_only=True)
    vehicule_immat = serializers.CharField(source='vehicule.immatriculation', read_only=True)

    class Meta:
        model = Chauffeur
        fields = '__all__'
