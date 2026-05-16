from django.contrib import admin
from .models import Livraison, PositionTracking


@admin.register(Livraison)
class LivraisonAdmin(admin.ModelAdmin):
    list_display = ['commande', 'transporteur', 'statut_livraison', 'distance_km', 'gain_transporteur', 'date_debut']
    list_filter = ['statut_livraison']
    search_fields = ['commande__reference', 'transporteur__user__username']
    readonly_fields = ['gain_transporteur', 'commission_plateforme']


@admin.register(PositionTracking)
class PositionTrackingAdmin(admin.ModelAdmin):
    list_display = ['livraison', 'vitesse_kmh', 'timestamp']
    list_filter = ['livraison__statut_livraison']
