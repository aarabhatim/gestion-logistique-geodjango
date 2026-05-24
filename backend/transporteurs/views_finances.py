"""
Dashboard financier avancé pour le transporteur.
Endpoints :
  GET  /api/transporteurs/finances/           → résumé complet avec graphiques
  GET  /api/transporteurs/finances/historique/ → liste des paiements par livraison
  GET  /api/transporteurs/finances/export/    → export CSV du relevé mensuel
"""
import csv
import datetime
from django.db.models import Sum, Count, Avg, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsTransporteurRole
from .models import Transporteur


def _get_transporteur(user):
    try:
        return user.transporteur_profile
    except Transporteur.DoesNotExist:
        return None


def _revenus_par_jour(transporteur, nb_jours=30):
    """Retourne une liste de dicts {date, revenus, livraisons} sur nb_jours."""
    from livraisons.models import Livraison
    today = timezone.now().date()
    debut = today - datetime.timedelta(days=nb_jours - 1)
    qs = (
        Livraison.objects
        .filter(transporteur=transporteur, statut_livraison='LIVREE',
                date_livraison__date__gte=debut)
        .values('date_livraison__date')
        .annotate(revenus=Sum('gain_transporteur'), livraisons=Count('id'))
        .order_by('date_livraison__date')
    )
    # Construire la série complète (0 pour les jours sans livraison)
    data_map = {row['date_livraison__date']: row for row in qs}
    result = []
    for i in range(nb_jours):
        d = debut + datetime.timedelta(days=i)
        row = data_map.get(d, {'revenus': 0, 'livraisons': 0})
        result.append({
            'date': str(d),
            'revenus': float(row['revenus'] or 0),
            'livraisons': row['livraisons'],
        })
    return result


def _revenus_par_semaine(transporteur, nb_semaines=12):
    """Retourne nb_semaines de données agrégées par semaine ISO."""
    from livraisons.models import Livraison
    today = timezone.now().date()
    debut = today - datetime.timedelta(weeks=nb_semaines)
    qs = (
        Livraison.objects
        .filter(transporteur=transporteur, statut_livraison='LIVREE',
                date_livraison__date__gte=debut)
        .values('date_livraison__week', 'date_livraison__year')
        .annotate(revenus=Sum('gain_transporteur'), livraisons=Count('id'))
        .order_by('date_livraison__year', 'date_livraison__week')
    )
    return [{
        'semaine': f"S{row['date_livraison__week']}/{row['date_livraison__year']}",
        'revenus': float(row['revenus'] or 0),
        'livraisons': row['livraisons'],
    } for row in qs]


class DashboardFinancierView(APIView):
    """Tableau de bord financier complet du transporteur."""
    permission_classes = [IsTransporteurRole]

    def get(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)

        from livraisons.models import Livraison
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        debut_semaine = today_start - datetime.timedelta(days=now.weekday())
        debut_mois = today_start.replace(day=1)
        debut_annee = today_start.replace(month=1, day=1)

        def agg(depuis):
            return Livraison.objects.filter(
                transporteur=t, statut_livraison='LIVREE', date_livraison__gte=depuis
            ).aggregate(
                revenus=Sum('gain_transporteur'),
                commission=Sum('commission_plateforme'),
                nb=Count('id'),
            )

        jour = agg(today_start)
        semaine = agg(debut_semaine)
        mois = agg(debut_mois)
        annee = agg(debut_annee)

        # Calcul consommation carburant estimée (km × 0.08L × prix moyen MAD 14/L)
        distance_mois = Livraison.objects.filter(
            transporteur=t, statut_livraison='LIVREE', date_livraison__gte=debut_mois
        ).aggregate(total=Sum('distance_km'))['total'] or 0
        conso_estimee = round(float(distance_mois) * 0.08, 1)  # litres
        cout_carburant = round(conso_estimee * 14, 2)           # MAD

        # Prévision fin de mois (basée sur rythme actuel)
        jours_ecoules = max(1, now.day)
        jours_total = (
            (debut_mois.replace(month=debut_mois.month % 12 + 1) - datetime.timedelta(days=1)).day
            if debut_mois.month < 12
            else 31
        )
        revenus_mois_val = float(mois['revenus'] or 0)
        prevision_fin_mois = round(revenus_mois_val / jours_ecoules * jours_total, 2)

        return Response({
            'periode': {
                'aujourd_hui': {
                    'revenus_bruts': float(jour['revenus'] or 0) + float(jour['commission'] or 0),
                    'commission': float(jour['commission'] or 0),
                    'revenus_nets': float(jour['revenus'] or 0),
                    'nb_livraisons': jour['nb'] or 0,
                },
                'semaine': {
                    'revenus_bruts': float(semaine['revenus'] or 0) + float(semaine['commission'] or 0),
                    'commission': float(semaine['commission'] or 0),
                    'revenus_nets': float(semaine['revenus'] or 0),
                    'nb_livraisons': semaine['nb'] or 0,
                },
                'mois': {
                    'revenus_bruts': float(mois['revenus'] or 0) + float(mois['commission'] or 0),
                    'commission': float(mois['commission'] or 0),
                    'revenus_nets': float(mois['revenus'] or 0),
                    'nb_livraisons': mois['nb'] or 0,
                    'prevision_fin_mois': prevision_fin_mois,
                },
                'annee': {
                    'revenus_nets': float(annee['revenus'] or 0),
                    'nb_livraisons': annee['nb'] or 0,
                },
            },
            'carburant': {
                'distance_mois_km': round(float(distance_mois), 1),
                'conso_estimee_litres': conso_estimee,
                'cout_estime_mad': cout_carburant,
            },
            'total_cumule': float(t.revenus_total),
            'graphiques': {
                'par_jour_30j': _revenus_par_jour(t, 30),
                'par_semaine_12s': _revenus_par_semaine(t, 12),
            },
        })


class HistoriquePaiementsView(APIView):
    """Liste paginée des paiements par livraison."""
    permission_classes = [IsTransporteurRole]

    def get(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)

        from livraisons.models import Livraison
        # Filtres optionnels
        statut = request.query_params.get('statut', 'LIVREE')
        mois = request.query_params.get('mois')   # format YYYY-MM
        page = int(request.query_params.get('page', 1))
        per_page = 20

        qs = Livraison.objects.filter(transporteur=t).order_by('-date_livraison')
        if statut:
            qs = qs.filter(statut_livraison=statut)
        if mois:
            try:
                annee, m = mois.split('-')
                qs = qs.filter(
                    date_livraison__year=int(annee),
                    date_livraison__month=int(m)
                )
            except (ValueError, AttributeError):
                pass

        total = qs.count()
        livraisons = qs[(page - 1) * per_page: page * per_page]

        data = [{
            'id': lv.id,
            'commande_ref': lv.commande.reference if lv.commande else '',
            'date': lv.date_livraison.isoformat() if lv.date_livraison else None,
            'distance_km': lv.distance_km,
            'revenus_bruts': float(lv.gain_transporteur) + float(lv.commission_plateforme),
            'commission': float(lv.commission_plateforme),
            'revenus_nets': float(lv.gain_transporteur),
            'statut': lv.statut_livraison,
        } for lv in livraisons]

        return Response({
            'count': total,
            'page': page,
            'per_page': per_page,
            'results': data,
        })


class ExportRevenusCSVView(APIView):
    """Export CSV du relevé mensuel pour déclaration fiscale."""
    permission_classes = [IsTransporteurRole]

    def get(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)

        from livraisons.models import Livraison
        mois = request.query_params.get('mois')   # format YYYY-MM
        if mois:
            try:
                annee, m = mois.split('-')
                qs = Livraison.objects.filter(
                    transporteur=t,
                    statut_livraison='LIVREE',
                    date_livraison__year=int(annee),
                    date_livraison__month=int(m),
                ).order_by('date_livraison')
                filename = f"releve_{mois}.csv"
            except (ValueError, AttributeError):
                return Response({'error': 'Format mois invalide (attendu YYYY-MM).'}, status=400)
        else:
            # Mois courant par défaut
            now = timezone.now()
            qs = Livraison.objects.filter(
                transporteur=t, statut_livraison='LIVREE',
                date_livraison__year=now.year, date_livraison__month=now.month,
            ).order_by('date_livraison')
            filename = f"releve_{now.strftime('%Y-%m')}.csv"

        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        writer = csv.writer(response)
        writer.writerow([
            'Date', 'Référence commande', 'Distance (km)',
            'Revenus bruts (MAD)', 'Commission plateforme (MAD)', 'Revenus nets (MAD)',
        ])
        total_nets = 0
        for lv in qs:
            nets = float(lv.gain_transporteur)
            total_nets += nets
            writer.writerow([
                lv.date_livraison.strftime('%d/%m/%Y %H:%M') if lv.date_livraison else '',
                lv.commande.reference if lv.commande else '',
                round(lv.distance_km or 0, 1),
                round(float(lv.gain_transporteur) + float(lv.commission_plateforme), 2),
                round(float(lv.commission_plateforme), 2),
                round(nets, 2),
            ])
        writer.writerow([])
        writer.writerow(['', '', 'TOTAL NETS', '', '', round(total_nets, 2)])
        return response
