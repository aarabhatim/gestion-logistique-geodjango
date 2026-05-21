from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models as django_models
from django.utils import timezone
from .models import Banniere
from .serializers import BanniereSerializer


class BanniereViewSet(viewsets.ModelViewSet):
    queryset = Banniere.objects.all()
    serializer_class = BanniereSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def actives(self, request):
        now = timezone.now()
        role = getattr(request.user, 'role', None)
        qs = Banniere.objects.filter(
            actif=True,
            date_debut__lte=now,
        ).filter(
            django_models.Q(date_fin__isnull=True) | django_models.Q(date_fin__gte=now)
        ).filter(
            django_models.Q(role_cible='all') | django_models.Q(role_cible=role)
        )
        return Response(BanniereSerializer(qs, many=True).data)
