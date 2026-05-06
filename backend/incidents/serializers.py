from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Incident


class IncidentSerializer(GeoFeatureModelSerializer):
    commande_reference = serializers.CharField(source='commande.reference', read_only=True)
    type_incident_display = serializers.CharField(source='get_type_incident_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = Incident
        geo_field = 'position'
        fields = '__all__'
