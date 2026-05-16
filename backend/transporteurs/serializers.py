from rest_framework import serializers
from .models import Transporteur


class TransporteurSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    est_actif = serializers.ReadOnlyField()
    minutes_session_courante = serializers.ReadOnlyField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Transporteur
        fields = [
            'id', 'user', 'nom_complet', 'user_first_name', 'user_last_name',
            'user_email', 'email', 'phone',
            'vehicule_type', 'plaque', 'capacite_kg', 'couleur_vehicule', 'photo_vehicule',
            'is_verified', 'is_available', 'is_on_delivery', 'est_actif',
            'latitude', 'longitude', 'derniere_maj_position',
            'note_moyenne', 'nombre_avis', 'nombre_livraisons', 'revenus_total',
            'heure_debut_disponibilite', 'minutes_session_courante',
            'minutes_travaillees_aujourd_hui', 'minutes_travaillees_semaine', 'minutes_travaillees_mois',
            'date_inscription',
        ]
        read_only_fields = ['user', 'is_verified', 'note_moyenne', 'nombre_avis',
                            'nombre_livraisons', 'revenus_total', 'est_actif']

    def get_nom_complet(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_latitude(self, obj):
        return obj.position_actuelle.y if obj.position_actuelle else None

    def get_longitude(self, obj):
        return obj.position_actuelle.x if obj.position_actuelle else None


class TransporteurOnboardingSerializer(serializers.ModelSerializer):
    """Création du profil transporteur lors de l'onboarding."""
    class Meta:
        model = Transporteur
        fields = [
            'vehicule_type', 'plaque', 'capacite_kg', 'couleur_vehicule',
            'photo_vehicule', 'permis_conduire', 'assurance',
        ]

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class TransporteurDashboardSerializer(serializers.ModelSerializer):
    """Dashboard conducteur — données financières et stats."""
    nom_complet = serializers.SerializerMethodField()
    revenus_jour = serializers.SerializerMethodField()
    revenus_semaine = serializers.SerializerMethodField()
    revenus_mois = serializers.SerializerMethodField()

    minutes_session_courante = serializers.ReadOnlyField()

    class Meta:
        model = Transporteur
        fields = [
            'id', 'nom_complet', 'vehicule_type', 'plaque',
            'is_available', 'is_on_delivery', 'is_verified',
            'note_moyenne', 'nombre_avis', 'nombre_livraisons',
            'revenus_total', 'revenus_jour', 'revenus_semaine', 'revenus_mois',
            'heure_debut_disponibilite', 'minutes_session_courante',
            'minutes_travaillees_aujourd_hui', 'minutes_travaillees_semaine', 'minutes_travaillees_mois',
        ]

    def get_nom_complet(self, obj):
        return obj.user.get_full_name()

    def _revenus_periode(self, obj, depuis):
        from django.utils import timezone
        from livraisons.models import Livraison
        from django.db.models import Sum
        total = Livraison.objects.filter(
            transporteur=obj,
            date_livraison__gte=depuis,
            statut_livraison='LIVREE',
        ).aggregate(total=Sum('gain_transporteur'))['total']
        return float(total or 0)

    def get_revenus_jour(self, obj):
        from django.utils import timezone
        return self._revenus_periode(obj, timezone.now().replace(hour=0, minute=0, second=0))

    def get_revenus_semaine(self, obj):
        from django.utils import timezone
        import datetime
        aujourd_hui = timezone.now().date()
        debut_semaine = aujourd_hui - datetime.timedelta(days=aujourd_hui.weekday())
        return self._revenus_periode(obj, debut_semaine)

    def get_revenus_mois(self, obj):
        from django.utils import timezone
        debut_mois = timezone.now().replace(day=1, hour=0, minute=0, second=0)
        return self._revenus_periode(obj, debut_mois)


class TransporteurDisponibleSerializer(serializers.ModelSerializer):
    """Liste des transporteurs disponibles dans une zone — pour le matching."""
    distance_km = serializers.SerializerMethodField()
    nom_complet = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Transporteur
        fields = [
            'id', 'nom_complet', 'vehicule_type', 'capacite_kg',
            'note_moyenne', 'latitude', 'longitude', 'distance_km',
        ]

    def get_distance_km(self, obj):
        if hasattr(obj, 'distance') and obj.distance:
            return round(obj.distance.km, 2)
        return None

    def get_nom_complet(self, obj):
        return obj.user.get_full_name()

    def get_latitude(self, obj):
        return obj.position_actuelle.y if obj.position_actuelle else None

    def get_longitude(self, obj):
        return obj.position_actuelle.x if obj.position_actuelle else None
