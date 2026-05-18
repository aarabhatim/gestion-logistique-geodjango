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

        evolution_7j = list(
            Commande.objects.filter(created_at__gte=timezone.now() - timedelta(days=7))
            .annotate(jour=TruncDay('created_at'))
            .values('jour')
            .annotate(count=Count('id'), ca=Sum('total_price'))
            .order_by('jour')
        )

        evolution_6m = list(
            Commande.objects.filter(created_at__gte=timezone.now() - timedelta(days=180))
            .annotate(mois=TruncMonth('created_at'))
            .values('mois')
            .annotate(count=Count('id'), ca=Sum('total_price'))
            .order_by('mois')
        )

        par_statut = list(
            Commande.objects.values('statut').annotate(count=Count('id')).order_by('-count')
        )

        top_fondateurs = list(
            Commande.objects.filter(statut='LIVREE')
            .values('fondateur__nom_boutique', 'fondateur_id')
            .annotate(ca=Sum('total_price'), nb_commandes=Count('id'))
            .order_by('-ca')[:10]
        )

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

        top_produits = list(
            Produit.objects.filter(fondateur=fondateur)
            .order_by('-nombre_commandes')
            .values('nom', 'prix', 'nombre_commandes', 'stock')[:10]
        )

        evolution_30j = list(
            commandes_livrees.filter(created_at__gte=timezone.now() - timedelta(days=30))
            .annotate(jour=TruncDay('created_at'))
            .values('jour')
            .annotate(ca=Sum('total_price'), nb=Count('id'))
            .order_by('jour')
        )

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
    permission_classes = []

    def get(self, request):
        return Response({
            'fondateurs_actifs': Fondateur.objects.filter(is_verified=True).count(),
            'commandes_livrees': Commande.objects.filter(statut='LIVREE').count(),
            'transporteurs': Transporteur.objects.filter(is_verified=True).count(),
            'villes': ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tanger'],
        })


class HeatmapDataView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        points_commandes = []
        qs1 = Commande.objects.exclude(location_livraison__isnull=True).only('id', 'statut', 'total_price', 'location_livraison')[:5000]
        for cmd in qs1:
            try:
                points_commandes.append({
                    'lat': cmd.location_livraison.y,
                    'lon': cmd.location_livraison.x,
                    'statut': cmd.statut,
                    'weight': float(cmd.total_price or 1),
                })
            except Exception:
                continue

        points_boutiques = []
        qs2 = Fondateur.objects.exclude(location__isnull=True).only('id', 'nom_boutique', 'ville', 'location', 'rayon_livraison_km', 'nombre_commandes', 'is_verified', 'is_open')
        for f in qs2:
            try:
                points_boutiques.append({
                    'id': f.id,
                    'nom': f.nom_boutique,
                    'ville': f.ville,
                    'lat': f.location.y,
                    'lon': f.location.x,
                    'rayon_km': f.rayon_livraison_km,
                    'nb_commandes': f.nombre_commandes,
                    'is_verified': f.is_verified,
                    'is_open': f.is_open,
                })
            except Exception:
                continue

        couverture_villes = list(
            Fondateur.objects.filter(is_verified=True)
            .values('ville')
            .annotate(
                nb_boutiques=Count('id'),
                nb_commandes=Sum('nombre_commandes'),
            ).order_by('-nb_boutiques')
        )

        clients_par_ville = {}
        try:
            for c in CustomUser.objects.filter(role='CLIENT').values('ville').annotate(n=Count('id')):
                if c.get('ville'):
                    clients_par_ville[c['ville']] = c['n']
        except Exception:
            pass

        for v in couverture_villes:
            v['nb_clients'] = clients_par_ville.get(v['ville'], 0)
            if v['nb_clients']:
                v['score_couverture'] = min(100, round((v['nb_commandes'] or 0) / max(v['nb_clients'], 1) * 20, 1))
            else:
                v['score_couverture'] = 0

        return Response({
            'commandes': points_commandes,
            'boutiques': points_boutiques,
            'couverture_villes': couverture_villes,
            'total_commandes_geo': len(points_commandes),
            'total_boutiques_geo': len(points_boutiques),
        })
