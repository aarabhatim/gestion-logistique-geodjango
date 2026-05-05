from rest_framework_gis.serializers import GeoFeatureModelSerializer
from rest_framework import serializers
from .models import PositionVehicule

class PositionVehiculeSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = PositionVehicule
        geo_field = "position"
        fields = '__all__'
