from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    """Sérialiseur standard (JSON simple, sans GeoJSON) pour liste et CRUD."""
    lat = serializers.SerializerMethodField(read_only=True)
    lon = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'nom', 'prenom', 'email', 'telephone', 'adresse',
            'entreprise', 'note_fidelite', 'lat', 'lon',
            'date_inscription', 'actif',
        ]
        read_only_fields = ['id', 'date_inscription']

    def get_lat(self, obj):
        return obj.localisation.y if obj.localisation else None

    def get_lon(self, obj):
        return obj.localisation.x if obj.localisation else None


class ClientGeoSerializer(GeoFeatureModelSerializer):
    """Sérialiseur GeoJSON (pour les endpoints cartographiques)."""
    class Meta:
        model = Client
        geo_field = 'localisation'
        fields = '__all__'


class ClientDetailSerializer(ClientSerializer):
    """Sérialiseur étendu incluant l'historique des commandes."""
    historique_commandes = serializers.SerializerMethodField()

    class Meta(ClientSerializer.Meta):
        fields = ClientSerializer.Meta.fields + ['historique_commandes']

    def get_historique_commandes(self, obj):
        """Retourne les dernières commandes liées au compte User de ce client."""
        try:
            from commandes.models import Commande
            from django.contrib.auth import get_user_model
            User = get_user_model()
            # Chercher l'utilisateur ayant le même email
            try:
                user = User.objects.get(email=obj.email)
                commandes = Commande.objects.filter(client=user).order_by('-created_at')[:20]
                return [
                    {
                        'id': c.id,
                        'reference': getattr(c, 'reference', str(c.id)),
                        'statut': c.statut,
                        'montant_total': str(getattr(c, 'montant_total', 0)),
                        'created_at': c.created_at.isoformat() if hasattr(c, 'created_at') else None,
                    }
                    for c in commandes
                ]
            except User.DoesNotExist:
                return []
        except Exception:
            return []
