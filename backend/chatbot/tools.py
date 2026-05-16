"""Outils appelables par le LLM (function calling) + exécution sécurisée côté serveur.

Toutes les vérifications de sécurité (filtrage par client, produits disponibles)
sont faites ici en Python, jamais déléguées au prompt -> robuste à l'injection.
"""
import re

from django.db.models import Case, DecimalField, F, Q, When

from commandes.models import Commande
from fondateurs.models import Produit

from .serializers import ChatProduitSerializer

CATEGORIES_VALIDES = {c[0] for c in Produit.CATEGORIE_CHOICES}

# Synonymes courants -> catégorie. Sert au fallback local et à guider le LLM.
MOTS_CLES_CATEGORIE = {
    'ELECTRONIQUE': ['casque', 'ecouteur', 'écouteur', 'bluetooth', 'telephone', 'téléphone',
                     'smartphone', 'ordinateur', 'laptop', 'pc', 'tablette', 'chargeur',
                     'cable', 'câble', 'tv', 'television', 'télévision', 'enceinte',
                     'electronique', 'électronique', 'souris', 'clavier', 'camera', 'caméra',
                     'powerbank', 'manette', 'console'],
    'ALIMENTAIRE': ['nourriture', 'aliment', 'pain', 'lait', 'oeuf', 'œuf', 'fruit',
                    'legume', 'légume', 'riz', 'pates', 'pâtes', 'viande', 'poisson',
                    'fromage', 'yaourt', 'cereales', 'céréales', 'chocolat'],
    'BOISSONS': ['boisson', 'jus', 'soda', 'cafe', 'café', 'the', 'thé', 'biere',
                 'bière', 'vin', 'eau minerale', 'limonade'],
    'HYGIENE': ['savon', 'shampoing', 'shampooing', 'dentifrice', 'hygiene', 'hygiène',
                'beaute', 'beauté', 'creme', 'crème', 'parfum', 'maquillage',
                'deodorant', 'déodorant', 'gel douche'],
    'VETEMENTS': ['vetement', 'vêtement', 'chemise', 'pantalon', 'robe', 'chaussure',
                  'chaussures', 'veste', 'tshirt', 't-shirt', 'pull', 'jean', 'mode',
                  'manteau', 'jupe', 'sac'],
    'MEDICAMENTS': ['medicament', 'médicament', 'paracetamol', 'paracétamol', 'doliprane',
                    'pharmacie', 'aspirine', 'sirop', 'vitamine', 'antibiotique'],
    'MAISON': ['deco', 'déco', 'meuble', 'lampe', 'rideau', 'tapis', 'chaise',
               'table', 'canape', 'canapé', 'ustensile', 'casserole'],
    'SPORT': ['sport', 'ballon', 'velo', 'vélo', 'fitness', 'musculation', 'raquette',
              'tapis de course', 'halteres', 'haltères', 'yoga'],
}


# Mots trop génériques pour une recherche texte : verbes d'instruction et
# libellés de catégorie (déjà couverts par le filtre `categorie`).
# 'montre/montrer' = verbe "afficher" dans 99% des cas ici.
GENERIC_QUERY_WORDS = {
    'produit', 'produits', 'article', 'articles', 'chose', 'truc', 'trucs',
    'montre', 'montrer', 'cherche', 'chercher', 'veux', 'voudrais', 'besoin',
    'donne', 'donner', 'propose', 'proposer', 'recommande', 'recommander',
    'trouve', 'trouver', 'aimerais', 'souhaite', 'avoir', 'acheter',
    'electronique', 'electroniques', 'électronique', 'électroniques',
    'alimentaire', 'alimentaires', 'boisson', 'boissons', 'hygiene', 'hygiène',
    'vetement', 'vetements', 'vêtement', 'vêtements', 'medicament',
    'medicaments', 'médicament', 'médicaments', 'maison', 'sport', 'sports',
}


def categorie_depuis_texte(texte):
    t = (texte or '').lower()
    for cat, mots in MOTS_CLES_CATEGORIE.items():
        if any(m in t for m in mots):
            return cat
    return None


def _tokens_recherche(query):
    """Mots significatifs d'une requête (instructions/libellés retirés)."""
    bruts = re.split(r'\W+', str(query or '').lower())
    return [t for t in bruts if len(t) > 2 and t not in GENERIC_QUERY_WORDS]


def _annoter_prix_effectif(qs):
    """prix_promo s'il existe, sinon prix — pour filtrer/trier sur le vrai prix payé."""
    return qs.annotate(
        prix_eff=Case(
            When(prix_promo__isnull=False, then=F('prix_promo')),
            default=F('prix'),
            output_field=DecimalField(max_digits=10, decimal_places=2),
        )
    )


def rechercher_produits(query=None, categorie=None, prix_min=None, prix_max=None,
                        tri=None, limit=8, **_):
    """Filtre dynamique du catalogue. Cœur de l'amélioration UX."""
    qs = _annoter_prix_effectif(
        Produit.objects.select_related('fondateur').filter(
            disponible=True, stock__gt=0, fondateur__is_verified=True,
        )
    )

    if categorie:
        categorie = str(categorie).upper().strip()
        if categorie in CATEGORIES_VALIDES:
            qs = qs.filter(categorie=categorie)

    # Recherche texte token par token (OU) : un produit matche s'il contient
    # AU MOINS un mot significatif. Si la requête n'est que du bruit
    # (ex: "montre moi des produits"), on s'appuie sur catégorie + prix.
    mots = _tokens_recherche(query)
    if mots:
        cond = Q()
        for w in mots:
            cond |= Q(nom__icontains=w) | Q(description__icontains=w)
        qs = qs.filter(cond)

    try:
        if prix_min is not None:
            qs = qs.filter(prix_eff__gte=float(prix_min))
    except (TypeError, ValueError):
        pass
    try:
        if prix_max is not None:
            qs = qs.filter(prix_eff__lte=float(prix_max))
    except (TypeError, ValueError):
        pass

    if tri == 'prix_desc':
        qs = qs.order_by('-prix_eff')
    elif tri == 'populaire':
        qs = qs.order_by('-nombre_commandes')
    else:  # prix_asc par défaut : le moins cher d'abord
        qs = qs.order_by('prix_eff')

    try:
        limit = max(1, min(int(limit), 20))
    except (TypeError, ValueError):
        limit = 8

    produits = list(qs[:limit])
    return {
        'count': len(produits),
        'produits': ChatProduitSerializer(produits, many=True).data,
    }


def suivi_commande(reference=None, user=None, **_):
    """Statut d'une commande. SÉCURISÉ : ne voit que les commandes de `user`."""
    if user is None or not getattr(user, 'is_authenticated', False):
        return {'trouvee': False, 'message': 'Utilisateur non authentifié.'}

    qs = Commande.objects.select_related('fondateur', 'transporteur').filter(client=user)

    commande = None
    if reference:
        ref = str(reference).strip().upper().replace(' ', '')
        commande = qs.filter(reference__iexact=ref).first() \
            or qs.filter(reference__icontains=ref).first()
    if commande is None and not reference:
        commande = qs.order_by('-created_at').first()

    if commande is None:
        return {'trouvee': False, 'message': 'Aucune commande trouvée pour ce client.'}

    return {
        'trouvee': True,
        'commande': {
            'reference': commande.reference,
            'statut': commande.statut,
            'statut_label': commande.get_statut_display(),
            'boutique': commande.fondateur.nom_boutique,
            'adresse_livraison': commande.adresse_livraison,
            'total_price': str(commande.total_price),
            'mode_paiement': commande.get_mode_paiement_display(),
            'created_at': commande.created_at.isoformat(),
            'estimated_delivery': (
                commande.estimated_delivery.isoformat()
                if commande.estimated_delivery else None
            ),
            'transporteur': (
                commande.transporteur.get_full_name()
                if commande.transporteur else None
            ),
        },
    }


def ajouter_au_panier(produit_id=None, quantite=1, **_):
    """Valide le produit côté serveur ; le panier réel est local (front)."""
    try:
        produit = Produit.objects.select_related('fondateur').get(
            pk=int(produit_id), disponible=True, fondateur__is_verified=True,
        )
    except (Produit.DoesNotExist, TypeError, ValueError):
        return {'ok': False, 'message': 'Produit introuvable ou indisponible.'}

    try:
        quantite = max(1, min(int(quantite), 99))
    except (TypeError, ValueError):
        quantite = 1

    if produit.stock < quantite:
        return {'ok': False,
                'message': f'Stock insuffisant pour {produit.nom} (reste {produit.stock}).'}

    return {
        'ok': True,
        'quantite': quantite,
        'produit': ChatProduitSerializer(produit).data,
        'message': f'{quantite} × {produit.nom} prêt à être ajouté au panier.',
    }


# ─── Schéma function calling (format Mistral / OpenAI compatible) ──────────────
TOOLS_SCHEMA = [
    {
        'type': 'function',
        'function': {
            'name': 'rechercher_produits',
            'description': ("Recherche des produits dans le catalogue. À utiliser dès que le "
                            "client veut/cherche/demande un article, ex: 'un casque bluetooth "
                            "à moins de 300 dh'. Déduis catégorie et fourchette de prix."),
            'parameters': {
                'type': 'object',
                'properties': {
                    'query': {'type': 'string',
                              'description': "Mots-clés du produit (ex: 'casque bluetooth')."},
                    'categorie': {'type': 'string', 'enum': sorted(CATEGORIES_VALIDES),
                                  'description': 'Catégorie si identifiable.'},
                    'prix_min': {'type': 'number', 'description': 'Prix minimum (MAD).'},
                    'prix_max': {'type': 'number', 'description': 'Prix maximum (MAD).'},
                    'tri': {'type': 'string',
                            'enum': ['prix_asc', 'prix_desc', 'populaire'],
                            'description': 'Ordre de tri.'},
                },
                'required': [],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'suivi_commande',
            'description': ("Statut d'une commande du client : 'où est ma commande', un "
                            "numéro DM-XXXXXXXX, ou 'ma dernière commande' (référence vide)."),
            'parameters': {
                'type': 'object',
                'properties': {
                    'reference': {'type': 'string',
                                  'description': 'Référence (ex: DM-1A2B3C4D). Vide = dernière.'},
                },
                'required': [],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'ajouter_au_panier',
            'description': ("Ajoute un produit précis au panier (par son id), une fois que le "
                            "client a choisi parmi les résultats."),
            'parameters': {
                'type': 'object',
                'properties': {
                    'produit_id': {'type': 'integer', 'description': 'id du produit.'},
                    'quantite': {'type': 'integer', 'description': 'Quantité (défaut 1).'},
                },
                'required': ['produit_id'],
            },
        },
    },
]


def executer_outil(nom, arguments, user=None):
    """Dispatch sûr : nettoie les arguments fournis par le LLM."""
    arguments = dict(arguments or {})
    arguments.pop('user', None)  # jamais accepté depuis le LLM
    if nom == 'rechercher_produits':
        return rechercher_produits(**arguments)
    if nom == 'suivi_commande':
        return suivi_commande(user=user, **arguments)
    if nom == 'ajouter_au_panier':
        return ajouter_au_panier(**arguments)
    return {'error': f'Outil inconnu : {nom}'}
