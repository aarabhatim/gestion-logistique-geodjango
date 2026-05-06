from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer

    @action(detail=True, methods=['post'])
    def lire(self, request, pk=None):
        """Marquer une notification comme lue."""
        notif = self.get_object()
        notif.lue = True
        notif.save()
        return Response({'status': 'notification marquée comme lue'})

    @action(detail=False, methods=['post'])
    def tout_lire(self, request):
        """Marquer toutes les notifications comme lues."""
        Notification.objects.filter(lue=False).update(lue=True)
        return Response({'status': 'toutes les notifications marquées comme lues'})

    @action(detail=False, methods=['get'])
    def non_lues(self, request):
        """Retourner uniquement les notifications non lues."""
        qs = Notification.objects.filter(lue=False)
        serializer = self.get_serializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})
