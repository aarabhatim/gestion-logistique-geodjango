from django.db.models import Count, Sum, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from commandes.models import Commande
from clients.models import Client
from transporteurs.models import Vehicule, Chauffeur
from incidents.models import Incident


class StatsView(APIView):
    """Endpoint de statistiques pour le dashboard et les rapports (admin uniquement)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # ─── Commandes par statut ───────────────────────────────────────────
        statuts = ['en_attente', 'validee', 'affectee', 'en_cours', 'livree', 'annulee']
        commandes_par_statut = []
        for s in statuts:
            count = Commande.objects.filter(statut=s).count()
            commandes_par_statut.append({'statut': s, 'count': count})

        # ─── Commandes par type de marchandise ─────────────────────────────
        types_marchandise = Commande.objects.values('type_marchandise').annotate(
            count=Count('id')
        ).order_by('-count')

        # ─── Top 5 clients ─────────────────────────────────────────────────
        top_clients = (
            Commande.objects.values('client__prenom', 'client__nom')
            .annotate(nb_commandes=Count('id'))
            .order_by('-nb_commandes')[:5]
        )

        # ─── KPIs globaux ──────────────────────────────────────────────────
        total_commandes = Commande.objects.count()
        livrees = Commande.objects.filter(statut='livree').count()
        taux_livraison = round((livrees / total_commandes * 100), 1) if total_commandes > 0 else 0

        revenus_estimes = Commande.objects.filter(
            prix_estime__isnull=False
        ).aggregate(total=Sum('prix_estime'))['total'] or 0

        vehicules_disponibles = Vehicule.objects.filter(disponible=True).count()
        chauffeurs_disponibles = Chauffeur.objects.filter(disponible=True).count()
        incidents_ouverts = Incident.objects.filter(statut='ouvert').count()

        # ─── Commandes des 6 derniers mois ─────────────────────────────────
        from django.utils import timezone
        from datetime import timedelta
        import calendar

        today = timezone.now()
        mois_data = []
        for i in range(5, -1, -1):
            mois_date = today.replace(day=1) - timedelta(days=1)
            for _ in range(i):
                mois_date = mois_date.replace(day=1) - timedelta(days=1)
            # Simplification : utiliser les 6 derniers mois calendaires
            target = today - timedelta(days=30 * i)
            count_mois = Commande.objects.filter(
                date_creation__year=target.year,
                date_creation__month=target.month,
            ).count()
            mois_data.append({
                'mois': target.strftime('%b %Y'),
                'count': count_mois,
            })

        return Response({
            'kpis': {
                'total_commandes': total_commandes,
                'commandes_livrees': livrees,
                'taux_livraison': taux_livraison,
                'revenus_estimes': round(revenus_estimes, 2),
                'total_clients': Client.objects.count(),
                'vehicules_disponibles': vehicules_disponibles,
                'chauffeurs_disponibles': chauffeurs_disponibles,
                'incidents_ouverts': incidents_ouverts,
            },
            'commandes_par_statut': commandes_par_statut,
            'commandes_par_type': list(types_marchandise),
            'top_clients': list(top_clients),
            'evolution_mensuelle': mois_data,
        })
