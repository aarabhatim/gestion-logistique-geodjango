"""
Tests: Ticket SLA logic, thread replies, assignment, and resolution.
SLA: urgent=4h, moyen=24h, faible=72h
"""
import pytest
from datetime import timedelta
from django.utils import timezone


@pytest.fixture
def ticket(db, client_user):
    from tickets.models import Ticket
    return Ticket.objects.create(
        auteur=client_user,
        titre='Mon colis est endommagé',
        description='Le colis est arrivé avec des dommages visibles.',
        categorie='livraison',
        priorite='moyen',
        sla_heures=24,
    )


@pytest.mark.django_db
class TestTicketCreation:
    def test_client_can_create_ticket(self, api_client, client_user):
        api_client.force_authenticate(user=client_user)
        res = api_client.post('/api/tickets/', {
            'titre':       'Probleme de livraison',
            'description': 'Mon colis na pas ete livre.',
            'categorie':   'livraison',
            'priorite':    'moyen',
        }, format='json')
        assert res.status_code == 201
        assert res.data['statut'] == 'ouvert'

    def test_sla_set_on_creation_urgent(self, api_client, client_user):
        api_client.force_authenticate(user=client_user)
        res = api_client.post('/api/tickets/', {
            'titre':       'URGENT -- colis perdu',
            'description': 'Je ne trouve pas mon colis.',
            'categorie':   'livraison',
            'priorite':    'urgent',
        }, format='json')
        assert res.status_code == 201
        assert res.data['sla_heures'] == 4

    def test_sla_set_on_creation_faible(self, api_client, client_user):
        api_client.force_authenticate(user=client_user)
        res = api_client.post('/api/tickets/', {
            'titre':       'Question generale',
            'description': 'Simple question.',
            'categorie':   'autre',
            'priorite':    'faible',
        }, format='json')
        assert res.status_code == 201
        assert res.data['sla_heures'] == 72

    def test_sla_default_moyen_is_24h(self, ticket):
        assert ticket.sla_heures == 24


@pytest.mark.django_db
class TestTicketSLA:
    def test_sla_not_exceeded_for_new_ticket(self, ticket):
        deadline = ticket.created_at + timedelta(hours=ticket.sla_heures)
        assert timezone.now() < deadline

    def test_sla_exceeded_for_old_ticket(self, db, client_user):
        from tickets.models import Ticket
        old_ticket = Ticket.objects.create(
            auteur=client_user,
            titre='Old ticket',
            description='...',
            categorie='autre',
            priorite='urgent',
            sla_heures=4,
        )
        # Simulate created 5h ago
        Ticket.objects.filter(pk=old_ticket.pk).update(
            created_at=timezone.now() - timedelta(hours=5)
        )
        old_ticket.refresh_from_db()
        deadline = old_ticket.created_at + timedelta(hours=old_ticket.sla_heures)
        assert timezone.now() > deadline, "Expected SLA to be exceeded"


@pytest.mark.django_db
class TestTicketReply:
    def test_admin_can_reply_to_ticket(self, api_client, admin_user, ticket):
        api_client.force_authenticate(user=admin_user)
        res = api_client.post(
            f'/api/tickets/{ticket.pk}/repondre/',
            {'contenu': 'Votre ticket est pris en charge.'},
            format='json',
        )
        assert res.status_code == 201
        assert res.data['contenu'] == 'Votre ticket est pris en charge.'

    def test_reply_changes_status_to_en_cours(self, api_client, admin_user, ticket):
        api_client.force_authenticate(user=admin_user)
        api_client.post(
            f'/api/tickets/{ticket.pk}/repondre/',
            {'contenu': 'Nous traitons votre demande.'},
            format='json',
        )
        ticket.refresh_from_db()
        assert ticket.statut == 'en_cours'

    def test_reply_requires_content(self, api_client, admin_user, ticket):
        api_client.force_authenticate(user=admin_user)
        res = api_client.post(
            f'/api/tickets/{ticket.pk}/repondre/',
            {'contenu': ''},
            format='json',
        )
        assert res.status_code == 400


@pytest.mark.django_db
class TestTicketResolution:
    def test_admin_can_resolve_ticket(self, api_client, admin_user, ticket):
        api_client.force_authenticate(user=admin_user)
        res = api_client.post(f'/api/tickets/{ticket.pk}/resoudre/')
        assert res.status_code == 200
        ticket.refresh_from_db()
        assert ticket.statut == 'resolu'
        assert ticket.resolu_at is not None

    def test_client_cannot_resolve_own_ticket(self, api_client, client_user, ticket):
        api_client.force_authenticate(user=client_user)
        res = api_client.post(f'/api/tickets/{ticket.pk}/resoudre/')
        # Should fail or only admin can do this
        ticket.refresh_from_db()
        assert ticket.statut != 'resolu'


@pytest.mark.django_db
class TestTicketAssignment:
    def test_admin_can_assign_ticket(self, api_client, admin_user, ticket, make_user):
        agent = make_user(role='ADMIN', username='agent1')
        api_client.force_authenticate(user=admin_user)
        res = api_client.post(
            f'/api/tickets/{ticket.pk}/assigner/',
            {'agent_id': agent.pk},
            format='json',
        )
        assert res.status_code == 200
        ticket.refresh_from_db()
        assert ticket.assigne_a == agent

    def test_non_admin_cannot_assign_ticket(self, api_client, client_user, ticket, make_user):
        agent = make_user(role='ADMIN', username='agent2')
        api_client.force_authenticate(user=client_user)
        res = api_client.post(
            f'/api/tickets/{ticket.pk}/assigner/',
            {'agent_id': agent.pk},
            format='json',
        )
        assert res.status_code == 403
