"""
Gamification : badges, niveaux, classement.
Endpoints :
  GET  /api/transporteurs/badges/             → badges débloqués + tous les badges dispos
  POST /api/transporteurs/badges/verifier/    → recalcul et déblocage des badges mérités
  GET  /api/transporteurs/niveau/             → niveau actuel + progression
  GET  /api/transporteurs/classement/         → top 20 transporteurs (filtrable par ville)
"""
from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminRole, IsTransporteurRole
from .models import (
    Transporteur, Badge, BadgeTransporteur, NiveauTransporteur,
)


def _get_transporteur(user):
    try:
        return user.transporteur_profile
    except Transporteur.DoesNotExist:
        return None


def _debloquer_badges(transporteur):
    """Vérifie et débloque tous les badges auxquels le transporteur a droit."""
    nouveaux = []
    badges_dispo = Badge.objects.filter(actif=True)
    deja = set(BadgeTransporteur.objects.filter(transporteur=transporteur)
               .values_list('badge_id', flat=True))

    from scoring.models import ScoreTransporteur
    try:
        score_obj = transporteur.score
        score_ponctualite = float(score_obj.score_ponctualite)
        score_global = float(score_obj.score_global)
    except Exception:
        score_ponctualite = 0
        score_global = 0

    # Calcul du nombre d'incidents ce mois
    from incidents.models import Incident
    from django.utils import timezone as tz
    debut_mois = tz.now().replace(day=1, hour=0, minute=0, second=0)
    incidents_mois = Incident.objects.filter(
        transporteur=transporteur.user,
        created_at__gte=debut_mois,
    ).count()

    for badge in badges_dispo:
        if badge.id in deja:
            continue
        unlock = False
        cat = badge.categorie
        seuil = badge.seuil

        if cat == 'LIVRAISONS' and transporteur.nombre_livraisons >= seuil:
            unlock = True
        elif cat == 'PONCTUALITE' and score_ponctualite >= seuil:
            unlock = True
        elif cat == 'SATISFACTION' and transporteur.note_moyenne * 20 >= seuil:
            # note_moyenne /5 → sur 100
            unlock = True
        elif cat == 'SECURITE' and incidents_mois == 0 and seuil == 0:
            unlock = True
        elif cat == 'FIDELITE':
            # Ancienneté en jours
            anciennete = (tz.now() - transporteur.date_inscription).days
            if anciennete >= seuil:
                unlock = True

        if unlock:
            bt = BadgeTransporteur.objects.create(transporteur=transporteur, badge=badge)
            nouveaux.append(bt)
            # Envoyer notification
            try:
                from notifications.models import Notification
                Notification.objects.create(
                    destinataire=transporteur.user,
                    titre=f"🏅 Nouveau badge débloqué : {badge.nom}",
                    message=f"Félicitations ! Vous avez débloqué le badge {badge.icone} {badge.nom}. {badge.description}",
                    type_notif='SUCCESS',
                )
            except Exception:
                pass
            # Ajouter des points au niveau
            _ajouter_points(transporteur, 50)

    return nouveaux


def _ajouter_points(transporteur, points):
    """Ajoute des points au niveau du transporteur et recalcule."""
    niveau, _ = NiveauTransporteur.objects.get_or_create(transporteur=transporteur)
    niveau.points += points
    niveau.save(update_fields=['points'])
    niveau.recalculer()


class BadgesView(APIView):
    """Badges du transporteur connecté."""
    permission_classes = [IsTransporteurRole]

    def get(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)

        badges_obtenus_ids = set(
            BadgeTransporteur.objects.filter(transporteur=t)
            .values_list('badge_id', flat=True)
        )
        badges_obtenus = BadgeTransporteur.objects.filter(
            transporteur=t
        ).select_related('badge').order_by('-obtenu_le')

        tous_badges = Badge.objects.filter(actif=True)

        obtenus_data = [{
            'id': bt.badge.id,
            'code': bt.badge.code,
            'nom': bt.badge.nom,
            'description': bt.badge.description,
            'icone': bt.badge.icone,
            'categorie': bt.badge.categorie,
            'obtenu_le': bt.obtenu_le.isoformat(),
            'est_nouveau': not bt.notifie,
        } for bt in badges_obtenus]

        tous_data = [{
            'id': b.id,
            'code': b.code,
            'nom': b.nom,
            'description': b.description,
            'icone': b.icone,
            'categorie': b.categorie,
            'seuil': b.seuil,
            'obtenu': b.id in badges_obtenus_ids,
        } for b in tous_badges]

        # Marquer les non notifiés comme vus
        BadgeTransporteur.objects.filter(transporteur=t, notifie=False).update(notifie=True)

        return Response({
            'obtenus': obtenus_data,
            'tous': tous_data,
            'total_obtenus': len(obtenus_data),
            'total_disponibles': tous_badges.count(),
        })


class VerifierBadgesView(APIView):
    """Recalcule et débloque les badges mérités."""
    permission_classes = [IsTransporteurRole]

    def post(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)

        nouveaux = _debloquer_badges(t)
        return Response({
            'nouveaux_badges': [{
                'nom': bt.badge.nom,
                'icone': bt.badge.icone,
                'description': bt.badge.description,
            } for bt in nouveaux],
            'nb_nouveaux': len(nouveaux),
            'message': f'{len(nouveaux)} nouveau(x) badge(s) débloqué(s)' if nouveaux else 'Aucun nouveau badge',
        })


class NiveauView(APIView):
    """Niveau actuel du transporteur + progression."""
    permission_classes = [IsTransporteurRole]

    def get(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)

        niveau, _ = NiveauTransporteur.objects.get_or_create(transporteur=t)

        seuils = NiveauTransporteur.SEUILS
        niveau_actuel = niveau.niveau
        points = niveau.points

        # Calcul progression dans le niveau courant
        seuil_actuel = seuils[niveau_actuel]
        prochain = niveau.prochain_niveau
        if prochain:
            seuil_prochain = seuils[prochain]
            progression_pct = round((points - seuil_actuel) / (seuil_prochain - seuil_actuel) * 100)
        else:
            progression_pct = 100

        return Response({
            'niveau': niveau_actuel,
            'points': points,
            'prochain_niveau': prochain,
            'points_vers_prochain': niveau.points_vers_prochain,
            'progression_pct': max(0, min(100, progression_pct)),
            'seuils': seuils,
            'avantages': _avantages_niveau(niveau_actuel),
        })


def _avantages_niveau(niveau):
    avantages = {
        'BRONZE': ['Accès aux commandes standards'],
        'ARGENT': ['Accès aux commandes standards', 'Priorité sur les commandes zone préférée', 'Commission réduite de 1%'],
        'OR': ['Priorité sur toutes les commandes', 'Commission réduite de 2%', 'Support prioritaire'],
        'PLATINE': ['Priorité maximale', 'Commission réduite de 3%', 'Support dédié', 'Badge exclusif Platine'],
    }
    return avantages.get(niveau, [])


class ClassementTransporteursView(APIView):
    """Top 20 transporteurs — filtrable par ville."""
    permission_classes = [IsTransporteurRole | IsAdminRole]

    def get(self, request):
        ville = request.query_params.get('ville')
        periode = request.query_params.get('periode', 'mois')  # semaine / mois / all

        from livraisons.models import Livraison
        import datetime as dt

        now = timezone.now()
        if periode == 'semaine':
            depuis = now - dt.timedelta(days=7)
        elif periode == 'mois':
            depuis = now.replace(day=1, hour=0, minute=0, second=0)
        else:
            depuis = None

        qs = Transporteur.objects.filter(is_verified=True).select_related('user', 'niveau')

        if ville:
            qs = qs.filter(user__city__icontains=ville)

        # Annoter avec livraisons de la période
        if depuis:
            qs = qs.annotate(
                livraisons_periode=Count(
                    'livraisons',
                    filter=__import__('django').db.models.Q(
                        livraisons__statut_livraison='LIVREE',
                        livraisons__date_livraison__gte=depuis
                    )
                )
            )
        else:
            qs = qs.annotate(
                livraisons_periode=Count(
                    'livraisons',
                    filter=__import__('django').db.models.Q(livraisons__statut_livraison='LIVREE')
                )
            )

        qs = qs.order_by('-note_moyenne', '-livraisons_periode')[:20]

        data = []
        for i, t in enumerate(qs, 1):
            try:
                niveau_label = t.niveau.niveau
                points = t.niveau.points
            except Exception:
                niveau_label = 'BRONZE'
                points = 0

            data.append({
                'rang': i,
                'id': t.id,
                'nom': t.user.get_full_name() or t.user.username,
                'vehicule_type': t.vehicule_type,
                'note_moyenne': t.note_moyenne,
                'nombre_livraisons': t.nombre_livraisons,
                'livraisons_periode': t.livraisons_periode,
                'niveau': niveau_label,
                'points': points,
            })

        return Response({'classement': data, 'periode': periode, 'ville': ville})
