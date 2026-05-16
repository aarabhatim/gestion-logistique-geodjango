from django.contrib import admin
from .models import Commande, CommandeProduit, Avis


class CommandeProduitInline(admin.TabularInline):
    model = CommandeProduit
    extra = 0
    readonly_fields = ['sous_total']


@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    list_display = ['reference', 'client', 'fondateur', 'statut', 'total_price', 'mode_paiement', 'created_at']
    list_filter = ['statut', 'mode_paiement', 'est_paye', 'est_signale']
    search_fields = ['reference', 'client__username', 'fondateur__nom_boutique']
    readonly_fields = ['reference', 'created_at', 'updated_at']
    inlines = [CommandeProduitInline]


@admin.register(Avis)
class AvisAdmin(admin.ModelAdmin):
    list_display = ['commande', 'auteur', 'cible_type', 'note', 'created_at']
    list_filter = ['cible_type', 'note']
    search_fields = ['auteur__username', 'commande__reference']
