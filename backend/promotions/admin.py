from django.contrib import admin
from .models import CampagnePromo

@admin.register(CampagnePromo)
class CampagnePromoAdmin(admin.ModelAdmin):
    list_display = ['code', 'nom', 'type_reduction', 'valeur', 'usage_count', 'actif']
    list_filter = ['actif', 'type_reduction']
    filter_horizontal = ['fondateurs']
