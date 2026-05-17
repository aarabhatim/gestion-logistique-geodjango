"""
Diagnostic du chatbot DeliverMap.

Usage:
    cd backend
    python verify_chatbot.py

Imprime étape par étape l'import de chaque sous-module du chatbot et
affiche l'erreur exacte qui empêche Django d'enregistrer la route.
"""
import os
import sys
import traceback

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "logistique_backend.settings")

print("=" * 60)
print("DIAGNOSTIC CHATBOT DeliverMap")
print("=" * 60)


def step(name, fn):
    print(f"\n[?] {name} ...", end=" ", flush=True)
    try:
        result = fn()
        print("OK")
        return result
    except Exception as e:
        print("ECHEC")
        print("-" * 60)
        traceback.print_exc()
        print("-" * 60)
        sys.exit(1)


def _setup():
    import django
    django.setup()


step("Initialisation Django", _setup)
step("Import chatbot.apps",        lambda: __import__("chatbot.apps",        fromlist=["*"]))
step("Import chatbot.serializers", lambda: __import__("chatbot.serializers", fromlist=["*"]))
step("Import chatbot.tools",       lambda: __import__("chatbot.tools",       fromlist=["*"]))
step("Import chatbot.llm",         lambda: __import__("chatbot.llm",         fromlist=["*"]))
step("Import chatbot.views",       lambda: __import__("chatbot.views",       fromlist=["*"]))
step("Import chatbot.urls",        lambda: __import__("chatbot.urls",        fromlist=["*"]))

# Vérifier que la route est bien enregistrée par Django
def _check_urlconf():
    from django.urls import get_resolver
    resolver = get_resolver()
    patterns = [str(p.pattern) for p in resolver.url_patterns]
    found = any('chatbot' in p for p in patterns)
    if not found:
        raise RuntimeError(
            "La route api/chatbot/ n'est PAS enregistree. "
            "Routes vues : " + ", ".join(patterns)
        )
    return True


step("Verification route /api/chatbot/", _check_urlconf)

print("\n" + "=" * 60)
print("TOUT EST OK !")
print("=" * 60)
print("Redemarrez Django avec :  python manage.py runserver")
print("Le chatbot devrait fonctionner.")
