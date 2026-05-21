from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from notifications.models import envoyer_notification
from utils.ws_broadcast import broadcast_group
from .models import Ticket, TicketMessage
from .serializers import TicketSerializer, TicketDetailSerializer, TicketMessageSerializer

User = get_user_model()

# SLA par défaut selon priorité (en heures)
SLA_PRIORITE = {'urgent': 4, 'moyen': 24, 'faible': 72}


class TicketViewSet(viewsets.ModelViewSet):
    """
    CRUD tickets. Chaque rôle voit ses propres tickets (clients/chauffeurs)
    ou tous les tickets (admins).
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action in ('retrieve',):
            return TicketDetailSerializer
        return TicketSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Ticket.objects.select_related(
            'auteur', 'assigne_a', 'commande'
        ).prefetch_related('messages')
        if user.role == 'ADMIN':
            pass  # Admins voient tout
        else:
            qs = qs.filter(auteur=user)

        # Filtres
        statut = self.request.query_params.get('statut')
        priorite = self.request.query_params.get('priorite')
        categorie = self.request.query_params.get('categorie')
        assigne = self.request.query_params.get('assigne_a')
        if statut:
            qs = qs.filter(statut=statut)
        if priorite:
            qs = qs.filter(priorite=priorite)
        if categorie:
            qs = qs.filter(categorie=categorie)
        if assigne:
            qs = qs.filter(assigne_a_id=assigne)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        sla = SLA_PRIORITE.get(
            self.request.data.get('priorite', 'moyen'), 24
        )
        ticket = serializer.save(auteur=self.request.user, sla_heures=sla)
        # Notifier les admins (notification individuelle + WebSocket)
        admins = User.objects.filter(role='ADMIN', is_active=True)
        for admin in admins:
            envoyer_notification(
                admin,
                titre=f"🎫 Nouveau ticket [{ticket.get_priorite_display()}] — #{ticket.pk}",
                message=f"{ticket.auteur.get_full_name() or ticket.auteur.username} : {ticket.titre}",
                type_notif='INFO',
            )
        # Broadcast WebSocket vers le groupe admin_tickets
        broadcast_group('admin_tickets', {
            'event': 'ticket_created',
            'ticket_id': ticket.pk,
            'titre': ticket.titre,
            'priorite': ticket.priorite,
            'statut': ticket.statut,
            'auteur': ticket.auteur.get_full_name() or ticket.auteur.username,
        })

    # ── Actions ───────────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='repondre')
    def repondre(self, request, pk=None):
        """Ajouter un message dans le thread du ticket."""
        ticket = self.get_object()
        contenu = request.data.get('contenu', '').strip()
        if not contenu:
            return Response({'detail': 'Le contenu est requis.'}, status=status.HTTP_400_BAD_REQUEST)

        is_note = request.data.get('is_note_interne', False)
        # Seul un admin peut poster une note interne
        if is_note and request.user.role != 'ADMIN':
            is_note = False

        piece_jointe = request.FILES.get('piece_jointe')
        msg = TicketMessage.objects.create(
            ticket=ticket,
            auteur=request.user,
            contenu=contenu,
            is_note_interne=is_note,
            piece_jointe=piece_jointe,
        )

        # Mise à jour statut automatique
        if ticket.statut == 'ouvert' and request.user.role == 'ADMIN':
            ticket.statut = 'en_cours'
            ticket.save(update_fields=['statut'])
        elif ticket.statut == 'en_cours' and request.user != ticket.auteur:
            ticket.statut = 'en_attente'
            ticket.save(update_fields=['statut'])

        # Notifier l'auteur du ticket si ce n'est pas lui qui répond
        if request.user != ticket.auteur:
            envoyer_notification(
                ticket.auteur,
                titre=f"Reponse sur votre ticket #{ticket.pk}",
                message=f"Une reponse a ete apportee a votre ticket '{ticket.titre}'.",
                type_notif='INFO',
            )
            # Email de notification de réponse
            try:
                from utils.emails import email_ticket_reponse
                email_ticket_reponse(ticket, msg)
            except Exception:
                pass

        return Response(
            TicketMessageSerializer(msg, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'], url_path='mes-tickets')
    def mes_tickets(self, request):
        """Tickets de l'utilisateur connecté."""
        qs = Ticket.objects.filter(auteur=request.user).order_by('-created_at')
        serializer = TicketSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='changer-statut')
    def changer_statut(self, request, pk=None):
        """Changer le statut d'un ticket (admin uniquement)."""
        ticket = self.get_object()
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Réservé aux admins.'}, status=status.HTTP_403_FORBIDDEN)
        nouveau_statut = request.data.get('statut')
        statuts_valides = ['ouvert', 'en_cours', 'en_attente', 'resolu', 'ferme']
        if nouveau_statut not in statuts_valides:
            return Response({'detail': f'Statut invalide. Valeurs: {statuts_valides}'}, status=status.HTTP_400_BAD_REQUEST)
        ticket.statut = nouveau_statut
        if nouveau_statut == 'resolu':
            ticket.resolu_at = timezone.now()
            ticket.save(update_fields=['statut', 'resolu_at'])
        else:
            ticket.save(update_fields=['statut'])
        broadcast_group('admin_tickets', {'event': 'ticket_updated', 'ticket_id': ticket.pk, 'statut': ticket.statut})
        return Response({'statut': ticket.statut})

    @action(detail=False, methods=['get'], url_path='statistiques')
    def statistiques(self, request):
        """Statistiques globales des tickets (admin uniquement)."""
        from django.db.models import Count, Avg, F, ExpressionWrapper, DurationField
        qs = Ticket.objects.all()
        par_statut   = dict(qs.values_list('statut').annotate(n=Count('id')).values_list('statut', 'n'))
        par_priorite = dict(qs.values_list('priorite').annotate(n=Count('id')).values_list('priorite', 'n'))
        par_cat      = dict(qs.values_list('categorie').annotate(n=Count('id')).values_list('categorie', 'n'))
        resolus      = qs.filter(statut='resolu', resolu_at__isnull=False)
        taux = round(resolus.count() / max(qs.count(), 1) * 100, 1)
        return Response({
            'total': qs.count(),
            'ouverts': par_statut.get('ouvert', 0),
            'en_cours': par_statut.get('en_cours', 0),
            'en_attente': par_statut.get('en_attente', 0),
            'resolus': par_statut.get('resolu', 0),
            'fermes': par_statut.get('ferme', 0),
            'taux_resolution': taux,
            'par_priorite': par_priorite,
            'par_categorie': par_cat,
        })

    @action(detail=True, methods=['post'], url_path='assigner',
            permission_classes=[IsAuthenticated])
    def assigner(self, request, pk=None):
        """Assigner un ticket à un agent admin."""
        ticket = self.get_object()
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Réservé aux admins.'}, status=status.HTTP_403_FORBIDDEN)
        agent_id = request.data.get('agent_id')
        try:
            agent = User.objects.get(pk=agent_id, role='ADMIN')
        except User.DoesNotExist:
            return Response({'detail': 'Agent introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        ticket.assigne_a = agent
        if ticket.statut == 'ouvert':
            ticket.statut = 'en_cours'
        ticket.save(update_fields=['assigne_a', 'statut'])
        envoyer_notification(
            agent,
            titre=f"📋 Ticket #{ticket.pk} assigné à vous",
            message=f"Le ticket '{ticket.titre}' vous a été assigné.",
            type_notif='INFO',
        )
        broadcast_group('admin_tickets', {
            'event': 'ticket_assigned',
            'ticket_id': ticket.pk,
            'agent': agent.username,
            'statut': ticket.statut,
        })
        return Response({'status': 'assigné', 'agent': agent.username})

    @action(detail=True, methods=['post'], url_path='resoudre')
    def resoudre(self, request, pk=None):
        """Marquer un ticket comme résolu."""
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Réservé aux admins.'}, status=status.HTTP_403_FORBIDDEN)
        ticket = self.get_object()
        ticket.statut = 'resolu'
        ticket.resolu_at = timezone.now()
        ticket.save(update_fields=['statut', 'resolu_at'])
        envoyer_notification(
            ticket.auteur,
            titre=f"✅ Ticket #{ticket.pk} résolu",
            message=f"Votre ticket '{ticket.titre}' a été résolu.",
            type_notif='SUCCESS',
        )
        # Broadcast WebSocket
        broadcast_group('admin_tickets', {
            'event': 'ticket_updated',
            'ticket_id': ticket.pk,
            'statut': 'resolu',
        })
        return Response({'status': 'résolu'})

