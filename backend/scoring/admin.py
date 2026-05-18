from django.contrib import admin
from .models import ScoreTransporteur


@admin.register(ScoreTransporteur)
class ScoreTransporteurAdmin(admin.ModelAdmin):
    list_display = [
        'transporteur', 'score_global', 'score_ponctualite', 'score_fiabilite',
        'score_satisfaction', 'score_rapidite', 'nb_livraisons_total', 'nb_incidents',
        'derniere_mise_a_jour',
    ]
    list_filter = []
    search_fields = ['transporteur__username', 'transporteur__first_name', 'transporteur__last_name']
    readonly_fields = [
        'score_global', 'score_ponctualite', 'score_fiabilite', 'score_satisfaction',
        'score_rapidite', 'nb_livraisons_total', 'nb_livraisons_a_temps', 'nb_incidents',
        'note_moyenne_clients', 'temps_moyen_livraison_min', 'derniere_mise_a_jour', 'created_at',
    ]
    actions = ['recalculer_scores']

    def recalculer_scores(self, request, queryset):
        for score in queryset:
            score.recalculer()
        self.message_user(request, f"{queryset.count()} score(s) recalculé(s).")
    recalculer_scores.short_description = "Recalculer les scores sélectionnés"
