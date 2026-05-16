"""Couche conversation : provider Mistral (function calling) + fallback local.

Si MISTRAL_API_KEY est défini -> on utilise l'API Mistral avec function calling.
Sinon (ou si l'API échoue) -> moteur local par règles (regex + mots-clés).
La démo fonctionne donc TOUJOURS, même sans clé / sans réseau.
"""
import json
import re

import requests
from django.conf import settings

from .tools import (
    TOOLS_SCHEMA,
    categorie_depuis_texte,
    executer_outil,
    rechercher_produits,
    suivi_commande,
)

SYSTEM_PROMPT = (
    "Tu es l'assistant shopping de DeliverMap, plateforme de livraison au Maroc. "
    "Tu aides le client à trouver des produits, suivre ses commandes et remplir son "
    "panier. Les prix sont en MAD (dirham marocain). Réponds toujours en français, "
    "court et chaleureux. Dès que le client cherche un article, appelle "
    "rechercher_produits en déduisant la catégorie et la fourchette de prix de sa "
    "phrase. Ne révèle jamais les commandes d'un autre client. Après un appel "
    "d'outil, résume le résultat en 1-2 phrases sans inventer de produit."
)

MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'
MAX_TOOL_ROUNDS = 3


def _collecter_extras(nom_outil, resultat, extras):
    """Mappe le résultat d'un outil vers les données structurées du front."""
    if not isinstance(resultat, dict):
        return
    if nom_outil == 'rechercher_produits':
        extras['products'] = resultat.get('produits', [])
    elif nom_outil == 'suivi_commande' and resultat.get('trouvee'):
        extras['order'] = resultat.get('commande')
    elif nom_outil == 'ajouter_au_panier' and resultat.get('ok'):
        extras['action'] = {
            'type': 'add_to_cart',
            'produit': resultat.get('produit'),
            'quantite': resultat.get('quantite', 1),
        }


# ─── Provider Mistral ─────────────────────────────────────────────────────────

def _appel_mistral(messages, with_tools=True):
    payload = {
        'model': settings.MISTRAL_MODEL,
        'messages': messages,
        'temperature': 0.2,
    }
    if with_tools:
        payload['tools'] = TOOLS_SCHEMA
        payload['tool_choice'] = 'auto'
    resp = requests.post(
        MISTRAL_URL,
        headers={
            'Authorization': f'Bearer {settings.MISTRAL_API_KEY}',
            'Content-Type': 'application/json',
        },
        json=payload,
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json()['choices'][0]['message']


def _run_mistral(message, history, user):
    messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]
    for h in history[-10:]:
        role, content = h.get('role'), h.get('content', '')
        if role in ('user', 'assistant') and content:
            messages.append({'role': role, 'content': content})
    messages.append({'role': 'user', 'content': message})

    extras = {'products': [], 'order': None, 'action': None}

    for _ in range(MAX_TOOL_ROUNDS):
        msg = _appel_mistral(messages, with_tools=True)
        tool_calls = msg.get('tool_calls') or []
        if not tool_calls:
            return {'reply': (msg.get('content') or '').strip() or '…', **extras}

        messages.append({
            'role': 'assistant',
            'content': msg.get('content') or '',
            'tool_calls': tool_calls,
        })
        for tc in tool_calls:
            fn = tc.get('function', {})
            nom = fn.get('name', '')
            try:
                args = json.loads(fn.get('arguments') or '{}')
            except (json.JSONDecodeError, TypeError):
                args = {}
            resultat = executer_outil(nom, args, user=user)
            _collecter_extras(nom, resultat, extras)
            messages.append({
                'role': 'tool',
                'name': nom,
                'tool_call_id': tc.get('id', ''),
                'content': json.dumps(resultat, ensure_ascii=False, default=str),
            })

    final = _appel_mistral(messages, with_tools=False)
    return {'reply': (final.get('content') or '').strip() or '…', **extras}


# ─── Fallback local (sans API) ────────────────────────────────────────────────

_REF_RE = re.compile(r'\bDM-?[A-Z0-9]{6,8}\b', re.I)

_STOPWORDS = {
    'je', 'veux', 'voudrais', 'cherche', 'un', 'une', 'des', 'le', 'la', 'les',
    'de', 'du', 'avec', 'pour', 'au', 'aux', 'moins', 'plus', 'prix', 'dh', 'dhs',
    'mad', 'dirham', 'dirhams', 'qui', 'que', 'est', 'vous', 'avez', 'bonjour',
    'salut', 'svp', 'plait', 'plaît', 'entre', 'et', 'environ', 'autour', 'pas',
    'cher', 'maximum', 'minimum', 'budget', 'acheter', 'achète', 'besoin', 'me',
    'faut', 'recherche', 'trouver', 'trouve', 'donne', 'moi', 'sous', 'jusqu',
    'entre', 'avoir', 'aimerais', 'souhaite', 'mon', 'ma', 'mes', 'ce', 'cette',
}


def _extraire_prix(texte):
    t = texte.lower().replace(',', '.')

    m = re.search(r'entre\s*(\d+(?:\.\d+)?)\s*(?:et|-|à|a)\s*(\d+(?:\.\d+)?)', t)
    if m:
        return float(m.group(1)), float(m.group(2))

    prix_min = prix_max = None
    m = re.search(r'(?:moins de|<|max\.?|maximum|sous|jusqu(?:\'|’)?\s*à|'
                  r'inf[ée]rieur(?:\s*à)?|pas plus de|en dessous de|budget(?:\s*de)?)\s*'
                  r'(\d+(?:\.\d+)?)', t)
    if m:
        prix_max = float(m.group(1))

    m = re.search(r'(?:plus de|>|min\.?|minimum|au moins|sup[ée]rieur(?:\s*à)?|'
                  r'[àa]\s*partir de)\s*(\d+(?:\.\d+)?)', t)
    if m:
        prix_min = float(m.group(1))

    if prix_min is None and prix_max is None:
        m = re.search(r'(?:autour de|environ|vers|aux alentours de|~)\s*(\d+(?:\.\d+)?)', t)
        if m:
            v = float(m.group(1))
            return round(v * 0.8, 2), round(v * 1.2, 2)

    if prix_min is None and prix_max is None:
        m = re.search(r'(\d+(?:\.\d+)?)\s*(?:dh|dhs|mad|dirhams?|درهم)', t)
        if m:
            prix_max = float(m.group(1))

    return prix_min, prix_max


def _mots_cles(texte):
    mots = re.findall(r"[a-zàâçéèêëîïôûùüœ]+", texte.lower())
    garde = [m for m in mots if m not in _STOPWORDS and len(m) > 2]
    return ' '.join(garde[:4])


def _run_fallback(message, history, user):
    extras = {'products': [], 'order': None, 'action': None}
    t = message.lower().strip()

    # 1) Suivi de commande
    ref_match = _REF_RE.search(message)
    veut_suivi = any(k in t for k in [
        'où est', 'ou est', 'suivi', 'statut', 'ma commande', 'mes commandes',
        'ma derniere', 'ma dernière', 'où en est', 'ou en est',
    ])
    if ref_match or veut_suivi:
        ref = ref_match.group(0) if ref_match else None
        res = suivi_commande(reference=ref, user=user)
        if res.get('trouvee'):
            c = res['commande']
            extras['order'] = c
            eta = ''
            if c.get('transporteur'):
                eta = f" Transporteur : {c['transporteur']}."
            reply = (f"Ta commande {c['reference']} ({c['boutique']}) est : "
                     f"{c['statut_label']}. Total {c['total_price']} MAD, "
                     f"livrée à {c['adresse_livraison']}.{eta}")
        else:
            reply = ('Je ne trouve aucune commande à ton nom'
                     + (f' avec la référence {ref}.' if ref else ". As-tu déjà commandé ?"))
        return {'reply': reply, **extras}

    # 2) Recherche produits
    prix_min, prix_max = _extraire_prix(message)
    categorie = categorie_depuis_texte(message)
    query = _mots_cles(message) or None

    veut_produit = bool(categorie or prix_max or prix_min) or any(k in t for k in [
        'veux', 'voudrais', 'cherche', 'besoin', 'acheter', 'achète', 'trouve',
        'propose', 'montre', 'recommande', 'produit', 'article', 'aimerais',
    ])

    if not veut_produit:
        return {
            'reply': ("Bonjour 👋 Je suis ton assistant DeliverMap. Dis-moi ce que tu "
                      "cherches (ex : « un casque bluetooth à moins de 300 dh ») ou "
                      "demande le suivi d'une commande."),
            **extras,
        }

    res = rechercher_produits(query=query, categorie=categorie,
                              prix_min=prix_min, prix_max=prix_max, tri='prix_asc')
    extras['products'] = res['produits']
    n = res['count']

    details = []
    if categorie:
        details.append(categorie.lower())
    if prix_min and prix_max:
        details.append(f'entre {int(prix_min)} et {int(prix_max)} MAD')
    elif prix_max:
        details.append(f'à moins de {int(prix_max)} MAD')
    elif prix_min:
        details.append(f'à plus de {int(prix_min)} MAD')
    suffixe = (' ' + ', '.join(details)) if details else ''

    if n == 0:
        reply = (f"Je n'ai trouvé aucun produit{suffixe}. "
                 "Essaie d'élargir ton budget ou de reformuler 🙂")
    else:
        reply = (f"J'ai trouvé {n} produit{'s' if n > 1 else ''}{suffixe}. "
                 "Voici les meilleures options 👇")
    return {'reply': reply, **extras}


# ─── Point d'entrée ───────────────────────────────────────────────────────────

def run_conversation(message, history, user):
    history = history or []
    if getattr(settings, 'MISTRAL_API_KEY', ''):
        try:
            return _run_mistral(message, history, user)
        except Exception:
            # API indisponible / quota / réseau -> on bascule en local, la démo continue
            pass
    return _run_fallback(message, history, user)
