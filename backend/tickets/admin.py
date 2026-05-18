from django.contrib import admin
from .models import Ticket, TicketMessage


class TicketMessageInline(admin.TabularInline):
    model = TicketMessage
    extra = 0
    readonly_fields = ['auteur', 'created_at']


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ['id', 'titre', 'auteur', 'categorie', 'priorite', 'statut',
                    'assigne_a', 'sla_depasse', 'created_at']
    list_filter = ['statut', 'priorite', 'categorie', 'sla_depasse']
    search_fields = ['titre', 'description', 'auteur__username']
    readonly_fields = ['created_at', 'updated_at', 'resolu_at', 'sla_depasse', 'sla_alerte_envoyee']
    inlines = [TicketMessageInline]
    actions = ['verifier_sla']

    def verifier_sla(self, request, queryset):
        for ticket in queryset:
            ticket.verifier_sla()
        self.message_user(request, "SLA vérifié pour les tickets sélectionnés.")
    verifier_sla.short_description = "Vérifier le SLA"
