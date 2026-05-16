from datetime import timedelta
from django.db.models import Count, Sum, Avg, Q
from django.db.models.functions import TruncDay, TruncMonth
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminRole, IsFondateurRole
from accounts.models import CustomUser
from commandes.models import Commande, Avis
from fondateurs.models import Fondateur, Produit
from transporteurs.models import Transporteur


class AdminDashboardView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        today = timezone.now().date()
        debut_mois = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # KPIs globaux
        kpis = {
            'commandes_aujourd_hui': Commande.objects.filter(created_at__date=today).count(),
            'commandes_total': Commande.objects.count(),
            'commandes_en_cours': Commande.objects.filter(statut__in=['VALIDEE', 'EN_PREPARATION', 'EN_ROUTE']).count(),
            'taux_livraison': self._taux_livraison(),
            'ca_total': float(Commande.objects.filter(statut='LIVREE').aggregate(ca=Sum('total_price'))['ca'] or 0),
            'ca_mois': float(Commande.objects.filter(statut='LIVREE', created_at__gte=debut_mois).aggregate(ca=Sum('total_price'))['ca'] or 0),
            'transporteurs_actifs': Transporteur.objects.filter(is_available=True, is_verified=True).count(),
            'transporteurs_en_livraison': Transporteur.objects.filter(is_on_delivery=True).count(),
            'fondateurs_actifs': Fondateur.objects.filter(is_verified=True, is_open=True).count(),
            'fondateurs_en_attente': Fondateur.objects.filter(is_verified=False).count(),
            'clients_total': CustomUser.objects.filter(role='CLIENT').count(),
            'commandes_signalees': Commande.objects.filter(est_signale=True, statut__in=['EN_ATTENTE', 'VALIDEE', 'EN_PREPARATION']).count(),
        }

        # Évolution commandes 7 derniers jours
        evolution_7j = list(
            Commande.objects.filter(created_at__gte=timezone.now() - timedelta(days=7))
            .annotate(jour=TruncDay('created_at'))
            .values('jour')
            .annotate(count=Count('id'), ca=Sum('total_price'))
            .order_by('jour')
        )

        # Évolution 6 mois
        evolution_6m = list(
            Commande.objects.filter(created_at__gte=timezone.now() - timedelta(days=180))
            .annotate(mois=TruncMonth('created_at'))
            .values('mois')
            .annotate(count=Count('id'), ca=Sum('total_price'))
            .order_by('mois')
        )

        # Répartition par statut
        par_statut = list(
            Commande.objects.values('statut').annotate(count=Count('id')).order_by('-count')
        )

        # Top fondateurs par CA
        top_fondateurs = list(
            Commande.objects.filter(statut='LIVREE')
            .values('fondateur__nom_boutique', 'fondateur_id')
            .annotate(ca=Sum('total_price'), nb_commandes=Count('id'))
            .order_by('-ca')[:10]
        )

        # Top transporteurs par livraisons
        top_transporteurs = list(
            Transporteur.objects.filter(nombre_livraisons__gt=0)
            .values('user__first_name', 'user__last_name', 'vehicule_type', 'note_moyenne', 'nombre_livraisons')
            .order_by('-nombre_livraisons')[:10]
        )

        return Response({
            'kpis': kpis,
            'evolution_7j': evolution_7j,
            'evolution_6m': evolution_6m,
            'par_statut': par_statut,
            'top_fondateurs': top_fondateurs,
            'top_transporteurs': top_transporteurs,
        })

    def _taux_livraison(self):
        total = Commande.objects.exclude(statut='ANNULEE').count()
        livrees = Commande.objects.filter(statut='LIVREE').count()
        if total == 0:
            return 0
        return round((livrees / total) * 100, 1)


class FondateurAnalyticsView(APIView):
    permission_classes = [IsFondateurRole]

    def get(self, request):
        try:
            fondateur = request.user.fondateur_profile
        except Exception:
            return Response({'error': 'Profil fondateur requis.'}, status=404)

        today = timezone.now().date()
        debut_mois = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        commandes = Commande.objects.filter(fondateur=fondateur)
        commandes_livrees = commandes.filter(statut='LIVREE')

        # KPIs boutique
        kpis = {
            'commandes_aujourd_hui': commandes.filter(created_at__date=today).count(),
            'commandes_en_attente': commandes.filter(statut='EN_ATTENTE').count(),
            'commandes_en_preparation': commandes.filter(statut='EN_PREPARATION').count(),
            'commandes_total': commandes.count(),
            'ca_mois': float(commandes_livrees.filter(created_at__gte=debut_mois).aggregate(ca=Sum('total_price'))['ca'] or 0),
            'ca_total': float(commandes_livrees.aggregate(ca=Sum('total_price'))['ca'] or 0),
            'taux_annulation': self._taux_annulation(commandes),
            'note_boutique': fondateur.note_moyenne,
            'nombre_avis': fondateur.nombre_avis,
        }

        # Produits les plus commandés
        top_produits = list(
            Produit.objects.filter(fondateur=fondateur)
            .order_by('-nombre_commandes')
            .values('nom', 'prix', 'nombre_commandes', 'stock')[:10]
        )

        # Évolution CA 30j
        evolution_30j = list(
            commandes_livrees.filter(created_at__gte=timezone.now() - timedelta(days=30))
            .annotate(jour=TruncDay('created_at'))
            .values('jour')
            .annotate(ca=Sum('total_price'), nb=Count('id'))
            .order_by('jour')
        )

        # Avis reçus
        avis = list(
            Avis.objects.filter(commande__fondateur=fondateur, cible_type='FONDATEUR')
            .values('note')
            .annotate(count=Count('id'))
            .order_by('note')
        )

        return Response({
            'kpis': kpis,
            'top_produits': top_produits,
            'evolution_30j': evolution_30j,
            'avis_distribution': avis,
        })

    def _taux_annulation(self, commandes):
        total = commandes.count()
        annulees = commandes.filter(statut='ANNULEE').count()
        if total == 0:
            return 0
        return round((annulees / total) * 100, 1)


class StatsPubliquesView(APIView):
    """Statistiques légères pour la page d'accueil (non authentifié)."""
    permission_classes = []

    def get(self, request):
        return Response({
            'fondateurs_actifs': Fondateur.objects.filter(is_verified=True).count(),
            'commandes_livrees': Commande.objects.filter(statut='LIVREE').count(),
            'transporteurs': Transporteur.objects.filter(is_verified=True).count(),
            'villes': ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger'],
        })
