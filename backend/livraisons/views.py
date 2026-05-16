from rest_framework import viewsets, permissions
from .models import Livraison
from .serializers import LivraisonSerializer

class LivraisonViewSet(viewsets.ModelViewSet):
    queryset = Livraison.objects.all()
    serializer_class = LivraisonSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Livraison.objects.all()
        elif user.role == 'TRANSPORTEUR':
            return Livraison.objects.filter(transporteur__user=user)
        elif user.role == 'CLIENT':
            return Livraison.objects.filter(commande__client=user)
        elif user.role == 'FONDATEUR':
            return Livraison.objects.filter(commande__fondateur__user=user)
        return Livraison.objects.none()
