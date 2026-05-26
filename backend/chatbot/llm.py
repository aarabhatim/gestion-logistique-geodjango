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
    "panier. Les prix sont en MAD (dirham marocain). Sois court et chaleureux. "
    "RÈGLE LINGUISTIQUE ABSOLUE : tu dois TOUJOURS répondre dans la même langue "
    "que celle utilisée par l'utilisateur dans son dernier message. Si l'utilisateur "
    "écrit en espagnol, réponds en espagnol. S'il écrit en anglais, réponds en "
    "anglais. En arabe -> arabe. En français -> français. En italien, portugais, "
    "allemand, darija marocain -> même langue. Détecte la langue à chaque tour. "
    "Dès que le client cherche un article, appelle rechercher_produits en "
    "déduisant la catégorie et la fourchette de prix de sa phrase. Ne révèle "
    "jamais les commandes d'un autre client. Après un appel d'outil, résume le "
    "résultat en 1-2 phrases sans inventer de produit, toujours dans la langue "
    "de l'utilisateur."
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


_LANG_NAMES = {
    'fr': 'French (français)',
    'en': 'English',
    'es': 'Spanish (español)',
    'ar': 'Arabic (العربية)',
    'it': 'Italian (italiano)',
    'pt': 'Portuguese (português)',
    'de': 'German (Deutsch)',
    'ber': 'Tamazight / Berber',
}


def _run_mistral(message, history, user, langue='fr'):
    nom_langue = _LANG_NAMES.get(langue, 'French')
    system_with_lang = (
        SYSTEM_PROMPT
        + f"\n\nLANGUE DÉTECTÉE DU DERNIER MESSAGE : {nom_langue}. "
        + f"Tu DOIS rédiger ta réponse entièrement en {nom_langue}, "
        "sans mélanger d'autres langues."
    )
    messages = [{'role': 'system', 'content': system_with_lang}]
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


# Modèles de réponse du fallback, par langue. Variables disponibles :
#   {ref}, {boutique}, {statut}, {total}, {adresse}, {eta}, {suffixe}, {n}, {s}
_FALLBACK_TEMPLATES = {
    'fr': {
        'order_found': "Ta commande {ref} ({boutique}) est : {statut}. Total {total} MAD, livrée à {adresse}.{eta}",
        'order_eta_transporteur': " Transporteur : {transporteur}.",
        'order_not_found_with_ref': "Je ne trouve aucune commande à ton nom avec la référence {ref}.",
        'order_not_found': "Je ne trouve aucune commande à ton nom. As-tu déjà commandé ?",
        'default': "Bonjour 👋 Je suis ton assistant DeliverMap. Dis-moi ce que tu cherches (ex : « un casque bluetooth à moins de 300 dh ») ou demande le suivi d'une commande.",
        'no_products': "Je n'ai trouvé aucun produit{suffixe}. Essaie d'élargir ton budget ou de reformuler 🙂",
        'products_found': "J'ai trouvé {n} produit{s}{suffixe}. Voici les meilleures options 👇",
        'range_between': "entre {min} et {max} MAD",
        'range_max': "à moins de {max} MAD",
        'range_min': "à plus de {min} MAD",
    },
    'en': {
        'order_found': "Your order {ref} ({boutique}) is: {statut}. Total {total} MAD, delivered to {adresse}.{eta}",
        'order_eta_transporteur': " Courier: {transporteur}.",
        'order_not_found_with_ref': "I can't find any order in your name with reference {ref}.",
        'order_not_found': "I can't find any order in your name. Have you placed one yet?",
        'default': "Hi 👋 I'm your DeliverMap assistant. Tell me what you're looking for (e.g. \"a bluetooth headset under 300 dh\") or ask to track an order.",
        'no_products': "I couldn't find any product{suffixe}. Try widening your budget or rephrasing 🙂",
        'products_found': "I found {n} product{s}{suffixe}. Here are the best options 👇",
        'range_between': "between {min} and {max} MAD",
        'range_max': "under {max} MAD",
        'range_min': "over {min} MAD",
    },
    'es': {
        'order_found': "Tu pedido {ref} ({boutique}) está: {statut}. Total {total} MAD, entregado en {adresse}.{eta}",
        'order_eta_transporteur': " Repartidor: {transporteur}.",
        'order_not_found_with_ref': "No encuentro ningún pedido a tu nombre con la referencia {ref}.",
        'order_not_found': "No encuentro ningún pedido a tu nombre. ¿Ya has hecho alguno?",
        'default': "¡Hola 👋 ! Soy tu asistente DeliverMap. Dime qué buscas (ej. «unos auriculares bluetooth por menos de 300 dh») o pídeme el seguimiento de un pedido.",
        'no_products': "No he encontrado ningún producto{suffixe}. Intenta ampliar tu presupuesto o reformular 🙂",
        'products_found': "Encontré {n} producto{s}{suffixe}. Aquí están las mejores opciones 👇",
        'range_between': "entre {min} y {max} MAD",
        'range_max': "por menos de {max} MAD",
        'range_min': "por más de {min} MAD",
    },
    'ar': {
        'order_found': "طلبك {ref} ({boutique}) في حالة: {statut}. المجموع {total} درهم، يُسلَّم إلى {adresse}.{eta}",
        'order_eta_transporteur': " السائق: {transporteur}.",
        'order_not_found_with_ref': "لم أعثر على أي طلب باسمك بالمرجع {ref}.",
        'order_not_found': "لم أعثر على أي طلب باسمك. هل قمت بالطلب من قبل؟",
        'default': "أهلاً 👋 أنا مساعد DeliverMap. أخبرني بما تبحث عنه (مثلاً «سماعات بلوتوث بأقل من 300 درهم») أو اطلب متابعة طلب.",
        'no_products': "لم أعثر على أي منتج{suffixe}. حاول توسيع ميزانيتك أو إعادة الصياغة 🙂",
        'products_found': "وجدت {n} منتج{s}{suffixe}. إليك أفضل الخيارات 👇",
        'range_between': "بين {min} و {max} درهم",
        'range_max': "بأقل من {max} درهم",
        'range_min': "بأكثر من {min} درهم",
    },
    'it': {
        'order_found': "Il tuo ordine {ref} ({boutique}) è: {statut}. Totale {total} MAD, consegnato a {adresse}.{eta}",
        'order_eta_transporteur': " Corriere: {transporteur}.",
        'order_not_found_with_ref': "Non trovo nessun ordine a tuo nome con il riferimento {ref}.",
        'order_not_found': "Non trovo nessun ordine a tuo nome. Ne hai già fatto uno?",
        'default': "Ciao 👋 Sono il tuo assistente DeliverMap. Dimmi cosa cerchi (es. «cuffie bluetooth sotto i 300 dh») o chiedi di tracciare un ordine.",
        'no_products': "Non ho trovato nessun prodotto{suffixe}. Prova ad ampliare il budget o a riformulare 🙂",
        'products_found': "Ho trovato {n} prodott{s}{suffixe}. Ecco le migliori opzioni 👇",
        'range_between': "tra {min} e {max} MAD",
        'range_max': "sotto {max} MAD",
        'range_min': "sopra {min} MAD",
    },
    'pt': {
        'order_found': "O seu pedido {ref} ({boutique}) está: {statut}. Total {total} MAD, entregue em {adresse}.{eta}",
        'order_eta_transporteur': " Estafeta: {transporteur}.",
        'order_not_found_with_ref': "Não encontro nenhum pedido em seu nome com a referência {ref}.",
        'order_not_found': "Não encontro nenhum pedido em seu nome. Já fez algum?",
        'default': "Olá 👋 Sou o seu assistente DeliverMap. Diga-me o que procura (ex. «uns auscultadores bluetooth abaixo de 300 dh») ou peça para acompanhar um pedido.",
        'no_products': "Não encontrei nenhum produto{suffixe}. Tente alargar o orçamento ou reformular 🙂",
        'products_found': "Encontrei {n} produto{s}{suffixe}. Aqui estão as melhores opções 👇",
        'range_between': "entre {min} e {max} MAD",
        'range_max': "abaixo de {max} MAD",
        'range_min': "acima de {min} MAD",
    },
    'de': {
        'order_found': "Ihre Bestellung {ref} ({boutique}) ist: {statut}. Gesamt {total} MAD, geliefert an {adresse}.{eta}",
        'order_eta_transporteur': " Fahrer: {transporteur}.",
        'order_not_found_with_ref': "Ich finde keine Bestellung auf Ihren Namen mit der Referenz {ref}.",
        'order_not_found': "Ich finde keine Bestellung auf Ihren Namen. Haben Sie schon eine aufgegeben?",
        'default': "Hallo 👋 Ich bin Ihr DeliverMap-Assistent. Sagen Sie mir, was Sie suchen (z. B. „Bluetooth-Kopfhörer unter 300 dh\") oder fragen Sie nach einer Bestellung.",
        'no_products': "Ich habe kein Produkt{suffixe} gefunden. Erweitern Sie Ihr Budget oder formulieren Sie um 🙂",
        'products_found': "Ich habe {n} Produkt{s}{suffixe} gefunden. Hier sind die besten Optionen 👇",
        'range_between': "zwischen {min} und {max} MAD",
        'range_max': "unter {max} MAD",
        'range_min': "über {min} MAD",
    },
}


def _tpl(langue, key, **kwargs):
    """Récupère un template traduit (avec repli sur le français)."""
    bundle = _FALLBACK_TEMPLATES.get(langue) or _FALLBACK_TEMPLATES['fr']
    template = bundle.get(key) or _FALLBACK_TEMPLATES['fr'][key]
    return template.format(**kwargs) if kwargs else template


def _run_fallback(message, history, user, langue='fr'):
    extras = {'products': [], 'order': None, 'action': None}
    t = message.lower().strip()

    # 1) Suivi de commande (mots-clés multilingues)
    ref_match = _REF_RE.search(message)
    veut_suivi = any(k in t for k in [
        'où est', 'ou est', 'suivi', 'statut', 'ma commande', 'mes commandes',
        'ma derniere', 'ma dernière', 'où en est', 'ou en est',
        'where is', 'track', 'order status', 'my order',
        'dónde está', 'donde esta', 'mi pedido', 'seguimiento',
        'dov\'è', 'dove e', 'mio ordine', 'tracciare',
        'onde está', 'onde esta', 'meu pedido', 'rastrear',
        'wo ist', 'meine bestellung', 'verfolgen',
        'أين طلبي', 'تتبع', 'طلبي',
    ])
    if ref_match or veut_suivi:
        ref = ref_match.group(0) if ref_match else None
        res = suivi_commande(reference=ref, user=user)
        if res.get('trouvee'):
            c = res['commande']
            extras['order'] = c
            eta = ''
            if c.get('transporteur'):
                eta = _tpl(langue, 'order_eta_transporteur',
                           transporteur=c['transporteur'])
            reply = _tpl(langue, 'order_found',
                         ref=c['reference'], boutique=c['boutique'],
                         statut=c['statut_label'], total=c['total_price'],
                         adresse=c['adresse_livraison'], eta=eta)
        elif ref:
            reply = _tpl(langue, 'order_not_found_with_ref', ref=ref)
        else:
            reply = _tpl(langue, 'order_not_found')
        return {'reply': reply, **extras}

    # 2) Recherche produits
    prix_min, prix_max = _extraire_prix(message)
    categorie = categorie_depuis_texte(message)
    query = _mots_cles(message) or None

    veut_produit = bool(categorie or prix_max or prix_min) or any(k in t for k in [
        'veux', 'voudrais', 'cherche', 'besoin', 'acheter', 'achète', 'trouve',
        'propose', 'montre', 'recommande', 'produit', 'article', 'aimerais',
        'want', 'need', 'looking', 'find', 'show', 'recommend',
        'quiero', 'busco', 'necesito', 'mostrar', 'recomendar',
        'voglio', 'cerco', 'mostrami', 'consigliami',
        'quero', 'procuro', 'preciso',
        'will', 'möchte', 'suche', 'brauche', 'zeig',
        'أريد', 'أبحث', 'محتاج',
    ])

    if not veut_produit:
        return {'reply': _tpl(langue, 'default'), **extras}

    res = rechercher_produits(query=query, categorie=categorie,
                              prix_min=prix_min, prix_max=prix_max, tri='prix_asc')
    extras['products'] = res['produits']
    n = res['count']

    details = []
    if categorie:
        details.append(categorie.lower())
    if prix_min and prix_max:
        details.append(_tpl(langue, 'range_between',
                            min=int(prix_min), max=int(prix_max)))
    elif prix_max:
        details.append(_tpl(langue, 'range_max', max=int(prix_max)))
    elif prix_min:
        details.append(_tpl(langue, 'range_min', min=int(prix_min)))
    suffixe = (' ' + ', '.join(details)) if details else ''

    if n == 0:
        reply = _tpl(langue, 'no_products', suffixe=suffixe)
    else:
        # Pluriel : ajouter 's' sauf pour ar (où on garde vide)
        marque_plur = 's' if (n > 1 and langue not in ('ar',)) else ''
        if langue == 'it' and n > 1:
            marque_plur = 'i'  # prodotti
        reply = _tpl(langue, 'products_found',
                     n=n, s=marque_plur, suffixe=suffixe)
    return {'reply': reply, **extras}


# ─── Détection de la langue + salutations multilingues ──────────────────────

# Salutations regroupées PAR LANGUE pour pouvoir répondre dans la même langue.
# Langues supportées : fr, en, es, ar, it, pt, de, ber (tamazight/darija).
_GREETINGS_BY_LANG = {
    'fr':  {'bonjour', 'bonsoir', 'salut', 'coucou', 'bjr', 'cc'},
    'en':  {'hi', 'hello', 'hey', 'hiya', 'howdy', 'yo', 'sup'},
    'es':  {'hola', 'buenos', 'buenas'},
    'ar':  {'salam', 'salamou', 'salamu', 'asalam', 'assalam', 'salaam',
            'marhaba', 'marhba', 'ahlan', 'ahlen', 'sabah', 'masaa',
            'السلام', 'سلام', 'مرحبا', 'مرحبًا', 'أهلا', 'اهلا', 'صباح', 'مساء'},
    'it':  {'ciao', 'salve', 'buongiorno', 'buonasera'},
    'pt':  {'ola', 'olá', 'oi'},
    'de':  {'hallo', 'guten', 'servus', 'moin'},
    'ber': {'azul', 'azoul'},
}

# Index inversé : token -> langue (premier match)
_GREETING_TOKEN_TO_LANG = {tok: lang for lang, toks in _GREETINGS_BY_LANG.items() for tok in toks}
_GREETING_TOKENS = set(_GREETING_TOKEN_TO_LANG.keys())

# Phrases composées (token -> langue)
_GREETING_PHRASES = {
    'good morning': 'en', 'good evening': 'en', 'good afternoon': 'en', 'good night': 'en',
    'how are you': 'en', 'whats up': 'en', "what's up": 'en',
    'comment ca va': 'fr', 'comment ça va': 'fr', 'ca va': 'fr', 'ça va': 'fr',
    'salam alaikum': 'ar', 'salamu alaykum': 'ar', 'assalamu alaikum': 'ar',
    'buenos dias': 'es', 'buenos días': 'es', 'buenas tardes': 'es', 'buenas noches': 'es',
    'bom dia': 'pt', 'boa tarde': 'pt', 'boa noite': 'pt',
    'guten tag': 'de', 'guten morgen': 'de', 'guten abend': 'de',
}

# Mots-clés discriminants par langue (pour la détection en dehors des salutations).
# Liste courte mais représentative des termes les plus fréquents.
_LANG_KEYWORDS = {
    'fr': {'je', 'tu', 'le', 'la', 'les', 'un', 'une', 'des', 'est', 'pour',
           'avec', 'mon', 'ma', 'mes', 'cherche', 'veux', 'voudrais', 'besoin',
           'où', 'ou', 'commande', 'merci', 'svp', 'oui', 'non', 'pas',
           'aide', 'donne', 'moi', 'aimerais', 'pizza', 'restaurant'},
    'en': {'i', 'you', 'the', 'a', 'an', 'is', 'are', 'for', 'with', 'my',
           'what', 'where', 'how', 'want', 'need', 'order', 'please',
           'thanks', 'thank', 'yes', 'no', 'looking', 'find', 'show',
           'cheap', 'restaurant', 'pharmacy', 'food'},
    'es': {'yo', 'tu', 'el', 'la', 'los', 'las', 'un', 'una', 'unas', 'unos',
           'es', 'son', 'para', 'con', 'mi', 'que', 'quiero', 'busco',
           'donde', 'dónde', 'pedido', 'gracias', 'por', 'favor', 'si', 'sí',
           'no', 'barato', 'cerca', 'restaurante', 'farmacia', 'comida',
           'necesito'},
    'it': {'io', 'tu', 'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una',
           'è', 'sono', 'per', 'con', 'mio', 'mia', 'che', 'voglio', 'cerco',
           'dove', 'ordine', 'grazie', 'prego', 'sì', 'no', 'vicino',
           'ristorante', 'farmacia', 'cibo'},
    'pt': {'eu', 'tu', 'voce', 'você', 'o', 'a', 'os', 'as', 'um', 'uma',
           'é', 'são', 'para', 'com', 'meu', 'minha', 'que', 'quero',
           'busco', 'onde', 'pedido', 'obrigado', 'obrigada', 'sim', 'não',
           'nao', 'perto', 'restaurante', 'farmacia', 'farmácia', 'comida'},
    'de': {'ich', 'du', 'der', 'die', 'das', 'ein', 'eine', 'einen', 'ist',
           'sind', 'für', 'fur', 'mit', 'mein', 'meine', 'was', 'wo', 'wie',
           'will', 'möchte', 'mochte', 'suche', 'brauche', 'bestellung',
           'danke', 'bitte', 'ja', 'nein', 'nahe', 'restaurant', 'apotheke',
           'essen'},
}

# Réponses de bienvenue traduites
_GREETING_REPLIES = {
    'fr': (
        "👋 Bonjour ! Je suis votre assistant DeliverMap.\n"
        "Je peux vous aider à :\n"
        "🍽️ Trouver un restaurant proche de chez vous\n"
        "🛒 Commander dans un supermarché de votre région\n"
        "💊 Repérer une pharmacie ouverte près de vous\n"
        "📱 Découvrir des produits électroniques ou de mode\n"
        "📦 Suivre une commande en cours\n\n"
        "Dites-moi simplement ce que vous cherchez (par ex. « une pizza pas "
        "trop chère » ou « un supermarché près de moi ») 🙂"
    ),
    'en': (
        "👋 Hello! I'm your DeliverMap assistant.\n"
        "I can help you:\n"
        "🍽️ Find a restaurant near you\n"
        "🛒 Order from a supermarket in your area\n"
        "💊 Locate an open pharmacy nearby\n"
        "📱 Discover electronics or fashion products\n"
        "📦 Track an ongoing order\n\n"
        "Just tell me what you're looking for (e.g. \"an affordable pizza\" "
        "or \"a supermarket near me\") 🙂"
    ),
    'es': (
        "👋 ¡Hola! Soy tu asistente DeliverMap.\n"
        "Puedo ayudarte a:\n"
        "🍽️ Encontrar un restaurante cerca de ti\n"
        "🛒 Pedir en un supermercado de tu zona\n"
        "💊 Localizar una farmacia abierta cerca\n"
        "📱 Descubrir productos electrónicos o de moda\n"
        "📦 Seguir un pedido en curso\n\n"
        "Solo dime qué buscas (por ej. «una pizza barata» o «un supermercado "
        "cerca de mí») 🙂"
    ),
    'ar': (
        "👋 أهلاً! أنا مساعد DeliverMap.\n"
        "يمكنني مساعدتك على:\n"
        "🍽️ العثور على مطعم قريب منك\n"
        "🛒 الطلب من سوبر ماركت في منطقتك\n"
        "💊 إيجاد صيدلية مفتوحة قريبة\n"
        "📱 اكتشاف منتجات إلكترونية أو موضة\n"
        "📦 متابعة طلب جارٍ\n\n"
        "فقط أخبرني بما تبحث عنه (مثلاً «بيتزا رخيصة» أو «سوبر ماركت قريب مني») 🙂"
    ),
    'it': (
        "👋 Ciao! Sono il tuo assistente DeliverMap.\n"
        "Posso aiutarti a:\n"
        "🍽️ Trovare un ristorante vicino a te\n"
        "🛒 Ordinare da un supermercato della tua zona\n"
        "💊 Individuare una farmacia aperta nelle vicinanze\n"
        "📱 Scoprire prodotti elettronici o di moda\n"
        "📦 Seguire un ordine in corso\n\n"
        "Dimmi cosa cerchi (es. «una pizza economica» o «un supermercato "
        "vicino a me») 🙂"
    ),
    'pt': (
        "👋 Olá! Sou o seu assistente DeliverMap.\n"
        "Posso ajudá-lo a:\n"
        "🍽️ Encontrar um restaurante perto de si\n"
        "🛒 Pedir num supermercado da sua zona\n"
        "💊 Localizar uma farmácia aberta perto\n"
        "📱 Descobrir produtos eletrónicos ou de moda\n"
        "📦 Acompanhar um pedido em curso\n\n"
        "Diga-me o que procura (ex. «uma pizza barata» ou «um supermercado "
        "perto de mim») 🙂"
    ),
    'de': (
        "👋 Hallo! Ich bin Ihr DeliverMap-Assistent.\n"
        "Ich kann Ihnen helfen:\n"
        "🍽️ Ein Restaurant in Ihrer Nähe zu finden\n"
        "🛒 In einem Supermarkt Ihrer Region zu bestellen\n"
        "💊 Eine geöffnete Apotheke in der Nähe zu finden\n"
        "📱 Elektronik- oder Modeartikel zu entdecken\n"
        "📦 Eine laufende Bestellung zu verfolgen\n\n"
        "Sagen Sie mir einfach, was Sie suchen (z. B. „eine günstige Pizza\" "
        "oder „ein Supermarkt in meiner Nähe\") 🙂"
    ),
    'ber': (
        "👋 Azul! Nekk d amɛiwen n DeliverMap.\n"
        "Zemreɣ ad k-ɛiwneɣ:\n"
        "🍽️ Ad tafeḍ aɣṛum yeqṛeb ɣer-k\n"
        "🛒 Ad tessuteṛeḍ ɣer usupermaṛši n tama-k\n"
        "💊 Ad tafeḍ tafarmasit yeldin\n"
        "📱 Ad tafeḍ talaktrunit neɣ tlebsa\n"
        "📦 Ad tḍefreḍ atweṣṣi i d-iteddun\n\n"
        "Init-iyi-d kan d acu i tettnadiḍ 🙂"
    ),
}

# Mots qui révèlent une intention concrète (recherche, suivi, achat...). Si l'un
# de ces mots est présent, on N'INTERCEPTE PAS la salutation : on laisse le LLM
# (ou le fallback) traiter la demande complète.
_MOTS_INTENTION = {
    'cherche', 'cherchez', 'cherchais', 'veux', 'voudrais', 'besoin',
    'achete', 'achète', 'acheter', 'trouve', 'trouver', 'commande',
    'commandes', 'suivi', 'statut', 'panier', 'livraison', 'livrer',
    'where', 'find', 'order', 'track', 'buy', 'want', 'need', 'show',
    'looking', 'looking-for',
    'quiero', 'busco', 'necesito', 'donde', 'dónde', 'pedido',
    'voglio', 'cerco', 'ordine', 'dove',
    'quero', 'procuro', 'onde',
    'will', 'möchte', 'suche', 'brauche', 'bestellung',
    'pizza', 'casque', 'restaurant', 'restaurants', 'supermarche',
    'supermarché', 'supermarket', 'supermercado', 'supermercato', 'supermarkt',
    'pharmacie', 'pharmacies', 'pharmacy', 'farmacia', 'farmácia', 'apotheke',
    'electronique', 'électronique', 'electronics', 'elektronik', 'elettronica',
    'mode', 'fashion', 'moda',
    'vetement', 'vêtement', 'clothes', 'ropa', 'vestiti', 'kleidung',
    'medicament', 'médicament', 'medicine', 'medicina', 'medikament',
    'fast-food', 'tacos', 'burger', 'sandwich', 'salade',
    'food', 'comida', 'cibo', 'essen', 'comer',
}


def _normaliser(message):
    """Retourne (texte_clean, mots)."""
    if not message:
        return '', []
    texte = message.strip().lower()
    texte_clean = re.sub(r"[^\wàâçéèêëîïôûùüœñáíóúäöüßء-ي\s]", " ", texte)
    texte_clean = re.sub(r"\s+", " ", texte_clean).strip()
    return texte_clean, texte_clean.split()


def detecter_langue(message, defaut='fr'):
    """Détecte la langue d'un message (fr/en/es/ar/it/pt/de/ber).

    Stratégie :
      1. Détection par caractères arabes (rapide et sûr).
      2. Détection via salutation explicite.
      3. Comptage de mots-clés caractéristiques par langue.
      4. Repli sur la langue par défaut.
    """
    if not message:
        return defaut

    # 1) Caractères arabes -> arabe
    if re.search(r'[؀-ۿ]', message):
        return 'ar'

    texte_clean, mots = _normaliser(message)
    if not texte_clean:
        return defaut

    # 2) Phrases entières (good morning -> en, buenos dias -> es...)
    for phrase, lang in _GREETING_PHRASES.items():
        if phrase in texte_clean:
            return lang

    # 3) Salutation explicite : choisir la langue la plus spécifique
    # (hola -> es prioritaire sur hi -> en si les deux sont présents)
    for mot in mots:
        if mot in _GREETING_TOKEN_TO_LANG:
            lang = _GREETING_TOKEN_TO_LANG[mot]
            # 'hey' apparaît parfois mais on préfère l'EN par défaut pour lui
            if lang != 'fr' or len(mots) <= 2:
                return lang

    # 4) Comptage des mots-clés discriminants
    scores = {lang: 0 for lang in _LANG_KEYWORDS}
    for mot in mots:
        for lang, kws in _LANG_KEYWORDS.items():
            if mot in kws:
                scores[lang] += 1
    meilleur = max(scores, key=scores.get)
    if scores[meilleur] > 0:
        return meilleur

    # 5) Indice de signature : caractères spécifiques
    if re.search(r'[ñ¿¡]', message):
        return 'es'
    if re.search(r'[ßäöü]', message):
        return 'de'

    return defaut


def _est_salutation(message):
    """Retourne True si le message est essentiellement un mot de salutation
    (toutes langues confondues). Tolère la ponctuation et les variations.
    Renvoie False si une intention claire (achat, suivi...) est présente."""
    if not message:
        return False
    texte_clean, mots = _normaliser(message)
    if not texte_clean:
        return False

    # Si un mot d'intention est présent -> ce n'est pas une simple salutation
    if any(m in _MOTS_INTENTION for m in mots):
        return False

    # Phrases composées multilingues (good morning, buenos dias, ...)
    for phrase in _GREETING_PHRASES:
        if phrase in texte_clean:
            return True

    # Phrase courte (≤ 5 mots) : un seul token de salutation suffit
    if len(mots) <= 5:
        return any(mot in _GREETING_TOKENS for mot in mots)

    # Message plus long sans intention détectée : on accepte si le premier mot
    # est une salutation (ex : "Bonjour, j'aimerais juste discuter")
    return mots[0] in _GREETING_TOKENS


def _reponse_salutation(langue='fr'):
    """Construit la réponse de bienvenue + offre d'aide dans la langue donnée."""
    reply = _GREETING_REPLIES.get(langue) or _GREETING_REPLIES['fr']
    return {
        'reply': reply,
        'products': [],
        'order': None,
        'action': None,
    }


# ─── Point d'entrée ───────────────────────────────────────────────────────────

import logging as _logging
_log = _logging.getLogger(__name__)

_GREETING_FALLBACK = {
    'reply': (
        "Bonjour ! Je suis votre assistant DeliverMap. Posez-moi une "
        "question simple comme 'un casque a moins de 300 dh' ou "
        "'ou en est ma commande ?'."
    ),
    'products': [],
    'order': None,
    'action': None,
}


def run_conversation(message, history, user):
    """
    Point d'entree principal du chatbot.
    Essaie Mistral si la cle est configuree, sinon fallback local.
    La langue est détectée une seule fois et propagée à tous les chemins.
    """
    # Détection de la langue du message courant
    langue = detecter_langue(message, defaut='fr')

    # Interception des salutations multilingues : on offre directement de l'aide
    # avec des recommandations dans la langue détectée, sans appeler le LLM externe.
    if _est_salutation(message):
        return _reponse_salutation(langue=langue)

    api_key = getattr(settings, 'MISTRAL_API_KEY', None)
    if api_key:
        try:
            return _run_mistral(message, history, user, langue=langue)
        except Exception as exc:
            _log.warning("Mistral indisponible (%s), bascule sur fallback local.", exc)
    return _run_fallback(message, history, user, langue=langue)
