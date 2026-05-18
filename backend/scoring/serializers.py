from rest_framework import serializers
from .models import ScoreTransporteur


class ScoreTransporteurSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='transporteur.username', read_only=True)
    full_name = serializers.CharField(source='transporteur.get_full_name', read_only=True)
    vehicule_type = serializers.SerializerMethodField()
    photo_vehicule = serializers.SerializerMethodField()

    # Données radar chart
    radar = serializers.SerializerMethodField()

    class Meta:
        model = ScoreTransporteur
        fields = [
            'id', 'transporteur', 'username', 'full_name', 'vehicule_type', 'photo_vehicule',
            'score_global', 'score_ponctualite', 'score_fiabilite',
            'score_satisfaction', 'score_rapidite',
            'nb_livraisons_total', 'nb_livraisons_a_temps', 'nb_incidents',
            'note_moyenne_clients', 'temps_moyen_livraison_min',
            'derniere_mise_a_jour', 'radar',
        ]
        read_only_fields = fields

    def get_vehicule_type(self, obj):
        try:
            return obj.transporteur.transporteur_profile.get_vehicule_type_display()
        except Exception:
            return None

    def get_photo_vehicule(self, obj):
        try:
            request = self.context.get('request')
            photo = obj.transporteur.transporteur_profile.photo_vehicule
            if photo and request:
                return request.build_absolute_uri(photo.url)
            return None
        except Exception:
            return None

    def get_radar(self, obj):
        """Format prêt pour un radar chart (Recharts/Chart.js)."""
        return [
            {'dimension': 'Ponctualité', 'score': obj.score_ponctualite, 'poids': 30},
            {'dimension': 'Fiabilité',   'score': obj.score_fiabilite,   'poids': 30},
            {'dimension': 'Satisfaction','score': obj.score_satisfaction, 'poids': 25},
            {'dimension': 'Rapidité',    'score': obj.score_rapidite,     'poids': 15},
        ]
