"""
Tests: Incidents creation, status transitions, and admin resolution.
"""
import pytest


@pytest.fixture
def incident(db, commande, transporteur_profile, transporteur_user):
    commande.transporteur = transporteur_user
    commande.statut = 'EN_ROUTE'
    commande.save()
    from incidents.models import Incident
    return Incident.objects.create(
        commande=commande,
        type_incident='retard',
        description='Trafic dense sur autoroute.',
        statut='ouvert',
    )


@pytest.mark.django_db
class TestIncidentCreation:
    def test_transporteur_can_create_incident(self, api_client, transporteur_user, commande):
        commande.transporteur = transporteur_user
        commande.statut = 'EN_ROUTE'
        commande.save()
        api_client.force_authenticate(user=transporteur_user)
        res = api_client.post('/api/incidents/', {
            'commande':       commande.pk,
            'type_incident':  'retard',
            'description':    'Panne moteur sur la route.',
        }, format='json')
        assert res.status_code == 201
        assert res.data['properties']['statut'] == 'ouvert'

    def test_anonymous_cannot_create_incident(self, api_client, commande):
        res = api_client.post('/api/incidents/', {
            'commande':      commande.pk,
            'type_incident': 'retard',
            'description':   'Test',
        }, format='json')
        assert res.status_code == 401

    def test_incident_has_correct_fields(self, incident):
        assert incident.type_incident == 'retard'
        assert incident.statut == 'ouvert'
        assert incident.date_signalement is not None
        assert incident.date_resolution is None


@pytest.mark.django_db
class TestIncidentResolution:
    def test_admin_can_resolve_incident(self, api_client, admin_user, incident):
        api_client.force_authenticate(user=admin_user)
        res = api_client.post(
            f'/api/incidents/{incident.pk}/resoudre/',
            {'notes_resolution': 'Incident traite et resolu.'},
            format='json',
        )
        assert res.status_code == 200
        incident.refresh_from_db()
        assert incident.statut == 'resolu'
        assert incident.date_resolution is not None
        assert 'resolu' in incident.notes_resolution.lower()

    def test_non_admin_cannot_resolve_incident(self, api_client, client_user, incident):
        api_client.force_authenticate(user=client_user)
        res = api_client.post(
            f'/api/incidents/{incident.pk}/resoudre/',
            {'notes_resolution': 'Test'},
            format='json',
        )
        assert res.status_code == 403

    def test_admin_can_set_en_traitement(self, api_client, admin_user, incident):
        api_client.force_authenticate(user=admin_user)
        res = api_client.post(f'/api/incidents/{incident.pk}/en-traitement/')
        assert res.status_code == 200
        incident.refresh_from_db()
        assert incident.statut == 'en_traitement'


@pytest.mark.django_db
class TestIncidentFilters:
    def test_filter_by_statut(self, api_client, admin_user, incident):
        api_client.force_authenticate(user=admin_user)
        res = api_client.get('/api/incidents/?statut=ouvert')
        assert res.status_code == 200
        data = res.data.get('results', res.data)
        statuts = [i.get('statut') for i in data]
        assert all(s == 'ouvert' for s in statuts)

    def test_filter_by_type(self, api_client, admin_user, incident):
        api_client.force_authenticate(user=admin_user)
        res = api_client.get('/api/incidents/?type=retard')
        assert res.status_code == 200
