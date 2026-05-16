from rest_framework import serializers
from rest_framework_gis.fields import GeometryField
from .models import Livraison, PositionTracking


class PositionTrackingSerializer(serializers.ModelSerializer):
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = PositionTracking
        fields = ['id', 'latitude', 'longitude', 'vitesse_kmh', 'timestamp']

    def get_latitude(self, obj):
        return obj.point.y if obj.point else None

    def get_longitude(self, obj):
        return obj.point.x if obj.point else None


class LivraisonSerializer(serializers.ModelSerializer):
    positions_recentes = PositionTrackingSerializer(source='positions', many=True, read_only=True)
    commande_reference = serializers.CharField(source='commande.reference', read_only=True)
    transporteur_nom = serializers.SerializerMethodField()
    depart_lat = serializers.SerializerMethodField()
    depart_lon = serializers.SerializerMethodField()
    arrivee_lat = serializers.SerializerMethodField()
    arrivee_lon = serializers.SerializerMethodField()
    trace_geojson = serializers.SerializerMethodField()

    class Meta:
        model = Livraison
        fields = [
            'id', 'commande', 'commande_reference',
            'transporteur', 'transporteur_nom',
            'depart_lat', 'depart_lon', 'arrivee_lat', 'arrivee_lon', 'trace_geojson',
            'distance_km', 'duree_estimee_min', 'eta',
            'statut_livraison', 'date_debut', 'date_livraison',
            'gain_transporteur', 'commission_plateforme',
            'code_confirmation',
            'positions_recentes',
        ]
        read_only_fields = ['gain_transporteur', 'commission_plateforme']

    def get_transporteur_nom(self, obj):
        if obj.transporteur:
            return obj.transporteur.user.get_full_name()
        return None

    def get_depart_lat(self, obj):
        return obj.depart.y if obj.depart else None

    def get_depart_lon(self, obj):
        return obj.depart.x if obj.depart else None

    def get_arrivee_lat(self, obj):
        return obj.arrivee.y if obj.arrivee else None

    def get_arrivee_lon(self, obj):
        return obj.arrivee.x if obj.arrivee else None

    def get_trace_geojson(self, obj):
        if obj.trace_itineraire:
            return obj.trace_itineraire.geojson
        return None


class PositionUpdateSerializer(serializers.Serializer):
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    vitesse_kmh = serializers.FloatField(default=0)
    livraison_id = serializers.IntegerField(required=False)
