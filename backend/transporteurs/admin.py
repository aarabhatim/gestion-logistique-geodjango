from django.contrib import admin
from .models import Transporteur


@admin.register(Transporteur)
class TransporteurAdmin(admin.ModelAdmin):
    list_display = ['user', 'vehicule_type', 'plaque', 'is_verified', 'is_available', 'note_moyenne', 'nombre_livraisons']
    list_filter = ['vehicule_type', 'is_verified', 'is_available']
    search_fields = ['user__email', 'user__first_name', 'plaque']
    readonly_fields = ['nombre_livraisons', 'revenus_total', 'note_moyenne', 'nombre_avis']
    actions = ['approuver', 'rejeter']

    def approuver(self, request, queryset):
        queryset.update(is_verified=True)
    approuver.short_description = 'Approuver les transporteurs sélectionnés'

    def rejeter(self, request, queryset):
        queryset.update(is_verified=False)
    rejeter.short_description = 'Rejeter les transporteurs sélectionnés'
