from rest_framework import serializers
from .models import Contrat


class ContratSerializer(serializers.ModelSerializer):
    boutique_nom = serializers.CharField(source='boutique.nom_boutique', read_only=True, allow_null=True)
    client_nom = serializers.CharField(source='client.get_full_name', read_only=True, allow_null=True)
    transporteur_nom = serializers.CharField(source='transporteur.get_full_name', read_only=True, allow_null=True)
    commande_reference = serializers.CharField(source='commande.reference', read_only=True, allow_null=True)
    type_service_display = serializers.CharField(source='get_type_service_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    jours_avant_expiration = serializers.IntegerField(read_only=True)
    expiration_imminente = serializers.BooleanField(read_only=True)
    fichier_pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Contrat
        fields = [
            'id', 'titre', 'type_service', 'type_service_display',
            'boutique', 'boutique_nom', 'client', 'client_nom',
            'transporteur', 'transporteur_nom', 'commande', 'commande_reference', 'cree_par',
            'tarif_negocie', 'description_termes',
            'date_debut', 'date_fin', 'statut', 'statut_display',
            'jours_avant_expiration', 'expiration_imminente',
            'fichier_pdf', 'fichier_pdf_url',
            'created_at', 'updated_at', 'signe_at',
        ]
        read_only_fields = ['cree_par', 'fichier_pdf', 'created_at', 'updated_at', 'signe_at']

    def get_fichier_pdf_url(self, obj):
        request = self.context.get('request')
        if obj.fichier_pdf and request:
            return request.build_absolute_uri(obj.fichier_pdf.url)
        return None
