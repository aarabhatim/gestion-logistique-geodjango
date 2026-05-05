from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Client

class ClientSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Client
        geo_field = "localisation"
        fields = '__all__'
