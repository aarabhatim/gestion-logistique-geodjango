from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import ZoneLivraison


class ZoneLivraisonSerializer(serializers.ModelSerializer):
    transporteurs_count = serializers.SerializerMethodField()

    class Meta:
        model = ZoneLivraison
        fields = ['id', 'nom', 'description', 'polygone', 'tarif_base',
                  'tarif_km_supplementaire', 'transporteurs', 'actif',
                  'couleur', 'transporteurs_count', 'created_at']

    def get_transporteurs_count(self, obj):
        return obj.transporteurs.count()


class ZoneLivraisonGeoSerializer(GeoFeatureModelSerializer):
    transporteurs_count = serializers.SerializerMethodField()

    class Meta:
        model = ZoneLivraison
        geo_field = 'polygone'
        fields = ['id', 'nom', 'description', 'tarif_base',
                  'tarif_km_supplementaire', 'actif', 'couleur',
                  'transporteurs_count']

    def get_transporteurs_count(self, obj):
        return obj.transporteurs.count()
