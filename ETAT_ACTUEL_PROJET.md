# DeliverMap — État Actuel du Projet
> **Date de mise à jour :** 22 mai 2026  
> **Stack :** Django 5.1 + DRF + PostGIS · React 18 + Vite · Leaflet · Recharts · Zustand · Django Channels · Redis · Celery  
> **Nom du projet :** DeliverMap — Plateforme logistique full-stack (Maroc)

---

## Vue d'ensemble

DeliverMap est une plateforme logistique multi-rôles qui connecte **clients**, **transporteurs (chauffeurs)**, **fondateurs de boutiques** et **administrateurs**. Elle intègre la géolocalisation temps réel (PostGIS + Leaflet + OSRM), un système de livraison complet, un chatbot IA, et un back-office d'administration avancé.

### Tableau de bord global

| Composant | Statut |
|---|---|
| Backend — API & modèles | ✅ Terminé |
| Backend — Migrations | ✅ Terminé |
| Backend — Tests unitaires (pytest) | ✅ Écrits |
| Frontend — Partie Admin | ✅ Terminé |
| Frontend — Partie Client | ✅ Terminé |
| Frontend — Partie Chauffeur (Transporteur) | ✅ Terminé |
| Frontend — Partie Fondateur (boutique) | ✅ Terminé |
| WebSocket temps réel | ✅ Fonctionnel |
| Docker / Déploiement production | ❌ Non réalisé |
| Paiement en ligne réel | ❌ Non réalisé |
| Application mobile | ❌ Non réalisé |

---

## Backend — Ce qui est fait

### Authentification & Utilisateurs (`accounts/`)
- Modèle `CustomUser` avec 4 rôles : `ADMIN`, `CLIENT`, `TRANSPORTEUR`, `FONDATEUR`
- JWT via SimpleJWT : login, register, refresh token, logout avec blacklist
- Endpoint `auth/me/` pour récupérer le profil connecté
- Liste filtrée par rôle, recherche, pagination via `auth/admin/users/`
- Actions admin : bannir/débannir, réinitialiser mot de passe
- Permissions distinctes par rôle : `IsAdminRole`, `IsClientRole`, `IsTransporteurRole`, `IsFondateurRole`
- Impersonation : l'admin peut se connecter en tant qu'un autre utilisateur

### Commandes (`commandes/`)
- CRUD complet avec cycle de vie par rôle :
  - ADMIN : EN_ATTENTE → VALIDEE → EN_PREPARATION → EN_ROUTE → LIVREE
  - FONDATEUR : EN_ATTENTE → VALIDEE → EN_PREPARATION
  - TRANSPORTEUR : EN_PREPARATION → EN_ROUTE → LIVREE
  - CLIENT : peut annuler si pas encore EN_ROUTE
- Assignation d'un transporteur à une commande (modal admin)
- Calendrier des livraisons admin
- Avis clients sur les commandes + réponse fondateur
- Prévisions de demande

### Transporteurs (`transporteurs/`)
- Profil avec véhicule, plaque, note moyenne, nombre de livraisons
- Disponibilité temps réel (`is_available`, `is_on_delivery`)
- GPS live (latitude/longitude mis à jour en continu)
- SOS avec 6 types d'urgence (Accident, Panne, Agression, Médical, Perdu, Autre) → notification admin automatique
- Chat client ↔ chauffeur (`ChatMessage`)
- Objectifs hebdomadaires (`ObjectifHebdomadaire`)
- Multi-livraisons (commandes proposées au transporteur)

### Scoring (`scoring/`)
- Score global sur 4 dimensions pondérées :
  - Ponctualité × 0.30 + Fiabilité × 0.30 + Satisfaction × 0.25 + Rapidité × 0.15
- Recalcul automatique via Django signals (après livraison, avis, incident)
- Endpoints : score individuel, classement global, recalcul forcé
- Podium 🥇🥈🥉 dans l'interface admin

### Incidents (`incidents/`)
- Modèle `Incident` avec 8 types : accident, panne, vol, colis_endommage, retard, client_absent, adresse_introuvable, autre
- Cycle de vie : ouvert → en_cours → résolu
- Upload multi-photos (`IncidentPhoto`)
- Notification automatique aux admins à chaque signalement
- Prise en charge et résolution depuis l'interface admin

### Tickets Support (`tickets/`)
- Système multi-rôle (client, chauffeur, fondateur)
- Thread de messages avec notes internes
- SLA par priorité : urgent=4h, moyen=24h, faible=72h
- Statuts : ouvert → en_cours → en_attente → resolu → ferme

### Contrats (`contrats/`)
- Génération de contrats transporteurs avec clauses personnalisées
- Génération PDF via ReportLab (en-tête professionnel)
- Cycle de vie : brouillon → envoyé → signé → actif → expiré/résilié
- Téléchargement PDF direct

### Fondateurs / Boutiques (`fondateurs/`)
- CRUD boutique : catégorie, ville, horaires, frais de livraison
- Galerie photos boutique
- Gestion stock produits : toggle disponibilité, alertes rupture, mise à jour stock
- Avis clients + réponse fondateur
- Prévisions de demande

### Modules additionnels
- **Zones** (`zones/`) : zones géographiques de livraison avec PostGIS
- **Promotions** (`promotions/`) : codes promo, réductions, stats
- **Bannières** (`bannieres/`) : bannières marketing
- **Blacklist** (`blacklist/`) : blocage d'utilisateurs ou d'adresses

### Analytics & Heatmap (`analytics/`)
- 5 types de cartes de chaleur PostGIS : Commandes, Retards, Incidents, Profits, Trafic
- Filtres par période : 7j / 30j / 90j
- Dashboard analytique admin et fondateur

### Notifications (`notifications/`)
- Notifications push via WebSocket (Django Channels + Daphne)
- Envoi automatique : retard, SOS, changement statut, incident, ticket
- Email SMTP avec templates HTML
- Actions : marquer lu, supprimer, supprimer toutes les lues

### Chatbot (`chatbot/`)
- Chatbot conversationnel IA intégré
- Accès aux outils métier (commandes, livraisons, statuts)

### Infrastructure Backend
- WebSocket via Django Channels + Daphne + Redis
- Celery pour les tâches périodiques (rappels, nettoyage, alertes)
- PostGIS pour les données géographiques
- API versionnée v2.0

---

## Frontend — Ce qui est fait

### Architecture générale
- React 18 + Vite avec routing protégé par rôle (`ProtectedRoute`)
- `AuthContext` avec JWT auto-refresh sur 401
- `cartStore` (Zustand) pour le panier client
- Sidebar dynamique par rôle
- Fichier centralisé `services/api.js` pour tous les endpoints
- Markers Leaflet en SVG inline (sans dépendance CDN externe)
- i18n avec clés de traduction pour tous les modules

### Partie Admin

| Page | Contenu |
|---|---|
| Dashboard | Stats globales (commandes, revenus, transporteurs, clients) |
| LiveDashboard | Carte temps réel des livraisons en cours |
| Commandes | Tableau + filtres + transitions statut + modal assigner transporteur |
| Clients | Liste des clients avec bannir/débannir, reset password |
| Transporteurs | Profil + disponibilité + scoring + classement radar |
| Incidents | Carte Leaflet avec marqueurs colorés par type, filtres, prise en charge |
| Scoring | Tableau classement podium, barres progression 4D, radar Recharts |
| Tickets | Gestion multi-rôle, thread chat, SLA visuel |
| Contrats | PDF lifecycle, génération + téléchargement |
| Zones | Gestion des zones de livraison |
| Promotions | Codes promo + stats |
| Bannières | Gestion bannières marketing |
| Blacklist | Blocage utilisateurs/adresses |
| Heatmap | 5 types + filtre période + export CSV |
| Calendrier | Calendrier des livraisons |
| Prévisions | Prévisions de demande |
| Impersonation | Connexion en tant qu'autre utilisateur |
| Paramètres | Thème, langue, configuration |

### Partie Client

| Fonctionnalité | Contenu |
|---|---|
| Catalogue boutiques | Navigation par catégorie |
| Panier | CartSidebar avec gestion quantités |
| Checkout | Modal 3 modes adresse (GPS, quartier, manuel) + mode paiement + calcul frais |
| Suivi commandes | Tableau des commandes en cours + carte Leaflet live |
| Tickets support | Création + suivi tickets |
| Chatbot widget | Assistant IA conversationnel |
| Profil | Gestion profil utilisateur |

### Partie Chauffeur (Transporteur)

| Fonctionnalité | Contenu |
|---|---|
| Dashboard | Stats, revenus, livraisons du jour |
| GPS OSRM | Itinéraire temps réel vers le point de livraison |
| Mode conduite | Interface plein écran optimisée conduite |
| Multi-livraisons | Gestion de plusieurs commandes simultanées |
| QR Code | Scan QR pour confirmer la livraison |
| Objectifs hebdomadaires | Suivi des objectifs avec progression |
| SOS | 6 types d'urgence avec envoi notification admin |
| Chat client | Messagerie directe avec le client |
| Signalement incident | Stepper 2 étapes + capture GPS + upload 4 photos |
| Tickets support | Accès et création de tickets |

### Partie Fondateur (Boutique)

| Fonctionnalité | Contenu |
|---|---|
| Dashboard temps réel | Notifications sonores + chronomètre nouvelle commande |
| Gestion commandes | Réception + traitement des commandes |
| Stock produits | Toggle disponibilité + alertes rupture + édition inline |
| Galerie photos | Gestion des photos de la boutique |
| Avis clients | Consultation + réponse aux avis |
| Analytics | Statistiques de la boutique |

---

## Bugs corrigés (résumé)

| Bug | Fix appliqué |
|---|---|
| `user is not defined` dans Commandes.jsx | Ajout `useAuth()` + destructuring |
| Double prefix `/api/clients/clients/` | Corrigé en `clients/` dans api.js |
| Modal Assigner/Détail jamais affiché | Conditions `{assigning && ...}` ajoutées |
| Statut `EN_LIVRAISON` invalide | Corrigé en `EN_ROUTE` |
| Chatbot cassé | Réécriture complète de ChatbotWidget.jsx |
| Leaflet CDN bloqué par Edge | Remplacement par divIcon SVG inline |
| JSX error SOS modal ChauffeurDashboard | Modal déplacé dans le return unique |
| 500 sur zones/promotions/bannieres/blacklist | Migrations 0001_initial créées |
| 401 sur auth/login/ | Intercepteur axios skip endpoints auth |
| Clients vides en admin | Changé vers `auth/admin/users/?role=CLIENT` |
| `i18n.formatPrice` non défini | Remplacé par `Intl.NumberFormat` |

---

## Ce qui reste à faire

### Priorité haute
- Déploiement production (Nginx + Gunicorn + Docker Compose)
- Sécurisation : `DEBUG=False`, `SECRET_KEY` en `.env`, `ALLOWED_HOSTS` restreint
- Centre de notifications dépliable dans le Header (panel paginé)

### Priorité moyenne
- Module `clients/` backend : contenu minimal à compléter
- Module `tracking/` non exposé dans `urls.py`
- Email réel en production (SendGrid / SMTP)
- Tâches Celery périodiques (vérification expirations contrats)
- Dashboard chauffeur — onglet Tickets (lien manquant)
- Client dashboard — raccourci création de ticket
- Notifications WebSocket live dans Header (actuellement polling 30s)

### Priorité basse
- Paiement en ligne réel (Stripe, CMI, PayPal)
- Application mobile (React Native / Flutter)
- Upload photos profil utilisateur
- Vérification KYC transporteur (CNI, permis)
- Dashboard analytics avancé (évolution 12 mois)
- Système de parrainage / points de fidélité
- Support multi-langue complet (AR / EN)
- Rate limiting DRF sur les endpoints publics
- Pagination backend (incidents, scoring, tickets)
- Tests E2E (Playwright / Cypress)
- Monitoring production (Sentry, logs structurés)

---

## Arborescence du projet

```
DeliverMap/
├── backend/
│   ├── accounts/          ✅ Auth JWT, CustomUser, permissions
│   ├── analytics/         ✅ Dashboard + 5 types heatmap PostGIS
│   ├── bannieres/         ✅ Bannières marketing
│   ├── blacklist/         ✅ Blocage utilisateurs/adresses
│   ├── chatbot/           ✅ LLM conversationnel + outils métier
│   ├── clients/           ⚠️  App créée, contenu minimal
│   ├── commandes/         ✅ Cycle commande complet + avis
│   ├── contrats/          ✅ PDF + lifecycle complet
│   ├── fondateurs/        ✅ Boutiques + produits + stock + codes promo
│   ├── incidents/         ✅ Signalement + photos + résolution
│   ├── livraisons/        ✅ Tracking temps réel + confirmation
│   ├── notifications/     ✅ Push WS + email HTML
│   ├── promotions/        ✅ Codes promo + stats
│   ├── scoring/           ✅ Score 4D + classement + signals
│   ├── tickets/           ✅ Support multi-rôle + SLA + thread
│   ├── tracking/          ⚠️  App créée, non exposée dans urls.py
│   ├── transporteurs/     ✅ Profil + SOS + chat + objectifs
│   ├── zones/             ✅ Zones géographiques PostGIS
│   └── logistique_backend/✅ Settings, URLs, ASGI, WSGI
│
└── frontend/src/
    ├── contexts/           ✅ Auth, Theme, I18n, Notifications+WS
    ├── stores/             ✅ Zustand (auth, cart, tracking)
    ├── services/api.js     ✅ Tous les endpoints API centralisés
    ├── utils/leafletIcons.js ✅ Markers SVG inline
    ├── components/
    │   ├── Header.jsx      ✅ Cloche + polling ⚠️ panel dépliable manquant
    │   ├── ChatbotWidget.jsx ✅
    │   └── MapComponent.jsx ✅ Carte admin temps réel
    └── pages/
        ├── admin/          ✅ 12+ pages admin complètes
        ├── client/         ✅ Catalogue + panier + checkout + suivi
        ├── chauffeur/      ✅ GPS + SOS + incidents + objectifs
        └── store/          ✅ Dashboard fondateur + stock + analytics
```

---

## Commandes pour relancer le projet

```bash
# Backend
cd backend
python manage.py migrate
python manage.py runserver                         # API HTTP :8000
daphne logistique_backend.asgi:application         # WebSocket :8001

# Celery (optionnel)
celery -A logistique_backend worker --loglevel=info
celery -A logistique_backend beat --loglevel=info

# Frontend
cd frontend
npm install
npm run dev                                        # Interface :5173
```

---

*Document généré le 22 mai 2026 — DeliverMap v2.0*
