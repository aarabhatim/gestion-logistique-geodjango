from django.contrib import admin
from .models import Fondateur, Produit, ImageProduit, CodePromo


class ImageProduitInline(admin.TabularInline):
    model = ImageProduit
    extra = 0


@admin.register(Fondateur)
class FondateurAdmin(admin.ModelAdmin):
    list_display = ['nom_boutique', 'user', 'categorie', 'ville', 'is_verified', 'is_open', 'note_moyenne', 'date_creation']
    list_filter = ['categorie', 'is_verified', 'is_open', 'ville']
    search_fields = ['nom_boutique', 'user__email', 'adresse']
    readonly_fields = ['date_creation', 'date_modification', 'note_moyenne', 'nombre_avis', 'nombre_commandes']
    actions = ['approuver', 'rejeter']

    def approuver(self, request, queryset):
        queryset.update(is_verified=True)
    approuver.short_description = 'Approuver les boutiques sélectionnées'

    def rejeter(self, request, queryset):
        queryset.update(is_verified=False)
    rejeter.short_description = 'Rejeter les boutiques sélectionnées'


@admin.register(Produit)
class ProduitAdmin(admin.ModelAdmin):
    list_display = ['nom', 'fondateur', 'categorie', 'prix', 'stock', 'disponible', 'date_creation']
    list_filter = ['categorie', 'disponible', 'fondateur__categorie']
    search_fields = ['nom', 'fondateur__nom_boutique']
    inlines = [ImageProduitInline]


@admin.register(CodePromo)
class CodePromoAdmin(admin.ModelAdmin):
    list_display = ['code', 'fondateur', 'type_reduction', 'valeur', 'actif', 'usage_count', 'usage_max']
    list_filter = ['type_reduction', 'actif']
    search_fields = ['code', 'fondateur__nom_boutique']
