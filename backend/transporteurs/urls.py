from django.urls import path
from .views import (
    SOSView, ChatLivraisonView, ObjectifsView, MultiLivraisonsView,
    MonProfilTransporteurView, ToggleDisponibiliteView,
    TransporteurDisponiblesView, MesStatsView,
    AdminTransporteurListView, AdminTransporteurValidateView,
    ExportTransporteursXLSXView,
)
from .views_finances import (
    DashboardFinancierView, HistoriquePaiementsView, ExportRevenusCSVView,
)
from .views_gamification import (
    BadgesView, VerifierBadgesView, NiveauView, ClassementTransporteursView,
)
from .views_planning import (
    DisponibilitesHebdoView, DisponibiliteDetailView,
    AbsencesView, AbsenceValiderView, AdminAbsencesListView,
    PreferencesZonesView,
)
from .views_vehicule import (
    EntretiensView, EntretienDetailView, AlertesVehiculeView,
    DocumentsVehiculeView, DocumentVehiculeDetailView,
)
from .views_communication import (
    MessageTemplatesView, PartagerPositionView, HistoriqueChatView,
)

urlpatterns = [
    # ── Profil & Disponibilité ────────────────────────────────────────────────
    path('mon-profil/', MonProfilTransporteurView.as_view(), name='mon-profil-transporteur'),
    path('disponibilite/', ToggleDisponibiliteView.as_view(), name='toggle-disponibilite'),
    path('mes-stats/', MesStatsView.as_view(), name='mes-stats-transporteur'),
    path('disponibles/', TransporteurDisponiblesView.as_view(), name='transporteurs-disponibles'),

    # ── Admin ─────────────────────────────────────────────────────────────────
    path('admin/', AdminTransporteurListView.as_view(), name='admin-transporteurs'),
    path('admin/<int:pk>/valider/', AdminTransporteurValidateView.as_view(), name='admin-valider-transporteur'),
    path('admin/absences/', AdminAbsencesListView.as_view(), name='admin-absences'),

    # ── SOS & Chat ───────────────────────────────────────────────────────────
    path('sos/', SOSView.as_view(), name='sos'),
    path('chat/templates/', MessageTemplatesView.as_view(), name='chat-templates'),
    path('chat/<int:commande_id>/', ChatLivraisonView.as_view(), name='chat'),
    path('chat/<int:commande_id>/position/', PartagerPositionView.as_view(), name='chat-partager-position'),
    path('chat/<int:commande_id>/historique/', HistoriqueChatView.as_view(), name='chat-historique'),

    # ── Objectifs & Multi-livraisons ─────────────────────────────────────────
    path('objectifs/', ObjectifsView.as_view(), name='objectifs'),
    path('multi-livraisons/', MultiLivraisonsView.as_view(), name='multi-livraisons'),

    # ── Dashboard financier ──────────────────────────────────────────────────
    path('finances/', DashboardFinancierView.as_view(), name='finances'),
    path('finances/historique/', HistoriquePaiementsView.as_view(), name='finances-historique'),
    path('finances/export/', ExportRevenusCSVView.as_view(), name='finances-export-csv'),

    # ── Gamification ─────────────────────────────────────────────────────────
    path('badges/', BadgesView.as_view(), name='badges'),
    path('badges/verifier/', VerifierBadgesView.as_view(), name='badges-verifier'),
    path('niveau/', NiveauView.as_view(), name='niveau'),
    path('classement/', ClassementTransporteursView.as_view(), name='classement'),

    # ── Planning & Disponibilités ────────────────────────────────────────────
    path('planning/disponibilites/', DisponibilitesHebdoView.as_view(), name='planning-disponibilites'),
    path('planning/disponibilites/<int:pk>/', DisponibiliteDetailView.as_view(), name='planning-disponibilite-detail'),
    path('planning/absences/', AbsencesView.as_view(), name='planning-absences'),
    path('planning/absences/<int:pk>/valider/', AbsenceValiderView.as_view(), name='planning-absence-valider'),
    path('planning/preferences-zones/', PreferencesZonesView.as_view(), name='planning-preferences-zones'),

    # ── Véhicule ─────────────────────────────────────────────────────────────
    path('vehicule/entretiens/', EntretiensView.as_view(), name='vehicule-entretiens'),
    path('vehicule/entretiens/<int:pk>/', EntretienDetailView.as_view(), name='vehicule-entretien-detail'),
    path('vehicule/alertes/', AlertesVehiculeView.as_view(), name='vehicule-alertes'),
    path('vehicule/documents/', DocumentsVehiculeView.as_view(), name='vehicule-documents'),
    path('vehicule/documents/<int:pk>/', DocumentVehiculeDetailView.as_view(), name='vehicule-document-detail'),

    # ── Export ────────────────────────────────────────────────────────────────
    path('export/xlsx/', ExportTransporteursXLSXView.as_view(), name='export-transporteurs-xlsx'),
]
