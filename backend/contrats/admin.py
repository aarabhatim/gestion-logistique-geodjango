from django.contrib import admin
from .models import Contrat


@admin.register(Contrat)
class ContratAdmin(admin.ModelAdmin):
    list_display = ['id', 'titre', 'boutique', 'client', 'type_service', 'statut',
                    'date_debut', 'date_fin', 'tarif_negocie', 'expiration_imminente']
    list_filter = ['statut', 'type_service']
    search_fields = ['titre', 'boutique__nom_boutique', 'client__username']
    readonly_fields = ['created_at', 'updated_at', 'signe_at', 'fichier_pdf']
    actions = ['generer_pdfs', 'verifier_expirations']

    def generer_pdfs(self, request, queryset):
        for c in queryset:
            c.generer_pdf()
        self.message_user(request, f"{queryset.count()} PDF(s) générés.")
    generer_pdfs.short_description = "Générer les PDFs sélectionnés"

    def verifier_expirations(self, request, queryset):
        for c in queryset:
            c.verifier_expiration()
        self.message_user(request, "Expirations vérifiées.")
    verifier_expirations.short_description = "Vérifier expirations"
