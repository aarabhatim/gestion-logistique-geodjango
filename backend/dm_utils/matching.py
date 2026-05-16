"""
Algorithme de matching transporteur pour DeliverMap.
Score composite = f(distance_boutique * 0.4 + distance_client * 0.3 + note * 0.2 + capacite * 0.1)
"""
from dm_utils.geo_utils import (
    distance_entre_points, transporteurs_disponibles_proches, calculer_frais_livraison
)


def scorer_transporteur(chauffeur_profile, boutique_point, client_point, poids_kg=0):
    """
    Calcule un score de pertinence pour un transporteur donné.
    Score bas = meilleur candidat.

    Args:
        chauffeur_profile: instance de ChauffeurProfile
        boutique_point: Point GeoDjango de la boutique fondateur
        client_point: Point GeoDjango de la destination client
        poids_kg: poids de la commande

    Returns:
        float: score (0-100, lower is better) ou None si infaisable
    """
    if not chauffeur_profile.position_actuelle:
        return None

    if not chauffeur_profile.capacite_kg >= poids_kg:
        return None  # Capacité insuffisante

    # Distance transporteur → boutique (en km)
    dist_vers_boutique = distance_entre_points(chauffeur_profile.position_actuelle, boutique_point)

    # Distance boutique → client (estimation)
    dist_livraison = distance_entre_points(boutique_point, client_point)

    # Note normalisée (5 = parfait, 1 = mauvais)
    note_norm = (chauffeur_profile.note_moyenne - 1) / 4  # 0.0 à 1.0

    # Capacité restante (poids_kg / capacite_kg) — plus faible = plus chargé
    utilisation = poids_kg / max(chauffeur_profile.capacite_kg, 1)

    # Score composite (plus bas = meilleur)
    score = (
        dist_vers_boutique * 0.40 +     # Proximité boutique (40%)
        dist_livraison    * 0.30 +       # Distance de livraison (30%)
        (1 - note_norm)   * 20 * 0.20 + # Note inversée, normalisée sur 20 (20%)
        utilisation       * 10 * 0.10   # Utilisation capacité (10%)
    )
    return round(score, 3)


def trouver_meilleur_transporteur(commande, rayon_km=10):
    """
    Trouve le meilleur transporteur pour une commande donnée.

    Args:
        commande: instance de Commande (doit avoir point_depart et point_destination)
        rayon_km: rayon de recherche autour de la boutique

    Returns:
        ChauffeurProfile ou None
    """
    if not commande.point_depart:
        return None

    boutique_point = commande.point_depart
    client_point = commande.point_destination
    poids = getattr(commande, 'poids_kg', 0) or 0

    candidats = transporteurs_disponibles_proches(
        boutique_point, rayon_km=rayon_km, capacite_min=poids
    )

    if not candidats.exists():
        return None

    # Scorer chaque candidat
    resultats = []
    for candidat in candidats[:20]:  # Limiter à 20 pour la perf
        score = scorer_transporteur(candidat, boutique_point, client_point, poids)
        if score is not None:
            resultats.append((score, candidat))

    if not resultats:
        return None

    # Trier par score (plus faible = meilleur)
    resultats.sort(key=lambda x: x[0])
    return resultats[0][1]


def commandes_supplementaires_sur_trajet(commande_principale, chauffeur_profile, rayon_km=2):
    """
    Trouve les commandes supplémentaires que le transporteur peut effectuer
    si elles sont sur son trajet (rayon 2km du trajet principal).

    Args:
        commande_principale: Commande principale acceptée
        chauffeur_profile: ChauffeurProfile du transporteur
        rayon_km: rayon max autour du trajet

    Returns:
        QuerySet des commandes supplémentaires candidates
    """
    from commandes.models import Commande
    from django.contrib.gis.geos import LineString
    from django.contrib.gis.measure import D

    # Commandes en attente sauf la principale
    qs = Commande.objects.filter(
        statut='en_attente'
    ).exclude(pk=commande_principale.pk)

    # Si on a le tracé de la livraison principale, filtrer par distance au trajet
    if hasattr(commande_principale, 'livraison_detail') and \
       commande_principale.livraison_detail.trace_itineraire:
        trace = commande_principale.livraison_detail.trace_itineraire
        qs = qs.filter(
            point_destination__distance_lte=(trace, D(km=rayon_km))
        )
    else:
        # Fallback: dans un rayon autour du point destination principal
        if commande_principale.point_destination:
            qs = qs.filter(
                point_destination__distance_lte=(
                    commande_principale.point_destination, D(km=rayon_km * 2)
                )
            )

    # Vérifier capacité restante
    poids_principal = getattr(commande_principale, 'poids_kg', 0) or 0
    capacite_restante = chauffeur_profile.capacite_kg - poids_principal
    if hasattr(Commande, 'poids_kg'):
        qs = qs.filter(poids_kg__lte=capacite_restante)

    return qs[:5]  # Max 5 commandes supplémentaires


def calculer_score_global(commandes_liste, chauffeur_profile):
    """
    Calcule le score global d'une tournée multi-stops.

    Returns:
        dict avec score, distance_totale_estimee, nb_commandes
    """
    if not commandes_liste or not chauffeur_profile.position_actuelle:
        return None

    distance_totale = 0
    position_courante = chauffeur_profile.position_actuelle

    for cmd in commandes_liste:
        if cmd.point_depart:
            distance_totale += distance_entre_points(position_courante, cmd.point_depart)
        if cmd.point_destination:
            distance_totale += distance_entre_points(
                cmd.point_depart or position_courante, cmd.point_destination
            )
            position_courante = cmd.point_destination

    frais_estimes = calculer_frais_livraison(
        distance_totale, chauffeur_profile.vehicule_type
    )

    return {
        'nb_commandes': len(commandes_liste),
        'distance_totale_km': round(distance_totale, 2),
        'frais_estimes_mad': frais_estimes,
        'revenus_estimes_mad': round(frais_estimes * 0.8, 2),  # 80% après commission
    }
