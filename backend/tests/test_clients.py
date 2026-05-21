"""
Tests: Client CRUD, soft-delete, stats, and geo endpoint.
"""
import pytest


@pytest.fixture
def client_obj(db):
    from clients.models import Client
    return Client.objects.create(
        nom='Dupont',
        prenom='Jean',
        email='jean.dupont@test.com',
        telephone='+212600000001',
        adresse='10 Rue Test, Casablanca',
        actif=True,
    )


@pytest.mark.django_db
class TestClientCRUD:
    def test_admin_can_list_clients(self, api_client, admin_user, client_obj):
        api_client.force_authenticate(user=admin_user)
        res = api_client.get('/api/clients/')
        assert res.status_code == 200
        data = res.data.get('results', res.data)
        assert len(data) >= 1

    def test_admin_can_create_client(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        res = api_client.post('/api/clients/', {
            'nom':       'Martin',
            'prenom':    'Pierre',
            'email':     'pierre.martin@test.com',
            'telephone': '+212600000002',
            'adresse':   '5 Avenue Hassan II, Rabat',
        }, format='json')
        assert res.status_code == 201
        assert res.data['nom'] == 'Martin'

    def test_admin_can_update_client(self, api_client, admin_user, client_obj):
        api_client.force_authenticate(user=admin_user)
        res = api_client.patch(
            f'/api/clients/{client_obj.pk}/',
            {'telephone': '+212600000099'},
            format='json',
        )
        assert res.status_code == 200
        assert res.data['telephone'] == '+212600000099'

    def test_soft_delete_sets_actif_false(self, api_client, admin_user, client_obj):
        api_client.force_authenticate(user=admin_user)
        res = api_client.delete(f'/api/clients/{client_obj.pk}/')
        assert res.status_code in (200, 204)
        client_obj.refresh_from_db()
        # Soft delete should keep the object but set actif=False
        assert client_obj.actif is False

    def test_unauthenticated_cannot_access_clients(self, api_client):
        res = api_client.get('/api/clients/')
        assert res.status_code == 401


@pytest.mark.django_db
class TestClientStats:
    def test_stats_endpoint_returns_expected_fields(self, api_client, admin_user, client_obj):
        api_client.force_authenticate(user=admin_user)
        res = api_client.get('/api/clients/stats/')
        assert res.status_code == 200
        assert 'total' in res.data
        assert 'actifs' in res.data

    def test_stats_total_matches_count(self, api_client, admin_user, client_obj):
        from clients.models import Client
        api_client.force_authenticate(user=admin_user)
        res = api_client.get('/api/clients/stats/')
        assert res.data['total'] == Client.objects.count()


@pytest.mark.django_db
class TestClientToggleActif:
    def test_toggle_actif_changes_status(self, api_client, admin_user, client_obj):
        initial = client_obj.actif
        api_client.force_authenticate(user=admin_user)
        res = api_client.post(f'/api/clients/{client_obj.pk}/toggle-actif/')
        assert res.status_code == 200
        client_obj.refresh_from_db()
        assert client_obj.actif != initial
