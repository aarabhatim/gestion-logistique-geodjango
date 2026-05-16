from django.db.models import Count, Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from commandes.models import Commande
from transporteurs.models import Transporteur
from django.contrib.auth import get_user_model

User = get_user_model()

class StatsView(APIView):
    """Endpoint de statistiques pour le dashboard et les rapports (admin uniquement)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Unauthorized'}, status=403)
            
        total_commandes = Commande.objects.count()
        livrees = Commande.objects.filter(statut='LIVREE').count()
        taux_livraison = round((livrees / total_commandes * 100), 1) if total_commandes > 0 else 0

        revenus_estimes = Commande.objects.aggregate(total=Sum('total_price'))['total'] or 0

        transporteurs_disponibles = Transporteur.objects.filter(is_available=True).count()
        
        return Response({
            'kpis': {
                'total_commandes': total_commandes,
                'commandes_livrees': livrees,
                'taux_livraison': taux_livraison,
                'revenus_estimes': round(revenus_estimes, 2),
                'total_clients': User.objects.filter(role='CLIENT').count(),
                'transporteurs_disponibles': transporteurs_disponibles,
            }
        })
