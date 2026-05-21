from rest_framework import serializers
from .models import CompteFidelite, TransactionFidelite


class TransactionFideliteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransactionFidelite
        fields = ['id', 'type', 'points', 'raison', 'created_at']


class CompteFideliteSerializer(serializers.ModelSerializer):
    transactions = TransactionFideliteSerializer(many=True, read_only=True)
    reduction_disponible = serializers.ReadOnlyField()

    class Meta:
        model = CompteFidelite
        fields = ['id', 'points', 'total_points_gagnes', 'reduction_disponible', 'transactions', 'updated_at']
