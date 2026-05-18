"""Création automatique de contrats lors de l'assignation d'un transporteur."""
from datetime import timedelta

from django.utils import timezone

from .models import Contrat


def creer_contrat_pour_commande(commande, cree_par=None):
    """
    Génère un contrat de livraison lié à la commande lorsqu'un transporteur est assigné.
    Retourne le contrat existant ou nouvellement créé, ou None si pas de transporteur.
    """
    if not commande.transporteur_id:
        return None

    existing = Contrat.objects.filter(commande=commande).first()
    if existing:
        return existing

    boutique = commande.fondateur
    boutique_nom = boutique.nom_boutique if boutique else 'Boutique'
    now = timezone.now()
    today = now.date()

    lignes = []
    for ligne in commande.lignes.select_related('produit').all():
        nom = ligne.produit.nom if ligne.produit_id else 'Article'
        lignes.append(f"  • {nom} × {ligne.quantite} — {ligne.prix_unitaire} MAD")

    description = (
        f"Contrat de livraison généré automatiquement.\n\n"
        f"Boutique : {boutique_nom}\n"
        f"Commande : {commande.reference}\n"
        f"Date de commande : {commande.created_at.strftime('%d/%m/%Y %H:%M')}\n"
        f"Adresse de livraison : {commande.adresse_livraison}\n"
        f"Montant total : {commande.total_price} MAD\n"
        f"Frais de livraison : {commande.frais_livraison} MAD\n"
        f"Mode de paiement : {commande.get_mode_paiement_display()}\n\n"
        f"Détail des articles :\n"
        + ('\n'.join(lignes) if lignes else '  (détail non disponible)')
    )

    contrat = Contrat.objects.create(
        commande=commande,
        boutique=boutique,
        client=commande.client,
        transporteur=commande.transporteur,
        cree_par=cree_par,
        titre=f"Livraison {commande.reference} — {boutique_nom}",
        type_service='express' if commande.livraison_immediate else 'standard',
        tarif_negocie=commande.total_price,
        description_termes=description,
        date_debut=today,
        date_fin=today + timedelta(days=7),
        statut='actif',
    )
    try:
        contrat.generer_pdf()
    except Exception:
        pass
    return contrat
