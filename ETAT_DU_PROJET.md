# DeliverMap — Récapitulatif de Session de Développement

> **Projet :** DeliverMap — Plateforme logistique full-stack (Maroc)
> **Stack :** Django 5.1 + DRF + PostGIS · React 18 + Vite · Leaflet · Recharts · Zustand · Django Channels · Redis · Celery

---

## ✅ BACKEND — Tout complété (156 fichiers Python, 0 erreur de syntaxe)

### 1. Module Incidents chauffeur
**Fichiers :** `incidents/models.py`, `incidents/views.py`, `incidents/serializers.py`, `incidents/urls.py`, `incidents/admin.py`, `incidents/migrations/`

| Élément | Détail |
|---|---|
| **Modèles** | `Incident` (type, statut, position GPS, description, notes résolution) + `IncidentPhoto` (upload multi-photos) |
| **Endpoints** | `GET/POST /api/incidents/` · `GET/POST /api/incidents/{id}/` · `POST /api/incidents/{id}/resoudre/` · `POST /api/incidents/{id}/prendre-en-charge/` · `GET /api/incidents/mes-incidents/` · `GET /api/incidents/stats/` · `POST /api/incidents/{id}/photos/` |
| **Types** | accident · panne · vol · colis_endommage · retard · client_absent · adresse_introuvable · autre |
| **Statuts** | ouvert → en_cours → resolu |
| **Notifications** | Notification automatique aux admins à chaque signalement |

### 2. Module Scoring Transporteurs
**Fichiers :** `scoring/models.py`, `scoring/views.py`, `scoring/serializers.py`, `scoring/urls.py`, `scoring/signals.py`, `scoring/apps.py`, `scoring/migrations/`

| Élément | Détail |
|---|---|
| **Modèle** | `ScoreTransporteur` avec 4 dimensions pondérées |
| **Formule** | `score_global = ponctualite×0.30 + fiabilite×0.30 + satisfaction×0.25 + rapidite×0.15` |
| **Endpoints** | `GET /api/scoring/mon-score/` · `GET /api/scoring/classement/` · `POST /api/scoring/{id}/recalculer/` · `POST /api/scoring/recalculer-tous/` |
| **Signals** | Recalcul automatique après chaque commande livrée, avis, ou incident |

### 3. Module Tickets Support
**Fichiers :** `tickets/models.py`, `tickets/views.py`, `tickets/serializers.py`, `tickets/urls.py`, `tickets/migrations/`

| Élément | Détail |
|---|---|
| **Modèles** | `Ticket` (sujet, catégorie, priorité, SLA) + `TicketMessage` (thread, notes internes) |
| **SLA** | urgent=4h · moyen=24h · faible=72h |
| **Endpoints** | `GET/POST /api/tickets/` · `GET /api/tickets/mes-tickets/` · `POST /api/tickets/{id}/repondre/` · `POST /api/tickets/{id}/assigner/` · `POST /api/tickets/{id}/changer-statut/` |
| **Statuts** | ouvert → en_cours → en_attente → resolu → ferme |

### 4. Module Contrats
**Fichiers :** `contrats/models.py`, `contrats/views.py`, `contrats/serializers.py`, `contrats/urls.py`, `contrats/migrations/`

| Élément | Détail |
|---|---|
| **Modèle** | `Contrat` avec référence auto, clauses, dates, PDF path |
| **Génération PDF** | ReportLab — clauses + en-tête professionnel |
| **Endpoints** | CRUD + `POST /api/contrats/{id}/generer-pdf/` · `GET /api/contrats/{id}/telecharger-pdf/` · `POST /api/contrats/{id}/signer/` · `POST /api/contrats/{id}/activer/` · `POST /api/contrats/{id}/resilier/` · `POST /api/contrats/verifier-expirations/` |
| **Cycle de vie** | brouillon → envoye → signe → actif → expire/resilie |

### 5. Notifications — Compléments
**Fichiers :** `notifications/views.py`, `notifications/urls.py`

| Ajout | Endpoint |
|---|---|
| Supprimer une notification | `DELETE /api/notifications/{id}/supprimer/` |
| Supprimer toutes les lues | `DELETE /api/notifications/supprimer-lues/` |
| Alertes retard livraison | `GET /api/notifications/alertes-retard/` |

### 6. Heatmap — 5 types d'analyse
**Fichiers :** `analytics/views.py`, `analytics/urls.py`

| Type | Endpoint | Filtre |
|---|---|---|
| Commandes | `GET /api/analytics/heatmap/commandes/` | `?periode=7\|30\|90` |
| Retards | `GET /api/analytics/heatmap/retards/` | `?periode=` |
| Incidents | `GET /api/analytics/heatmap/incidents/` | `?periode=` |
| Profits | `GET /api/analytics/heatmap/profits/` | `?periode=` |
| Trafic | `GET /api/analytics/heatmap/trafic/` | `?periode=` |

### 7. Gestion Stock Boutiques
**Fichiers :** `fondateurs/views.py`, `fondateurs/urls.py`, `fondateurs/signals.py`, `fondateurs/apps.py`

| Fonctionnalité | Endpoint |
|---|---|
| Toggle disponibilité produit | `POST /api/fondateurs/mes-produits/{id}/toggle-disponibilite/` |
| Mise à jour stock | `PATCH /api/fondateurs/mes-produits/{id}/stock/` |
| Alertes rupture stock | `GET /api/fondateurs/mon-stock/alertes/` |
| Signal auto | Désactivation produit à stock=0, alerte à stock≤seuil |

### 8. Configuration globale
**Fichiers modifiés :** `logistique_backend/settings.py`, `logistique_backend/urls.py`, `logistique_backend/asgi.py`

- INSTALLED_APPS enrichi : incidents, scoring, tickets, contrats, clients, tracking, chatbot
- 4 nouveaux includes d'URLs : incidents, scoring, tickets, contrats
- Version API passée à 2.0
- Fichiers reconstruits suite au bug de troncature Windows NTFS + encodage UTF-8

---

## ✅ FRONTEND — Tout complété (10 fichiers créés/modifiés)

### 1. `src/services/api.js` — Clients API complets
```
incidentsApi   → list, detail, signaler, resoudre, prendreEnCharge, mesIncidents, stats, ajouterPhoto
scoringApi     → monScore, detail, classement, recalculer, recalculerTous
ticketsApi     → list, create, detail, repondre, assigner, changerStatut, mesTickets
contratsApi    → list, detail, creer, genererPdf, telechargerPdf, signer, activer, resilier, verifierExpirations
notificationsApi → + supprimer, supprimerLues, alertesRetard
analyticsApi   → + heatmapCommandes/Retards/Incidents/Profits/Trafic(periode)
fondateursApi  → + toggleDisponibilite, majStock, stockAlertes
```

### 2. `src/pages/Incidents.jsx` — Refonte complète (admin)
- Carte Leaflet avec marqueurs colorés par type d'incident (8 types, 8 couleurs)
- KPIs : total / ouverts / en cours / résolus
- Filtres statut + type avec reset
- Panel latéral : détail complet, photos, notes résolution inline
- Prise en charge + résolution depuis l'interface

### 3. `src/pages/chauffeur/SignalerIncident.jsx` *(nouveau)*
- Stepper 2 étapes : choix du type (grille visuelle 8 types) → détails
- Sélection commande EN_ROUTE active
- Capture GPS automatique (navigator.geolocation)
- Upload jusqu'à 4 photos avec preview et suppression
- Confirmation visuelle après envoi

### 4. `src/pages/Scoring.jsx` *(nouveau)*
- Tableau classement avec podium 🥇🥈🥉
- Barres de progression par dimension avec couleur dédiée
- Panneau radar Recharts au clic (RadarChart animé)
- Tri par colonne (clic header)
- Recalcul individuel ou global en un clic

### 5. `src/pages/Tickets.jsx` *(nouveau)*
- Mode admin (file complète + filtres) et mode utilisateur (mes tickets)
- Thread chat avec bulles alignées gauche/droite
- Changement statut admin (prendre en charge / résoudre / fermer)
- Modal de création avec catégorie, priorité, description
- SLA visuel (OK / Dépassé)

### 6. `src/pages/Contrats.jsx` *(nouveau)*
- Liste avec filtres statut + type
- Génération PDF (bouton → POST API)
- Téléchargement PDF direct (blob download)
- Actions lifecycle : Signer / Activer / Résilier (avec confirmation motif)
- Panneau détail latéral + vérification expirations

### 7. `src/pages/store/Products.jsx` — Refonte stock
- Édition stock inline (icône crayon → input Enter/Esc)
- Toggle disponibilité en un clic (ToggleLeft/ToggleRight)
- Panel alertes rupture avec badge rouge animé
- Indicateurs visuels de stock bas (orange) et rupture (rouge)
- CRUD produit complet avec modal (créer + modifier)

### 8. `src/pages/admin/HeatmapPage.jsx` — Extension 5 types
- Sélecteur de type (Commandes / Retards / Incidents / Profits / Trafic)
- Filtre période : 7 jours / 30 jours / 90 jours
- Couleur thématique par type de heatmap
- Export CSV du jeu de données affiché
- Conservation des layers boutiques + rayons + couverture territoriale

### 9. `src/App.jsx` — Nouvelles routes + sidebar
```
/scoring                    → Scoring (admin)
/tickets                    → Tickets (tous rôles)
/contrats                   → Contrats (admin)
/chauffeur/signaler-incident → SignalerIncident (transporteur)
```
Sidebar enrichie : Scoring, Tickets, Contrats (section Management)

### 10. `src/pages/chauffeur/ChauffeurDashboard.jsx` — Card incident
- Card "Signaler un incident" dans l'onglet Dashboard
- Bouton rouge avec navigation vers `/chauffeur/signaler-incident`

---

## 🔴 RESTE À FAIRE

### Backend

| Tâche | Priorité | Notes |
|---|---|---|
| **Tests unitaires** | Haute | Aucun test `pytest` / `unittest` écrit. À créer pour : incidents, scoring, tickets, contrats |
| **Module `clients/`** | Moyenne | App créée dans settings mais `models.py`, `views.py`, `urls.py` sont vides ou stub |
| **Module `tracking/`** | Moyenne | App créée mais pas exposée dans `urls.py` principal |
| **Email réel** | Moyenne | `EMAIL_BACKEND = console` en dev. À remplacer par SendGrid / SMTP pour production |
| **Celery tasks** | Moyenne | `CELERY_BROKER_URL` configuré mais aucune tâche périodique définie (ex: vérification expirations contrats auto) |
| **Upload images cloud** | Basse | `MEDIA_ROOT` local. En production : migrer vers S3 / Cloudinary |
| **Rate limiting** | Basse | Aucun throttling DRF configuré sur les endpoints publics |
| **Pagination incidents/scoring** | Basse | Endpoints retournent tout sans pagination `?page=` |
| **WebSocket notifications** | Basse | Le channel Daphne existe mais les nouveaux modules (tickets, incidents) n'envoient pas de push WS |

### Frontend

| Tâche | Priorité | Notes |
|---|---|---|
| **Centre de notifications dépliable** | Haute | `Header.jsx` affiche un badge non-lues. Il manque le panel dépliable paginé (liste + marquer lue + supprimer) |
| **Transporteurs — onglet Scoring** | Haute | `Transporteurs.jsx` (admin) ne montre pas le score radar. À intégrer dans le panneau détail |
| **Dashboard chauffeur — onglet Tickets** | Moyenne | Le chauffeur ne peut pas accéder à `/tickets` depuis son dashboard (pas de lien dans TabNav) |
| **Client dashboard — Tickets** | Moyenne | `ClientDashboard.jsx` n'a pas de raccourci vers la création de ticket |
| **Notifications WS live** | Moyenne | `NotificationContext.jsx` a le WS mais le badge dans `Header.jsx` se rafraîchit par polling (30s). À connecter en live sur le socket existant |
| **Page Rapports — nouveaux KPIs** | Basse | `Rapports.jsx` ne remonte pas les stats incidents / scoring / tickets |
| **Store Analytics** | Basse | `store/Analytics.jsx` n'appelle pas les vrais endpoints analytics fondateur |
| **Pagination frontend** | Basse | Aucune page ne gère `?page=N` — à implémenter pour tickets, contrats, incidents en volume |
| **Tests E2E** | Basse | Aucun test Vitest / Playwright |
| **i18n** | Basse | Clés de traduction manquantes pour : scoring, tickets, contrats, incidents (types) |

### DevOps / Production

| Tâche | Priorité | Notes |
|---|---|---|
| **Docker Compose** | Haute | Aucun `docker-compose.yml` — nécessaire pour déployer Django + Redis + Daphne + Celery |
| **Variables d'environnement** | Haute | `SECRET_KEY`, `DB_PASS` en clair dans `settings.py` fallback. À externaliser dans `.env` strict |
| **ALLOWED_HOSTS** | Haute | `ALLOWED_HOSTS = ['*']` — à restreindre en production |
| **DEBUG=False** | Haute | À s'assurer que `DEBUG=False` en production avec `STATIC_ROOT` correctement servi |
| **CORS** | Moyenne | `CORS_ALLOW_ALL_ORIGINS = True` — à restreindre aux domaines de production |
| **SSL / HTTPS** | Moyenne | Aucune config SSL (Nginx reverse proxy recommandé) |
| **Migrations production** | Moyenne | `makemigrations` + `migrate` sur la base de prod à planifier |
| **Monitoring** | Basse | Aucun Sentry / logging structuré |

---

## 📁 Arborescence complète du projet

```
projet dev/
├── backend/
│   ├── accounts/          ✅ Auth JWT, CustomUser, profils
│   ├── analytics/         ✅ Dashboard admin + fondateur + 6 heatmap endpoints
│   ├── chatbot/           ✅ LLM conversationnel
│   ├── clients/           ⚠️  App créée, contenu minimal
│   ├── commandes/         ✅ Cycle commande complet + avis
│   ├── contrats/          ✅ NOUVEAU — PDF + lifecycle
│   ├── fondateurs/        ✅ Boutiques + produits + stock + codes promo
│   ├── incidents/         ✅ NOUVEAU — Signalement + photos + résolution
│   ├── livraisons/        ✅ Tracking temps réel + confirmation
│   ├── notifications/     ✅ Push WS + compléments delete/retard
│   ├── scoring/           ✅ NOUVEAU — Score 4D + classement + signals
│   ├── tickets/           ✅ NOUVEAU — Support multi-rôle + SLA + thread
│   ├── tracking/          ⚠️  App créée, non exposée dans urls.py
│   ├── transporteurs/     ✅ Profil + disponibilité + admin validation
│   └── logistique_backend/✅ Settings, URLs, ASGI, WSGI
│
└── frontend/
    └── src/
        ├── App.jsx              ✅ Routes + sidebar mis à jour
        ├── services/api.js      ✅ Tous les clients API
        ├── contexts/            ✅ Auth, Theme, I18n, Notification+WS
        ├── stores/              ✅ Zustand (auth, cart, tracking)
        ├── components/
        │   ├── Header.jsx       ✅ Bell + polling · ⚠️ panel dépliable manquant
        │   └── ChatbotWidget.jsx✅
        ├── pages/
        │   ├── Dashboard.jsx    ✅
        │   ├── Commandes.jsx    ✅
        │   ├── Boutiques.jsx    ✅
        │   ├── Clients.jsx      ✅
        │   ├── Transporteurs.jsx✅ · ⚠️ onglet scoring manquant
        │   ├── Incidents.jsx    ✅ REFAIT — carte + filtres
        │   ├── Scoring.jsx      ✅ NOUVEAU — radar + classement
        │   ├── Tickets.jsx      ✅ NOUVEAU — multi-rôle + thread
        │   ├── Contrats.jsx     ✅ NOUVEAU — PDF + lifecycle
        │   ├── MapPage.jsx      ✅
        │   ├── Rapports.jsx     ✅ · ⚠️ nouveaux KPIs manquants
        │   ├── admin/
        │   │   ├── HeatmapPage.jsx  ✅ ÉTENDU — 5 types + période
        │   │   └── SettingsPage.jsx ✅
        │   ├── auth/            ✅ Login, Register
        │   ├── chauffeur/
        │   │   ├── ChauffeurDashboard.jsx ✅ + card incident
        │   │   └── SignalerIncident.jsx   ✅ NOUVEAU
        │   ├── client/
        │   │   └── ClientDashboard.jsx ✅ · ⚠️ lien tickets manquant
        │   └── store/
        │       ├── StoreDash.jsx   ✅
        │       ├── Orders.jsx      ✅
        │       ├── Products.jsx    ✅ REFAIT — stock + alertes
        │       └── Analytics.jsx   ⚠️ données statiques
```

---

## 🔧 Commandes utiles pour relancer le projet

```bash
# Backend
cd backend
python manage.py migrate
python manage.py runserver            # HTTP API
daphne logistique_backend.asgi:application  # WebSocket

# Celery (optionnel)
celery -A logistique_backend worker --loglevel=info
celery -A logistique_backend beat --loglevel=info

# Frontend
cd frontend
npm install
npm run dev
```

---

*Document généré le 18 mai 2026 — Session de développement DeliverMap*
