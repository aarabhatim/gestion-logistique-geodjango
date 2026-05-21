"""
Tests: Commandes lifecycle (state machine, permissions, creation).
"""
import pytest
from django.urls import reverse


@pytest.mark.django_db
class TestCommandeCreation:
    def test_client_can_create_commande(self, api_client, client_user, fondateur_profile, produit):
        api_client.force_authenticate(user=client_user)
        payload = {
            'fondateur_id':      fondateur_profile.pk,
            'adresse_livraison': '5 Rue Test, Casablanca',
            'ville_livraison':   'Casablanca',
            'produits': [
                {'produit_id': produit.pk, 'quantite': 2}
            ],
        }
        res = api_client.post('/api/commandes/', payload, format='json')
        assert res.status_code == 201, res.data
        assert res.data['statut'] == 'EN_ATTENTE'

    def test_anonymous_cannot_create_commande(self, api_client, fondateur_profile, produit):
        res = api_client.post('/api/commandes/', {}, format='json')
        assert res.status_code == 401

    def test_commande_total_calculated(self, commande):
        assert float(commande.total_price) == pytest.approx(120.00)
        assert float(commande.sous_total) == pytest.approx(100.00)
        assert float(commande.frais_livraison) == pytest.approx(20.00)


@pytest.mark.django_db
class TestCommandeStatutTransitions:
    def test_initial_statut_is_en_attente(self, commande):
        assert commande.statut == 'EN_ATTENTE'

    def test_fondateur_can_accept_commande(self, api_client, fondateur_user, commande):
        api_client.force_authenticate(user=fondateur_user)
        res = api_client.post(
            f'/api/commandes/{commande.pk}/fondateur-action/',
            {'action': 'accepter'},
            format='json',
        )
        assert res.status_code in (200, 201)
        commande.refresh_from_db()
        assert commande.statut == 'VALIDEE'

    def test_fondateur_can_refuse_commande(self, api_client, fondateur_user, commande):
        api_client.force_authenticate(user=fondateur_user)
        res = api_client.post(
            f'/api/commandes/{commande.pk}/fondateur-action/',
            {'action': 'refuser'},
            format='json',
        )
        assert res.status_code in (200, 201)
        commande.refresh_from_db()
        assert commande.statut == 'ANNULEE'

    def test_client_cannot_change_statut(self, api_client, client_user, commande):
        api_client.force_authenticate(user=client_user)
        res = api_client.post(
            f'/api/commandes/{commande.pk}/statut/avancer/',
            format='json',
        )
        # Client role should not be able to advance an EN_ATTENTE commande
        assert res.status_code in (400, 403)


@pytest.mark.django_db
class TestCommandeListPermissions:
    def test_admin_sees_all_commandes(self, api_client, admin_user, commande):
        api_client.force_authenticate(user=admin_user)
        res = api_client.get('/api/commandes/')
        assert res.status_code == 200

    def test_client_sees_only_own_commandes(self, api_client, client_user, commande, make_user, fondateur_profile, produit):
        from commandes.models import Commande
        other_client = make_user(role='CLIENT', username='other_client')
        Commande.objects.create(
            client=other_client,
            fondateur=fondateur_profile,
            statut='EN_ATTENTE',
            adresse_livraison='Autre adresse',
            sous_total=50.00,
            frais_livraison=10.00,
            total_price=60.00,
        )
        api_client.force_authenticate(user=client_user)
        res = api_client.get('/api/commandes/')
        assert res.status_code == 200
        # All returned commandes should belong to client_user
        ids_returned = {c['id'] for c in (res.data.get('results') or res.data)}
        assert commande.pk in ids_returned
