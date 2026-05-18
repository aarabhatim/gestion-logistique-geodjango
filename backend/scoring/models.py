from django.db import models
from django.conf import settings


class ScoreTransporteur(models.Model):
    """
    Score multidimensionnel calculé automatiquement pour chaque transporteur.
    Mis à jour via signal post_save sur Livraison et Avis.
    """
    transporteur = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='score',
        limit_choices_to={'role': 'TRANSPORTEUR'},
    )

    # ── Dimensions (0.0 → 100.0) ──────────────────────────────────────────────
    score_ponctualite = models.FloatField(
        default=0.0,
        help_text="% de livraisons dans les délais estimés"
    )
    score_fiabilite = models.FloatField(
        default=0.0,
        help_text="100 − (incidents / livraisons * 100)"
    )
    score_satisfaction = models.FloatField(
        default=0.0,
        help_text="Note moyenne clients ramenée sur 100"
    )
    score_rapidite = models.FloatField(
        default=0.0,
        help_text="Inverse du temps moyen de livraison normalisé"
    )
    score_global = models.FloatField(
        default=0.0,
        help_text="Moyenne pondérée des 4 dimensions"
    )

    # ── Données brutes pour traçabilité ───────────────────────────────────────
    nb_livraisons_total = models.IntegerField(default=0)
    nb_livraisons_a_temps = models.IntegerField(default=0)
    nb_incidents = models.IntegerField(default=0)
    note_moyenne_clients = models.FloatField(default=0.0)
    temps_moyen_livraison_min = models.FloatField(
        default=0.0, help_text="Temps moyen de livraison en minutes"
    )

    # ── Meta ──────────────────────────────────────────────────────────────────
    derniere_mise_a_jour = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Pondérations (configurable sans migration)
    POIDS = {
        'ponctualite': 0.30,
        'fiabilite': 0.30,
        'satisfaction': 0.25,
        'rapidite': 0.15,
    }

    class Meta:
        verbose_name = "Score transporteur"
        verbose_name_plural = "Scores transporteurs"
        ordering = ['-score_global']

    def __str__(self):
        return f"Score {self.transporteur.username} — {self.score_global:.1f}/100"

    def recalculer(self):
        """
        Recalcule toutes les dimensions depuis les données réelles.
        Appelé par signal ou manuellement.
        """
        from django.db.models import Avg, Count
        from commandes.models import Commande, Avis
        from incidents.models import Incident

        user = self.transporteur

        # ── Livraisons ────────────────────────────────────────────────────────
        commandes_livrees = Commande.objects.filter(
            transporteur=user, statut='LIVREE'
        )
        self.nb_livraisons_total = commandes_livrees.count()

        # Ponctualité : livrées avant ou à l'heure estimée
        if self.nb_livraisons_total > 0:
            a_temps = commandes_livrees.filter(
                livree_at__lte=models.F('estimated_delivery')
            ).count()
            self.nb_livraisons_a_temps = a_temps
            self.score_ponctualite = round(
                (a_temps / self.nb_livraisons_total) * 100, 2
            )
        else:
            self.score_ponctualite = 0.0

        # ── Incidents ─────────────────────────────────────────────────────────
        self.nb_incidents = Incident.objects.filter(
            commande__transporteur=user
        ).count()
        if self.nb_livraisons_total > 0:
            taux_incident = self.nb_incidents / self.nb_livraisons_total
            self.score_fiabilite = round(max(0, (1 - taux_incident) * 100), 2)
        else:
            self.score_fiabilite = 100.0 if self.nb_incidents == 0 else 50.0

        # ── Satisfaction client ───────────────────────────────────────────────
        avis = Avis.objects.filter(
            commande__transporteur=user, cible_type='TRANSPORTEUR'
        )
        if avis.exists():
            note = avis.aggregate(avg=Avg('note'))['avg'] or 0
            self.note_moyenne_clients = round(note, 2)
            self.score_satisfaction = round((note / 5) * 100, 2)
        else:
            self.score_satisfaction = 0.0

        # ── Rapidité (temps moyen de livraison) ───────────────────────────────
        livrees_horodatees = commandes_livrees.filter(
            livree_at__isnull=False,
            updated_at__isnull=False,
        )
        if livrees_horodatees.exists():
            from django.db.models import ExpressionWrapper, DurationField, F as Fexpr
            durations = livrees_horodatees.annotate(
                duree=ExpressionWrapper(
                    Fexpr('livree_at') - Fexpr('created_at'),
                    output_field=DurationField()
                )
            ).aggregate(avg=Avg('duree'))
            if durations['avg']:
                avg_min = durations['avg'].total_seconds() / 60
                self.temps_moyen_livraison_min = round(avg_min, 1)
                # 30 min ou moins = 100 pts; 120 min ou plus = 0 pt
                score = max(0, min(100, ((120 - avg_min) / 90) * 100))
                self.score_rapidite = round(score, 2)
            else:
                self.score_rapidite = 0.0
        else:
            self.score_rapidite = 0.0

        # ── Score global pondéré ──────────────────────────────────────────────
        p = self.POIDS
        self.score_global = round(
            self.score_ponctualite * p['ponctualite'] +
            self.score_fiabilite * p['fiabilite'] +
            self.score_satisfaction * p['satisfaction'] +
            self.score_rapidite * p['rapidite'],
            2
        )

        self.save()
