from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Commande

class CommandeSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Commande
        geo_field = "point_destination"  # We use one of the point fields as the primary geometry for GeoJSON output
        fields = '__all__'
