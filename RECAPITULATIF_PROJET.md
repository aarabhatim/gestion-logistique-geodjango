# 📋 DeliverMap — Récapitulatif Projet

> Document de référence : état d'avancement complet du projet,
> ce qui a été livré et ce qui reste à construire.
>
> Dernière mise à jour : mai 2026

---

## ✅ Partie 1 — Ce qui a été FAIT

### 🎨 Design & Identité Visuelle

- [x] **Palette CSS premium** (bleu/violet `#4f8cff → #a78bfa → #c084fc`)
- [x] **Tokens design system** dans `index.css` (gradients, ombres, radius, transitions)
- [x] **Glassmorphism** sur toutes les cartes (`backdrop-filter: blur(14px)`)
- [x] **Mode sombre / clair** global avec `<ThemeToggle>` dans tous les headers
  - Toggle sauvegardé dans `localStorage` (`delivermap-theme-v1`)
  - Variables CSS adaptatives `html[data-theme="light"]`
- [x] **Thème admin matrix vert** (`html[data-role="admin"]`)
  - Palette `#22c55e → #a3e635`
  - Grille de fond style terminal
  - Police monospace pour les titres
- [x] **Animations** : `fadeIn`, `fadeInScale`, `slideIn`, `pulse`, `typing-bounce`, `glowPulse`, `shimmer`
- [x] **Scrollbar custom** avec dégradé
- [x] **Boutons enrichis** : `btn-primary`, `secondary`, `success`, `warning`, `danger`, `ghost`, `outline`, `sm`, `lg`, `icon`, `full`
- [x] **Badges** : `success`, `warning`, `info`, `primary`, `danger`, `secondary`
- [x] **Refonte sidebar admin** : indicateur actif glowing, dégradé subtil

### 🌍 Internationalisation (i18n)

- [x] **`I18nContext`** avec 4 langues : 🇫🇷 FR · 🇲🇦 AR · 🇬🇧 EN · 🇪🇸 ES
- [x] **Direction RTL automatique** pour l'arabe
- [x] **Sélecteur de langue** dans le header admin (avec drapeaux)
- [x] **Helpers** : `t(key)`, `formatPrice()`, `formatDate()` (via `Intl`)
- [x] **Persistance** dans `localStorage`

### 👤 Espace Client

- [x] **Panier multi-boutiques** (`cartStore.js`)
  - Articles de plusieurs boutiques dans un seul panier
  - Génération de N commandes au checkout (`Promise.allSettled`)
  - Code promo par boutique
  - Compatibilité descendante avec l'ancien single-shop
- [x] **Filtre boutiques par ville** (Casablanca, Rabat, Marrakech, Tanger, Fès, Agadir)
  - Pills avec compteurs par ville
  - Recherche boutique par nom/ville
- [x] **Notation du livreur** sur commande LIVREE
  - Modal avec 5 étoiles interactives
  - Commentaire optionnel
  - Branchement `commandesApi.creerAvis`
- [x] **Signalement de problème** avec 6 catégories prédéfinies
  - Retard, produit endommagé, mauvais produit, livreur impoli, commande incomplète, autre
  - Description obligatoire
- [x] **Annulation conditionnelle**
  - Bouton masqué quand `EN_ROUTE`
  - Badge « 🔒 Annulation bloquée » à la place
  - Backend refuse avec 403 si CLIENT + EN_ROUTE
- [x] **Carte de suivi live** avec polylines OSRM (transporteur → client)
- [x] **6 nouvelles boutiques Tanger** dans le seed
  - Pharmacie Iberia, Tech Hub Malabata, Médina Artisanat
  - Café Hafa Express, Beach Market Tanger Bay, Mode & Style Charf
- [x] **10 quartiers de Tanger** dans le sélecteur d'adresse

### 🛵 Espace Chauffeur / Transporteur

- [x] **Carte de mission active** (`ActiveMissionCard`)
  - OSRM routing distance + temps réels
  - Polylines colorées selon statut
- [x] **Onglet Carte enrichi**
  - Marqueurs boutique 🏪 / client 🏠 / position 🚗
  - Itinéraires multi-segments
  - Légende intégrée
- [x] **Toggle disponibilité**
- [x] **KPI mini cards** (revenus jour/semaine/mois, note)
- [x] **Heures travaillées** avec objectif quotidien

### 🛠️ Espace Admin

- [x] **Thème console verte** activé via `AdminLayout`
- [x] **Page Paramètres** complète (`/settings`) avec 6 sections :
  - **Profil** (édition prénom/nom/email/téléphone)
  - **Sécurité** (changement de mot de passe, sessions actives)
  - **Notifications** (5 toggles de préférences)
  - **Apparence** (mode sombre/clair, langue, fuseau, devise) — **bouton Sauvegarder applique tout**
  - **Système** (vider le cache, KPIs santé, toggles maintenance/debug)
  - **À propos** (version, stack, statut système)
- [x] **Bouton « Nouvelle Commande » retiré du header admin**
- [x] **Page Rapports enrichie**
  - **8 KPIs** (CA total, commandes, panier moyen, taux livraison, conversion, clients, boutiques, transporteurs)
  - Filtre période (7j / 30j / 3 mois / 6 mois / 1 an)
  - **Auto-refresh** toggle
  - **Export CSV** par graphique + Imprimer
  - Carte « Indicateurs de santé » avec barres de progression
  - Carte « Alertes & actions requises »
- [x] **Actions Clients admin**
  - 🚫 Bannir / ✅ Débannir avec confirmation
  - 🔑 Reset mot de passe avec prompt
  - 📥 Export CSV des clients
- [x] **`adminApi`** côté frontend :
  `listUsers`, `banUser`, `resetPassword`, `validerBoutique`, `validerTransporteur`

### 🤖 Chatbot conversationnel

- [x] **Multi-rôle** : suggestions différentes selon CLIENT/ADMIN/FONDATEUR
- [x] **Quick Actions** par rôle (Panier, Commandes, Stats, etc.)
- [x] **Indicateur de frappe** animé (3 points colorés)
- [x] **Persistance localStorage** des 20 derniers messages
- [x] **6 messages d'erreur contextualisés** (401, 403, 404, 500+, network, timeout)
- [x] **Reset conversation** (bouton 🗑️)
- [x] **Voice-to-text** (Web Speech API)
- [x] **Speak responses** (Speech Synthesis)
- [x] **Copier le message**
- [x] **Backend hardening**
  - try/except dans `views.py` (le bot ne crashe jamais)
  - Fallback local (regex/mots-clés) si Mistral absent
  - **Route hardcodée** dans `urls.py` (bypass `include()` qui plantait silencieusement)

### 🔌 Backend & Infrastructure

- [x] **Bascule Supabase → PostgreSQL local** (`.env`)
- [x] **Setup pgAdmin** : `logistique_db` + PostGIS 3.6
- [x] **Notifications temps réel via WebSocket**
  - Django Channels déjà configuré
  - **`JWTAuthMiddlewareStack`** nouveau pour auth WS via token
  - `NotificationConsumer` push sur `notifications_{user_id}`
  - `LivraisonConsumer` push sur `livraison_{commande_id}`
  - **Signal `post_save` sur Commande** déclenche notif automatique
    - VALIDEE → 'Commande confirmée ✅'
    - EN_PREPARATION → 'En préparation 👨‍🍳'
    - EN_ROUTE → 'En route 🛵'
    - LIVREE → 'Commande livrée 🎉'
    - ANNULEE → 'Commande annulée'
    - Nouvelle commande → notif fondateur
- [x] **Hook React `useNotificationSocket`**
  - Reconnexion automatique avec backoff exponentiel
  - Heartbeat toutes les 30s
  - Token JWT en query string
- [x] **`NotificationProvider`** global
  - Toasts animés en haut à droite
  - Auto-dismiss 6s avec barre de progression
  - Bip Web Audio optionnel
  - Couleurs/icônes par type
  - Compteur de notifications non lues

---

## ⏳ Partie 2 — Ce qui RESTE À FAIRE

### 🎨 Refonte UI Deep Dark (selon `delivermap_refonte.md`)

- [ ] **Migration vers Inter ou Poppins** (au lieu d'Outfit + Inter actuels)
- [ ] **Adoption de la palette Deep Dark stricte**
  - Fond `#0b0f19`
  - Cards `#131c2e`
  - Bordures `#1e293b` / `#22314d`
  - Accent primaire `#10b981` (vert au lieu du bleu/violet actuel)
- [ ] **Évaluation : adopter Tailwind CSS + shadcn/ui**
- [ ] **Framer Motion** pour transitions fluides

### 🏪 Gestion des Boutiques

- [ ] **Stock marchandises** : compteur live + alertes seuil
- [ ] **Disponibilité des produits** : toggle on/off rapide par produit
- [ ] **Interface de gestion stock** pour le fondateur
- [ ] **Auto-désactivation** du produit quand stock = 0

### 🔔 Notifications temps réel (compléments)

- [x] Infrastructure backend Channels ✅
- [x] Hook WS frontend ✅
- [x] Toast global ✅
- [ ] **Bell icon dans header** avec compteur live (linké au `unreadCount`)
- [ ] **Centre de notifications** dépliable (liste paginée des passées)
- [ ] **Notification de retard** automatique (cron Celery ou signal sur durée)
- [ ] **Envoyer email** en complément des WS (optionnel)
- [ ] **Push notifications navigateur** (Web Push API)

### ⚠️ Gestion incidents (chauffeur)

- [ ] **Modèle `Incident`** côté backend (si pas déjà présent)
  - Type : retard / panne / accident / marchandise endommagée
  - Localisation GPS
  - Photos jointes
- [ ] **Page de signalement chauffeur** avec sélecteur de type + photo
- [ ] **Carte incidents pour admin**
  - Marqueurs colorés par type
  - Filtres temporels
  - Statut : ouvert / en cours / résolu
- [ ] **Notification admin temps réel** quand incident créé

### 📊 Dashboard Pro Admin

- [x] KPIs ✅
- [x] Graphiques ✅
- [ ] **Cartes interactives** côte à côte (heatmap commandes / transporteurs)
- [ ] **Filtres croisés** (période × ville × catégorie)
- [ ] **Drilldown** : cliquer un point → liste détaillée

### 🏆 Moteur de scoring transporteurs

- [ ] **Modèle `ScoreTransporteur`** avec dimensions :
  - Ponctualité (livraisons à l'heure / total)
  - Fiabilité (incidents / livraisons)
  - Coût (frais moyen, comparé au marché)
  - Satisfaction (note moyenne clients)
  - Temps moyen de livraison
  - Nombre d'incidents
- [ ] **Calcul automatique** via signal post_save sur Livraison
- [ ] **Affichage radar chart** dans le profil transporteur
- [ ] **Filtre / tri** dans la page admin Transporteurs

### 🎫 Système de tickets

- [ ] **Modèle `Ticket`**
  - Catégorie : Réclamation / Demande assistance / Incident / Retard / Retour
  - Priorité : Faible / Moyen / Urgent
  - Auteur, destinataire, statut, threads
- [ ] **Interface création ticket** (client, fondateur, chauffeur)
- [ ] **File d'attente admin** avec filtres
- [ ] **Chat threadé** dans chaque ticket
- [ ] **Assignation** à un agent support
- [ ] **SLA** : alerte si ticket urgent > X heures sans réponse

### 📄 Système de contrats

- [ ] **Modèle `Contrat`** entre 2-3 parties (boutique / client / transporteur)
  - Date début / fin
  - Tarif négocié
  - Type service (livraison standard / express / récurrente)
  - Statut : brouillon / signé / actif / expiré / résilié
- [ ] **Génération PDF** (avec WeasyPrint ou ReportLab)
- [ ] **Signature électronique** (simple ou avec service tiers)
- [ ] **Notifications** d'expiration imminente

### 🗺️ Heatmap avancée

- [ ] **Heatmap des commandes** (densité par zone géographique)
- [ ] **Heatmap des retards**
- [ ] **Heatmap des incidents**
- [ ] **Heatmap des profits**
- [ ] **Heatmap du trafic** (positions chauffeurs)
- [ ] **Filtres temporels** : heure / jour / semaine / mois
- [ ] **Backend** : agrégation PostGIS + endpoint `/api/heatmap/{type}/`
- [ ] **Frontend** : Leaflet.heat plugin

### ⚡ Fonctionnalités UX additionnelles

- [ ] **Notifications push navigateur** (Service Worker + Web Push)
- [ ] **PWA** : installable comme app
- [ ] **Mode hors ligne** basique pour consultation
- [ ] **Recherche globale** (Cmd+K) avec filtres dans toute la plateforme
- [ ] **Raccourcis clavier** dans l'admin
- [ ] **Tour guidé** au premier login (onboarding)
- [ ] **Dark/Light auto** selon préférence système

---

## 🚀 Comment lancer le projet

### Backend (Django)

```powershell
cd "C:\Dokument\etude fichier\projet dev\backend"
Get-ChildItem -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force

# Mode standard
python manage.py runserver

# Mode ASGI complet pour WebSockets (recommandé pour notifs temps réel)
daphne -b 0.0.0.0 -p 8000 logistique_backend.asgi:application
```

### Frontend (React + Vite)

```powershell
cd "C:\Dokument\etude fichier\projet dev\frontend"
npm run dev
```

### Comptes de test (mot de passe : `password123`)

| Rôle | Username | Tester |
|---|---|---|
| Admin | `admin` | Thème vert, paramètres, rapports, ban utilisateurs |
| Client | `sara_client` | Catalogue, panier multi-boutiques, suivi |
| Client | `rim_tanger` | Boutiques Tanger |
| Chauffeur | `soufiane_tanger` | Missions Tanger + carte itinéraires |
| Fondateur | `souk_tanger` | Notifications nouvelles commandes |

---

## 📦 Stack technique actuelle

**Frontend**
- React 18 + Vite
- Zustand (state) + React Router
- Leaflet (cartes) + Recharts (graphiques)
- Lucide-react (icônes)
- Axios + JWT

**Backend**
- Django 5.1 + DRF
- Django Channels + Daphne (WebSocket)
- PostgreSQL + PostGIS
- SimpleJWT
- Mistral AI (chatbot) + fallback local

**Infra**
- Docker Compose ready
- Redis pour Channels (production)
- OSRM pour routing
