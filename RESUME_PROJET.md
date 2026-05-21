# DeliverMap — Résumé du projet

> **Date de mise à jour :** 21 mai 2026  
> **Stack :** Django REST Framework · React + Vite · Leaflet · SimpleJWT

---

## Statut global

| Partie | Statut |
|---|---|
| Backend — API & modèles | ✅ Terminé |
| Backend — Migrations | ✅ Terminé (à relancer si nouvelle base) |
| Frontend — Admin | ✅ Terminé |
| Frontend — Chauffeur | ✅ Terminé |
| Frontend — Client | ✅ Terminé |
| Frontend — Fondateur (boutique) | ✅ Terminé |
| WebSocket temps réel | ✅ Terminé |
| Tests unitaires (pytest) | ✅ Écrits |
| Déploiement / Production | ❌ Non fait |

---

## ✅ CE QUI EST FAIT

### Backend

#### Authentification & Utilisateurs
- Modèle `CustomUser` avec rôles : `ADMIN`, `CLIENT`, `TRANSPORTEUR`, `FONDATEUR`
- JWT (SimpleJWT) : login, register, refresh token, logout (blacklist)
- Endpoint `auth/me/` pour récupérer l'utilisateur connecté
- `auth/admin/users/` : liste filtrée par rôle, recherche, pagination
- `auth/admin/users/<pk>/ban/` : bannir/débannir un utilisateur
- `auth/admin/users/<pk>/reset-password/` : réinitialiser le mot de passe
- Permissions : `IsAdminRole`, `IsClientRole`, `IsTransporteurRole`, `IsFondateurRole`
- Fix intercepteur axios : token JWT n'est plus envoyé sur les endpoints login/register/refresh

#### Commandes
- CRUD complet : `CommandeListCreateView`, `CommandeDetailView`
- Transitions de statut selon rôle :
  - ADMIN : EN_ATTENTE → VALIDEE → EN_PREPARATION → EN_ROUTE → LIVREE
  - FONDATEUR : EN_ATTENTE → VALIDEE → EN_PREPARATION
  - TRANSPORTEUR : EN_PREPARATION → EN_ROUTE → LIVREE
  - CLIENT : peut annuler si pas encore EN_ROUTE
- `admin/assigner/` : assigner un transporteur à une commande
- `admin/annuler/` : annuler une commande (admin)
- `admin/transporteurs/` : liste des transporteurs disponibles pour une commande
- Calendrier des livraisons (`calendrier/`)
- Avis clients sur les commandes + réponse fondateur

#### Transporteurs
- Profil transporteur avec véhicule, plaque, note moyenne, nb livraisons
- Disponibilité en temps réel (is_available, is_on_delivery)
- GPS live (latitude/longitude mis à jour)
- SOS → crée une notification `WARNING` pour les admins avec message d'urgence
- Chat client ↔ chauffeur (`ChatMessage`)
- Objectifs hebdomadaires (`ObjectifHebdomadaire`) — migration 0003 créée
- Multi-livraisons (commandes proposées au transporteur)
- Scoring / classement transporteurs

#### Fondateurs (boutiques)
- CRUD boutique avec catégorie, ville, horaires, frais de livraison
- Galerie photos
- Gestion du stock produits (toggle disponibilité, alertes)
- Avis clients + possibilité de répondre
- Prévisions de demande

#### Modules additionnels (4 nouvelles apps)
- **Zones** : zones géographiques de livraison — migrations créées
- **Promotions** : codes promo, réductions — migrations créées + endpoint `stats/`
- **Bannières** : bannières marketing — migrations créées
- **Blacklist** : blocage d'utilisateurs ou d'adresses — migrations créées

#### Incidents & Tickets Support
- `Incident` : signalement par chauffeur ou fondateur, statuts, prise en charge admin
- Endpoints : `incidents/stats/`, `incidents/mes-incidents/`, `incidents/prendre-en-charge/`
- `Ticket` : système multi-rôle (client, chauffeur, fondateur), thread de messages
- Endpoints : `tickets/statistiques/`, `tickets/mes-tickets/`, `tickets/changer-statut/`

#### Contrats
- Génération de contrats transporteurs
- Cycle de vie (brouillon → signé → expiré)

#### Heatmap
- Endpoints PostGIS pour 5 types de cartes de chaleur
- Filtres par période

#### Notifications
- Cloche notifications : liste, marquer comme lu
- Envoi automatique sur retard, SOS, changement statut
- Email SMTP réel avec templates HTML

#### Celery
- Tasks périodiques (rappels, nettoyage, alertes)
- Worker configuré

#### WebSocket
- Push temps réel pour incidents et tickets (Django Channels)

#### Tests
- Tests unitaires pytest écrits pour les modules principaux

#### Impersonation & Administration avancée
- Impersonation d'utilisateur (admin peut se connecter en tant que)
- Prévisions de demande
- Calendrier admin des livraisons

---

### Frontend

#### Structure générale
- React + Vite, routing protégé par rôle (`ProtectedRoute`)
- `AuthContext` avec JWT auto-refresh sur 401 (sauf endpoints auth)
- `cartStore` (Zustand) pour le panier client
- Sidebar avec toutes les routes par rôle
- i18n : clés de traduction pour tous les modules

#### Partie Admin

| Page | Statut |
|---|---|
| Dashboard (stats globales) | ✅ |
| LiveDashboard (carte temps réel) | ✅ |
| Commandes — tableau + filtres + statuts | ✅ |
| Commandes — bouton Valider/Avancer (icône) | ✅ |
| Commandes — bouton Assigner transporteur (modal) | ✅ **fix : modal était jamais rendu** |
| Commandes — bouton Annuler | ✅ |
| Clients — liste CustomUser filtrés par rôle=CLIENT | ✅ **fix : utilisait le mauvais modèle** |
| Transporteurs — scoring, classement | ✅ |
| Incidents — carte Leaflet + filtres + statuts | ✅ |
| Tickets — gestion multi-rôle | ✅ |
| Contrats | ✅ |
| Zones | ✅ |
| Promotions | ✅ |
| Bannières | ✅ |
| Blacklist | ✅ |
| Heatmap | ✅ |
| Calendrier livraisons | ✅ |
| Prévisions demande | ✅ |
| Impersonation | ✅ |
| Paramètres (Settings) | ✅ **fix : i18n.formatPrice remplacé par Intl.NumberFormat** |

#### Partie Client

| Fonctionnalité | Statut |
|---|---|
| Catalogue boutiques par catégorie | ✅ |
| Ajout au panier (CartSidebar) | ✅ |
| CheckoutModal — 3 modes adresse (GPS, quartier, manuel) | ✅ **fix : modal jamais rendu** |
| CheckoutModal — choix mode paiement (Cash, Carte...) | ✅ |
| CheckoutModal — calcul frais selon distance | ✅ |
| Suivi commandes en cours | ✅ |
| Carte Leaflet — suivi livraison live | ✅ |
| Tickets support | ✅ |
| Chatbot widget | ✅ **réécriture complète** |
| Profil utilisateur | ✅ |

#### Partie Chauffeur

| Fonctionnalité | Statut |
|---|---|
| Dashboard principal (stats, revenus) | ✅ |
| GPS OSRM — itinéraire en temps réel | ✅ |
| Mode conduite | ✅ |
| Multi-livraisons | ✅ |
| QR Code livraison | ✅ |
| Objectifs hebdomadaires | ✅ |
| SOS — liste de 6 choix (Accident, Panne, Agression, Médical, Perdu, Autre) | ✅ **fix : JSX syntax error corrigé** |
| Chat client | ✅ |
| Signalement incident | ✅ |
| Tickets support | ✅ |

#### Partie Fondateur (boutique)

| Fonctionnalité | Statut |
|---|---|
| StoreDash temps réel (son, chrono, statut live) | ✅ |
| Gestion commandes reçues | ✅ |
| Gestion stock produits (toggle dispo, alertes) | ✅ |
| Galerie photos | ✅ |
| Avis clients + réponse | ✅ |
| Analytics boutique | ✅ |

#### Carte Leaflet (toutes les parties)
- Markers inline SVG (divIcon) — plus de CDN externe bloqué par Edge
- Fichier utilitaire `frontend/src/utils/leafletIcons.js`
- Utilisé dans : MapComponent, ClientDashboard, ChauffeurDashboard

---

## ❌ CE QUI N'EST PAS FAIT

### Déploiement
- Aucune configuration de production (Nginx, Gunicorn, Docker)
- Variables d'environnement `.env` non sécurisées pour la prod
- Pas de HTTPS configuré
- Pas de CDN pour les fichiers statiques

### Migrations à exécuter manuellement
> **IMPORTANT** — Ces migrations ont été créées mais doivent être appliquées sur la base de données :
```bash
cd backend
python manage.py migrate
```
Apps concernées : `zones`, `promotions`, `bannieres`, `blacklist`, `transporteurs` (migration 0003)

### Fonctionnalités non implémentées
- Paiement en ligne réel (Stripe, CMI, PayPal) — actuellement simulation
- Géolocalisation réelle boutiques → livraison (OSRM fonctionne côté chauffeur mais pas de calcul automatique de zone)
- Système de remboursement / litige commande
- Application mobile (React Native ou Flutter)
- Notifications push mobile (FCM / APNs)
- Upload photos profil utilisateur
- Vérification KYC transporteur (scan carte d'identité, permis)
- Export PDF des contrats (lié à pdfmake ou reportlab)
- Dashboard analytics avancé (graphiques évolution sur 12 mois)
- Système de parrainage / points de fidélité
- Support multi-langue complet (actuellement clés i18n mais pas de traductions AR/EN réelles)

### Sécurité production
- `DEBUG = True` dans settings Django (à passer à False)
- `SECRET_KEY` en dur dans le code
- `ALLOWED_HOSTS = ['*']` à restreindre
- CORS non configuré pour la prod
- Pas de rate limiting sur les endpoints API

### Tests
- Tests unitaires écrits (pytest) mais non intégrés à une CI/CD
- Pas de tests E2E (Cypress / Playwright)
- Pas de tests de charge

---

## Bugs corrigés (résumé)

| Bug | Fichier | Fix |
|---|---|---|
| `user is not defined` | `Commandes.jsx` | Ajout `useAuth()` + destructuring |
| `transporteursList is not defined` | `Commandes.jsx` | Remplacé inline select par bouton modal |
| `i18n.formatPrice is not a function` | `SettingsPage.jsx` | Remplacé par `Intl.NumberFormat` |
| Double prefix `/api/clients/clients/` | `api.js` | Corrigé en `clients/` |
| `promotions/undefined/stats/` | `api.js` | Corrigé en `promotions/stats/` |
| `livraisons/ 404` | `api.js` | Corrigé en `livraisons/mes-livraisons/` |
| 500 sur zones/promotions/bannieres/blacklist | Backend | Migrations 0001_initial créées |
| 500 sur `transporteurs/objectifs/` | Backend | Migration 0003 créée |
| 500 sur `transporteurs/sos/` | Backend | `type='SOS'` → `type_notif='WARNING'` |
| 401 sur `auth/login/` | `AuthContext.jsx` | Intercepteur skip endpoints auth |
| Clients vides en admin | `Clients.jsx` | Changé vers `auth/admin/users/?role=CLIENT` |
| Checkout client ne s'ouvre pas | `ClientDashboard.jsx` | `CheckoutModal` câblé via `checkoutOpen` |
| Chatbot cassé | `ChatbotWidget.jsx` | Réécriture complète |
| Leaflet CDN bloqué par Edge | Tous les composants carte | Remplacement par divIcon SVG inline |
| JSX error `ChauffeurDashboard` | `ChauffeurDashboard.jsx` | Modal SOS déplacé dans le return unique |
| Modal Assigner jamais affiché | `Commandes.jsx` | `{assigning && <AssignerModal />}` ajouté |
| Modal Détail jamais affiché | `Commandes.jsx` | `{selected && <DetailModal />}` ajouté |
| Statut `EN_LIVRAISON` invalide | `Commandes.jsx` | Corrigé en `EN_ROUTE` |
| Boutons trop larges en admin | `Commandes.jsx` | Remplacés par icônes avec tooltip |

---

## Architecture des fichiers clés

```
projet dev/
├── backend/
│   ├── accounts/          # Auth, CustomUser, permissions
│   ├── commandes/         # Commandes, avis, calendrier
│   ├── transporteurs/     # Profil, SOS, chat, objectifs
│   ├── incidents/         # Signalements
│   ├── tickets/           # Support
│   ├── contrats/          # Contrats transporteurs
│   ├── zones/             # Zones géographiques
│   ├── promotions/        # Codes promo
│   ├── bannieres/         # Bannières marketing
│   ├── blacklist/         # Blocage utilisateurs
│   ├── clients/           # CRM clients (modèle séparé de CustomUser)
│   ├── fondateurs/        # Boutiques
│   └── tracking/          # WebSocket, heatmap
│
└── frontend/src/
    ├── contexts/
    │   └── AuthContext.jsx          # JWT, intercepteurs, rôles
    ├── services/
    │   └── api.js                   # Tous les endpoints API
    ├── stores/
    │   └── cartStore.js             # Panier (Zustand)
    ├── utils/
    │   └── leafletIcons.js          # Markers SVG inline
    ├── components/
    │   ├── ChatbotWidget.jsx        # Widget chatbot
    │   └── MapComponent.jsx         # Carte admin temps réel
    └── pages/
        ├── admin/
        │   ├── SettingsPage.jsx
        │   ├── LiveDashboard.jsx
        │   ├── CalendrierPage.jsx
        │   ├── ZonesPage.jsx
        │   ├── PromotionsPage.jsx
        │   ├── PrevisionsPage.jsx
        │   ├── ImpersonationPage.jsx
        │   ├── BannieresPage.jsx
        │   └── BlacklistPage.jsx
        ├── client/
        │   └── ClientDashboard.jsx  # Catalogue + panier + checkout + suivi
        ├── chauffeur/
        │   └── ChauffeurDashboard.jsx # GPS + SOS + objectifs + chat
        ├── store/                   # Pages fondateur
        ├── Commandes.jsx            # Admin commandes
        ├── Clients.jsx              # Admin clients
        ├── Incidents.jsx            # Admin incidents
        └── Tickets.jsx              # Admin tickets
```
