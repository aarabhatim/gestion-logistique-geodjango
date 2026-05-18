"""
Signaux qui déclenchent le recalcul du score transporteur.
Branché sur :
  - post_save Commande  → quand statut devient LIVREE
  - post_save Avis      → quand un avis TRANSPORTEUR est posté
  - post_save Incident  → quand un incident est créé ou résolu
"""
from django.db.models.signals import post_save
from django.dispatch import receiver


def _recalculer_score(user):
    """Crée ou met à jour le ScoreTransporteur pour un user transporteur."""
    if not user or getattr(user, 'role', None) != 'TRANSPORTEUR':
        return
    try:
        from scoring.models import ScoreTransporteur
        score, _ = ScoreTransporteur.objects.get_or_create(transporteur=user)
        score.recalculer()
    except Exception:
        pass


@receiver(post_save, sender='commandes.Commande')
def on_commande_livree(sender, instance, **kwargs):
    if instance.statut == 'LIVREE' and instance.transporteur:
        _recalculer_score(instance.transporteur)


@receiver(post_save, sender='commandes.Avis')
def on_avis_transporteur(sender, instance, **kwargs):
    if instance.cible_type == 'TRANSPORTEUR' and instance.commande.transporteur:
        _recalculer_score(instance.commande.transporteur)


@receiver(post_save, sender='incidents.Incident')
def on_incident(sender, instance, **kwargs):
    if instance.commande.transporteur:
        _recalculer_score(instance.commande.transporteur)
