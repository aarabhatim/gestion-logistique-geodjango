from django.contrib import admin
from .models import AdresseBlacklist

@admin.register(AdresseBlacklist)
class AdresseBlacklistAdmin(admin.ModelAdmin):
    list_display = ['adresse', 'ville', 'raison', 'actif', 'ajoutee_par', 'created_at']
    list_filter = ['raison', 'actif']
