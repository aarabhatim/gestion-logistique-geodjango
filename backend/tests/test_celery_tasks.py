"""
Tests: Celery periodic tasks — expiration contrats, nettoyage notifications.
These run synchronously (no broker needed) by calling task functions directly.
"""
import pytest
from django.utils import timezone
from datetime import timedelta


@pytest.mark.django_db
class TestContratExpirationTask:
    def test_task_expires_active_contrats_past_date(self, db, fondateur_profile, transporteur_user):
        from contrats.models import Contrat
        from logistique_backend.tasks import verifier_expirations_contrats

        expired = Contrat.objects.create(
            titre='Contrat de test expire',
            boutique=fondateur_profile,
            transporteur=transporteur_user,
            type_service='standard',
            statut='actif',
            date_debut=(timezone.now() - timedelta(days=400)).date(),
            date_fin=(timezone.now() - timedelta(days=2)).date(),
            tarif_negocie=1000.00,
        )
        result = verifier_expirations_contrats()
        expired.refresh_from_db()
        assert expired.statut == 'expire'
        assert '1' in result or 'expire' in result.lower()

    def test_task_leaves_valid_contrats_intact(self, db, fondateur_profile, transporteur_user):
        from contrats.models import Contrat
        from logistique_backend.tasks import verifier_expirations_contrats

        valid = Contrat.objects.create(
            titre='Contrat de test actif',
            boutique=fondateur_profile,
            transporteur=transporteur_user,
            type_service='standard',
            statut='actif',
            date_debut=timezone.now().date(),
            date_fin=(timezone.now() + timedelta(days=365)).date(),
            tarif_negocie=1000.00,
        )
        verifier_expirations_contrats()
        valid.refresh_from_db()
        assert valid.statut == 'actif'


@pytest.mark.django_db
class TestNettoyageNotificationsTask:
    def test_task_deletes_old_read_notifications(self, db, admin_user):
        from notifications.models import Notification
        from logistique_backend.tasks import nettoyer_notifications

        old_notif = Notification.objects.create(
            destinataire=admin_user,
            titre='Old notification',
            message='This is old.',
            lue=True,
        )
        # Simulate 31 days ago
        Notification.objects.filter(pk=old_notif.pk).update(
            date_creation=timezone.now() - timedelta(days=31)
        )
        count_before = Notification.objects.count()
        result = nettoyer_notifications()
        count_after = Notification.objects.count()
        assert count_after < count_before
        assert not Notification.objects.filter(pk=old_notif.pk).exists()

    def test_task_preserves_recent_notifications(self, db, admin_user):
        from notifications.models import Notification
        from logistique_backend.tasks import nettoyer_notifications

        recent = Notification.objects.create(
            destinataire=admin_user,
            titre='Recent notification',
            message='This is recent.',
            lue=True,
        )
        nettoyer_notifications()
        assert Notification.objects.filter(pk=recent.pk).exists()
