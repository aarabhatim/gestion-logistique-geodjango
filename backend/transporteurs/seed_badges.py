"""
Script de seed des badges par défaut.
Exécution : python manage.py shell < transporteurs/seed_badges.py
  ou : python -c "import django; django.setup(); exec(open('transporteurs/seed_badges.py').read())"
"""
from transporteurs.models import Badge

BADGES = [
    # Volume livraisons
    {'code': 'LIV_10',    'nom': 'Débutant',          'icone': '📦', 'cat': 'LIVRAISONS',   'seuil': 10,   'desc': '10 livraisons effectuées'},
    {'code': 'LIV_50',    'nom': 'Actif',              'icone': '🚀', 'cat': 'LIVRAISONS',   'seuil': 50,   'desc': '50 livraisons effectuées'},
    {'code': 'LIV_100',   'nom': 'Centurion',          'icone': '💯', 'cat': 'LIVRAISONS',   'seuil': 100,  'desc': '100 livraisons effectuées'},
    {'code': 'LIV_500',   'nom': 'Vétéran',            'icone': '⭐', 'cat': 'LIVRAISONS',   'seuil': 500,  'desc': '500 livraisons effectuées'},
    {'code': 'LIV_1000',  'nom': 'Légende',            'icone': '👑', 'cat': 'LIVRAISONS',   'seuil': 1000, 'desc': '1000 livraisons effectuées'},
    # Ponctualité (score sur 100)
    {'code': 'PONC_70',   'nom': 'Ponctuel',           'icone': '⏰', 'cat': 'PONCTUALITE',  'seuil': 70,   'desc': 'Score ponctualité ≥ 70'},
    {'code': 'PONC_90',   'nom': 'Toujours à l\'heure','icone': '🕐', 'cat': 'PONCTUALITE',  'seuil': 90,   'desc': 'Score ponctualité ≥ 90'},
    # Satisfaction (note × 20 → /100)
    {'code': 'SAT_80',    'nom': 'Apprécié',           'icone': '👍', 'cat': 'SATISFACTION', 'seuil': 80,   'desc': 'Note client ≥ 4.0/5'},
    {'code': 'SAT_95',    'nom': 'Excellent',          'icone': '🌟', 'cat': 'SATISFACTION', 'seuil': 95,   'desc': 'Note client ≥ 4.75/5'},
    # Sécurité (zéro incident ce mois)
    {'code': 'SEC_0',     'nom': 'Mois sans incident', 'icone': '🛡️', 'cat': 'SECURITE',     'seuil': 0,    'desc': 'Aucun incident ce mois-ci'},
    # Fidélité (ancienneté en jours)
    {'code': 'FID_30',    'nom': 'Premier mois',       'icone': '🎉', 'cat': 'FIDELITE',     'seuil': 30,   'desc': '1 mois sur la plateforme'},
    {'code': 'FID_180',   'nom': 'Demi-année',         'icone': '🥈', 'cat': 'FIDELITE',     'seuil': 180,  'desc': '6 mois sur la plateforme'},
    {'code': 'FID_365',   'nom': 'Un an de service',   'icone': '🥇', 'cat': 'FIDELITE',     'seuil': 365,  'desc': '1 an sur la plateforme'},
]

created = 0
for b in BADGES:
    obj, is_new = Badge.objects.get_or_create(
        code=b['code'],
        defaults={
            'nom': b['nom'],
            'icone': b['icone'],
            'categorie': b['cat'],
            'seuil': b['seuil'],
            'description': b['desc'],
        }
    )
    if is_new:
        created += 1

print(f"✅ {created} badge(s) créé(s), {len(BADGES) - created} déjà existant(s).")
