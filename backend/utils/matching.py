"""
Algorithme de matching transporteur ↔ commande.
Score composite = f(distance_fondateur, note_moyenne, capacité_véhicule)
"""
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D


def score_transporteur(transporteur, commande, distance_m):
    """
    Score 0-100. Plus haut = meilleur candidat.
    """
    distance_km = distance_m / 1000
    score_distance = max(0, 100 - distance_km * 10)  # -10 pts par km
    score_note = (transporteur.note_moyenne / 5) * 30  # max 30 pts
    score_livraisons = min(20, transporteur.nombre_livraisons)  # max 20 pts expérience
    return round(score_distance + score_note + score_livraisons, 1)


def trouver_transporteurs_disponibles(commande, rayon_km=5):
    """
    Retourne les transporteurs disponibles triés par score décroissant.
    """
    from transporteurs.models import Transporteur

    if not commande.fondateur.location:
        return []

    qs = (
        Transporteur.objects
        .filter(is_available=True, is_verified=True, is_on_delivery=False)
        .filter(position_actuelle__distance_lte=(commande.fondateur.location, D(km=rayon_km)))
        .annotate(distance=Distance('position_actuelle', commande.fondateur.location))
        .select_related('user')
    )

    candidats = []
    for t in qs:
        score = score_transporteur(t, commande, t.distance.m)
        candidats.append({'transporteur': t, 'score': score, 'distance_km': round(t.distance.km, 2)})

    candidats.sort(key=lambda x: x['score'], reverse=True)
    return candidats


def proposer_commandes_transporteur(commande):
    """
    Après validation d'une commande, notifie les transporteurs proches.
    """
    from notifications.models import envoyer_notification

    candidats = trouver_transporteurs_disponibles(commande, rayon_km=5)

    for candidat in candidats[:5]:  # Top 5 transporteurs
        t = candidat['transporteur']
        envoyer_notification(
            user=t.user,
            titre=f'Nouvelle commande disponible — {commande.fondateur.nom_boutique}',
            message=f'Commande {commande.reference} à {candidat["distance_km"]} km de vous. Total: {commande.total_price} MAD',
            type_notif='COMMANDE',
            commande_id=commande.pk,
        )


def proposer_livraisons_additionnelles(commande_principale, transporteur):
    """
    Propose des livraisons supplémentaires dans un rayon de 2km du trajet principal.
    Logique: fondateur sur le trajet OU client dans un rayon de 2km.
    """
    from commandes.models import Commande

    if not transporteur.position_actuelle or not commande_principale.location_livraison:
        return []

    commandes_additionnelles = (
        Commande.objects.filter(statut='VALIDEE')
        .exclude(pk=commande_principale.pk)
        .filter(
            fondateur__location__distance_lte=(transporteur.position_actuelle, D(km=2))
        )
        .select_related('fondateur', 'client')[:3]
    )

    return list(commandes_additionnelles)
