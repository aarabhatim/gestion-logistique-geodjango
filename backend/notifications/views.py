from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(destinataire=self.request.user)


class NonLuesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(destinataire=request.user, lue=False)
        return Response({'count': qs.count(), 'results': NotificationSerializer(qs[:10], many=True).data})


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
        return Response({'status': 'Toutes les notifications marquées comme lues.'})
