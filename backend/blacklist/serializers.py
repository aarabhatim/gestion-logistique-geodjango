from rest_framework import serializers
from .models import AdresseBlacklist


class AdresseBlacklistSerializer(serializers.ModelSerializer):
    ajoutee_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = AdresseBlacklist
        fields = '__all__'
        read_only_fields = ['ajoutee_par']

    def get_ajoutee_par_nom(self, obj):
        if obj.ajoutee_par:
            return obj.ajoutee_par.get_full_name() or obj.ajoutee_par.email
        return None
