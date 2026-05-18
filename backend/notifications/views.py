from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """Liste paginee des notifications de l'utilisateur connecte."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(destinataire=self.request.user)
        type_notif = self.request.query_params.get('type')
        lue = self.request.query_params.get('lue')
        if type_notif:
            qs = qs.filter(type_notif=type_notif.upper())
        if lue is not None:
            qs = qs.filter(lue=(lue.lower() == 'true'))
        return qs


class NonLuesView(APIView):
    """Badge + apercu des 10 dernieres notifications non lues (bell icon)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(destinataire=request.user, lue=False)
        return Response({
            'count': qs.count(),
            'results': NotificationSerializer(qs[:10], many=True).data,
        })


class MarquerLueView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, destinataire=request.user)
        except Notification.DoesNotExist:
            return Response({'error': 'Notification introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        notif.lue = True
        notif.save(update_fields=['lue'])
        return Response({'status': 'ok'})


class ToutMarquerLuView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(destinataire=request.user, lue=False).update(lue=True)
        return Response({'status': 'Toutes les notifications marquees comme lues.'})


class SupprimerNotificationView(APIView):
    """Supprimer une notification."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, destinataire=request.user)
        except Notification.DoesNotExist:
            return Response({'error': 'Notification introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        notif.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SupprimerToutesView(APIView):
    """Vider toutes les notifications lues."""
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        count, _ = Notification.objects.filter(
            destinataire=request.user, lue=True
        ).delete()
        return Response({'supprimees': count})


class AlertesRetardView(APIView):
    """
    Detecte les commandes EN_ROUTE depassant leur delai estime
    et envoie des notifications de retard. Endpoint admin.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.utils import timezone
        from commandes.models import Commande
        from .models import envoyer_notification

        if request.user.role not in ('ADMIN',):
            return Response({'detail': 'Reserve aux admins.'}, status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        en_retard = Commande.objects.filter(
            statut='EN_ROUTE',
            estimated_delivery__lt=now,
            estimated_delivery__isnull=False,
        ).select_related('client', 'transporteur')

        notifiees = 0
        for commande in en_retard:
            deja_notifie = Notification.objects.filter(
                destinataire=commande.client,
                type_notif='WARNING',
                commande_id=commande.pk,
                titre__icontains='retard',
            ).exists()
            if not deja_notifie:
                retard_min = int((now - commande.estimated_delivery).total_seconds() / 60)
                envoyer_notification(
                    commande.client,
                    titre=f"Retard - Commande {commande.reference}",
                    message=f"Votre commande {commande.reference} accuse un retard "
                            f"d'environ {retard_min} minutes.",
                    type_notif='WARNING',
                    commande_id=commande.pk,
                )
                notifiees += 1

        return Response({'commandes_en_retard': en_retard.count(), 'notifications_envoyees': notifiees})
