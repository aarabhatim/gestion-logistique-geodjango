from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'titre', 'message', 'type_notif', 'lue', 'commande_id', 'date_creation']
        read_only_fields = ['date_creation']
