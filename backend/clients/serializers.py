from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = [
            'id', 'nom', 'prenom', 'email', 'telephone',
            'adresse', 'entreprise', 'note_fidelite',
            'date_inscription', 'actif',
        ]
        read_only_fields = ['id', 'date_inscription']


class ClientGeoSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Client
        geo_field = 'localisation'
        fields = [
            'id', 'nom', 'prenom', 'email', 'telephone',
            'adresse', 'entreprise', 'note_fidelite',
            'date_inscription', 'actif', 'localisation',
        ]
        read_only_fields = ['id', 'date_inscription']
