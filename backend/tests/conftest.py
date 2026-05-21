"""
Pytest fixtures shared across all test modules.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def make_user(db):
    """Factory that creates a User with a given role."""
    def _make(role='CLIENT', **kwargs):
        defaults = {
            'username': f"user_{role.lower()}_{id(kwargs)}",
            'email':    f"user_{role.lower()}_{id(kwargs)}@test.com",
            'password': 'testpass123',
            'role':     role,
            'first_name': 'Test',
            'last_name':  role.capitalize(),
        }
        defaults.update(kwargs)
        return User.objects.create_user(**defaults)
    return _make


@pytest.fixture
def admin_user(make_user):
    return make_user(role='ADMIN')


@pytest.fixture
def fondateur_user(make_user):
    return make_user(role='FONDATEUR')


@pytest.fixture
def transporteur_user(make_user):
    return make_user(role='TRANSPORTEUR')


@pytest.fixture
def client_user(make_user):
    return make_user(role='CLIENT')


@pytest.fixture
def auth_client(api_client, admin_user):
    """API client authenticated as admin."""
    api_client.force_authenticate(user=admin_user)
    return api_client, admin_user


@pytest.fixture
def fondateur_profile(db, fondateur_user):
    from fondateurs.models import Fondateur
    return Fondateur.objects.create(
        user=fondateur_user,
        nom_boutique='Boutique Test',
        description='Test boutique',
        ville='Casablanca',
        is_verified=True,
        is_open=True,
    )


@pytest.fixture
def produit(db, fondateur_profile):
    from fondateurs.models import Produit
    return Produit.objects.create(
        fondateur=fondateur_profile,
        nom='Produit Test',
        prix=100.00,
        stock=50,
        stock_alerte=5,
        disponible=True,
    )


@pytest.fixture
def commande(db, client_user, fondateur_profile, produit):
    from commandes.models import Commande, CommandeProduit
    cmd = Commande.objects.create(
        client=client_user,
        fondateur=fondateur_profile,
        statut='EN_ATTENTE',
        adresse_livraison='123 Rue Test, Casablanca',
        sous_total=100.00,
        frais_livraison=20.00,
        total_price=120.00,
    )
    CommandeProduit.objects.create(
        commande=cmd,
        produit=produit,
        quantite=1,
        prix_unitaire=100.00,
        sous_total=100.00,
    )
    return cmd


@pytest.fixture
def transporteur_profile(db, transporteur_user):
    from transporteurs.models import Transporteur
    return Transporteur.objects.create(
        user=transporteur_user,
        vehicule_type='VOITURE',
        plaque='ABC-123',
        capacite_kg=200,
        is_verified=True,
        is_available=True,
    )
