from rest_framework import serializers
from .models import Banniere


class BanniereSerializer(serializers.ModelSerializer):
    est_active = serializers.ReadOnlyField()

    class Meta:
        model = Banniere
        fields = '__all__'
