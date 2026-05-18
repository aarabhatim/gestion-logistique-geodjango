from rest_framework import serializers
from .models import Ticket, TicketMessage


class TicketMessageSerializer(serializers.ModelSerializer):
    auteur_username = serializers.CharField(source='auteur.username', read_only=True)
    auteur_role = serializers.CharField(source='auteur.role', read_only=True)
    auteur_nom = serializers.CharField(source='auteur.get_full_name', read_only=True)

    class Meta:
        model = TicketMessage
        fields = [
            'id', 'ticket', 'auteur', 'auteur_username', 'auteur_role', 'auteur_nom',
            'contenu', 'is_note_interne', 'piece_jointe', 'created_at',
        ]
        read_only_fields = ['auteur', 'created_at']


class TicketSerializer(serializers.ModelSerializer):
    auteur_username = serializers.CharField(source='auteur.username', read_only=True)
    auteur_role = serializers.CharField(source='auteur.role', read_only=True)
    assigne_a_username = serializers.CharField(source='assigne_a.username', read_only=True, allow_null=True)
    categorie_display = serializers.CharField(source='get_categorie_display', read_only=True)
    priorite_display = serializers.CharField(source='get_priorite_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    est_en_retard = serializers.BooleanField(read_only=True)
    nb_messages = serializers.SerializerMethodField()
    commande_reference = serializers.CharField(source='commande.reference', read_only=True, allow_null=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'titre', 'description', 'categorie', 'categorie_display',
            'priorite', 'priorite_display', 'statut', 'statut_display',
            'auteur', 'auteur_username', 'auteur_role',
            'assigne_a', 'assigne_a_username',
            'commande', 'commande_reference',
            'sla_heures', 'sla_depasse', 'est_en_retard',
            'created_at', 'updated_at', 'resolu_at', 'nb_messages',
        ]
        read_only_fields = ['auteur', 'sla_depasse', 'sla_alerte_envoyee', 'resolu_at', 'created_at', 'updated_at']

    def get_nb_messages(self, obj):
        return obj.messages.count()


class TicketDetailSerializer(TicketSerializer):
    """Ticket avec tous ses messages."""
    messages = serializers.SerializerMethodField()

    class Meta(TicketSerializer.Meta):
        fields = TicketSerializer.Meta.fields + ['messages']

    def get_messages(self, obj):
        request = self.context.get('request')
        qs = obj.messages.all()
        # Cacher les notes internes aux non-admins
        if request and getattr(request.user, 'role', '') not in ('ADMIN',):
            qs = qs.filter(is_note_interne=False)
        return TicketMessageSerializer(qs, many=True, context=self.context).data
