from django.contrib.gis.geos import Point
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Incident, IncidentPhoto


class IncidentPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentPhoto
        fields = ['id', 'image', 'legende', 'uploaded_at']
        read_only_fields = ['uploaded_at']


class IncidentSerializer(GeoFeatureModelSerializer):
    commande_reference = serializers.CharField(source='commande.reference', read_only=True)
    type_incident_display = serializers.CharField(source='get_type_incident_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    photos = IncidentPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = Incident
        geo_field = 'position'
        fields = '__all__'

    def create(self, validated_data):
        request = self.context.get('request')
        if request and not validated_data.get('position'):
            lat = request.data.get('latitude')
            lon = request.data.get('longitude')
            if lat and lon:
                try:
                    validated_data['position'] = Point(float(lon), float(lat), srid=4326)
                except (TypeError, ValueError):
                    pass
        return super().create(validated_data)


class IncidentListSerializer(serializers.ModelSerializer):
    """Serializer leger pour les listes (sans GeoJSON complet)."""
    commande_reference = serializers.CharField(source='commande.reference', read_only=True)
    type_incident_display = serializers.CharField(source='get_type_incident_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    nb_photos = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = [
            'id', 'commande', 'commande_reference', 'type_incident', 'type_incident_display',
            'statut', 'statut_display', 'description', 'date_signalement', 'date_resolution',
            'notes_resolution', 'nb_photos', 'latitude', 'longitude',
        ]

    def get_nb_photos(self, obj):
        return obj.photos.count()

    def get_latitude(self, obj):
        return obj.position.y if obj.position else None

    def get_longitude(self, obj):
        return obj.position.x if obj.position else None
