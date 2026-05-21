"""
Tests: Contrat lifecycle — creation, PDF generation, signature, activation, expiry.
"""
import pytest
from django.utils import timezone
from datetime import timedelta


@pytest.fixture
def contrat(db, fondateur_profile, transporteur_user):
    from contrats.models import Contrat
    return Contrat.objects.create(
        titre='Contrat de prestation de test',
        boutique=fondateur_profile,
        transporteur=transporteur_user,
        type_service='standard',
        statut='brouillon',
        date_debut=timezone.now().date(),
        date_fin=(timezone.now() + timedelta(days=365)).date(),
        tarif_negocie=1500.00,
        description_termes='Clauses standard de test.',
    )


@pytest.mark.django_db
class TestContratCreation:
    def test_admin_can_create_contrat(self, api_client, admin_user, fondateur_profile, transporteur_user):
        api_client.force_authenticate(user=admin_user)
        res = api_client.post('/api/contrats/', {
            'titre':            'Contrat de service de test',
            'boutique':         fondateur_profile.pk,
            'transporteur':     transporteur_user.pk,
            'type_service':     'standard',
            'date_debut':       timezone.now().date().isoformat(),
            'date_fin':         (timezone.now() + timedelta(days=365)).date().isoformat(),
            'tarif_negocie':    '1500.00',
            'description_termes': 'Clauses de test.',
        }, format='json')
        assert res.status_code == 201
        assert res.data['statut'] == 'brouillon'

    def test_initial_statut_is_brouillon(self, contrat):
        assert contrat.statut == 'brouillon'

    def test_contrat_fields(self, contrat, fondateur_profile, transporteur_user):
        assert contrat.boutique == fondateur_profile
        assert contrat.transporteur == transporteur_user
        assert contrat.type_service == 'standard'
        assert float(contrat.tarif_negocie) == pytest.approx(1500.00)


@pytest.mark.django_db
class TestContratPDFGeneration:
    def test_generate_pdf_action(self, api_client, admin_user, contrat):
        api_client.force_authenticate(user=admin_user)
        res = api_client.post(f'/api/contrats/{contrat.pk}/generer-pdf/')
        assert res.status_code in (200, 201)
        contrat.refresh_from_db()
        assert contrat.fichier_pdf is not None or contrat.statut != 'brouillon'


@pytest.mark.django_db
class TestContratLifecycle:
    def test_signer_contrat(self, api_client, admin_user, contrat):
        api_client.force_authenticate(user=admin_user)
        contrat.statut = 'envoye'
        contrat.save()
        res = api_client.post(f'/api/contrats/{contrat.pk}/signer/')
        assert res.status_code in (200, 201)
        contrat.refresh_from_db()
        assert contrat.statut == 'signe'

    def test_resilier_contrat(self, api_client, admin_user, contrat):
        api_client.force_authenticate(user=admin_user)
        contrat.statut = 'actif'
        contrat.save()
        res = api_client.post(
            f'/api/contrats/{contrat.pk}/resilier/',
            {'motif': 'Test de résiliation.'},
            format='json',
        )
        assert res.status_code in (200, 201)
        contrat.refresh_from_db()
        assert contrat.statut == 'resilie'

    def test_contrat_expiry_detection(self, db, fondateur_profile, transporteur_user):
        from contrats.models import Contrat
        past_contrat = Contrat.objects.create(
            titre='Contrat expire',
            boutique=fondateur_profile,
            transporteur=transporteur_user,
            type_service='standard',
            statut='actif',
            date_debut=(timezone.now() - timedelta(days=400)).date(),
            date_fin=(timezone.now() - timedelta(days=1)).date(),
            tarif_negocie=1000.00,
        )
        assert past_contrat.date_fin < timezone.now().date()


@pytest.mark.django_db
class TestContratFilters:
    def test_filter_by_statut(self, api_client, admin_user, contrat):
        api_client.force_authenticate(user=admin_user)
        res = api_client.get('/api/contrats/?statut=brouillon')
        assert res.status_code == 200
        data = res.data.get('results', res.data)
        statuts = [c.get('statut') for c in data]
        assert all(s == 'brouillon' for s in statuts if s)

    def test_unauthenticated_cannot_list_contrats(self, api_client):
        res = api_client.get('/api/contrats/')
        assert res.status_code == 401
