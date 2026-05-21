from django.contrib import admin
from .models import ZoneLivraison

@admin.register(ZoneLivraison)
class ZoneLivraisonAdmin(admin.ModelAdmin):
    list_display = ['nom', 'tarif_base', 'actif', 'created_at']
    list_filter = ['actif']
    filter_horizontal = ['transporteurs']
