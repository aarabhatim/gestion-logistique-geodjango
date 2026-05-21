# DeliverMap — Vision Complète du Projet

> **Stack :** Django 5.1 · DRF · PostGIS · React 18 · Vite · Leaflet · Recharts · Zustand · Framer Motion · Radix UI · Django Channels · Redis · Celery · Stripe
> **Date de revue :** Mai 2026

---

## 1. ÉTAT GLOBAL DU PROJET

### Vue d'ensemble par rôle

| Rôle | Backend | Frontend | Niveau de complétude |
|---|---|---|---|
| **ADMIN** | ✅ Complet | ✅ Complet | 90% |
| **FONDATEUR / Boutique** | ✅ Complet | ✅ Complet | 80% |
| **TRANSPORTEUR / Chauffeur** | ✅ Complet | ✅ Complet | 75% |
| **CLIENT** | ✅ Complet | ✅ Complet | 70% |
| **DevOps / Production** | ⚠️ Partiel | — | 30% |

---

## 2. CE QUI EST FAIT — BACKEND

### 2.1 Authentification (`accounts/`)
- ✅ Modèle `CustomUser` étendu (rôle, position GPS, avatar)
- ✅ Login JWT (SimpleJWT) avec serializer personnalisé retournant le rôle
- ✅ Refresh token auto-rotate + blacklist
- ✅ Register, Logout, Me (GET/PATCH), Change password
- ✅ Update position GPS en temps réel
- ✅ Admin : liste utilisateurs, ban, reset password

### 2.2 Fondateurs & Boutiques (`fondateurs/`)
- ✅ Modèle `Fondateur` avec point géographique (PostGIS), rayon de livraison, statut validation
- ✅ Modèle `Produit` avec stock, seuil d'alerte, disponibilité, images multiples
- ✅ Modèle `CodePromo` avec réduction %, date d'expiration, usage max
- ✅ Endpoint géospatial `proches/` (boutiques dans un rayon en km)
- ✅ CRUD complet ma-boutique, mes-produits
- ✅ Toggle disponibilité produit, mise à jour stock inline
- ✅ Alertes rupture stock
- ✅ Validation admin (approuver / rejeter boutique)
- ✅ Signals auto : désactivation produit à stock=0, notification alerte stock bas
- ✅ Vérification et validation code promo

### 2.3 Commandes (`commandes/`)
- ✅ Cycle de vie complet : EN_ATTENTE → VALIDEE → EN_PREPARATION → EN_ROUTE → LIVREE / ANNULEE
- ✅ Panier avec calcul automatique (prix, commission plateforme, code promo)
- ✅ Modes de paiement : CASH, CARTE, VIREMENT
- ✅ Actions rôlées : fondateur (confirmer/préparer), transporteur (accepter/démarrer/livrer)
- ✅ Admin : annuler, assigner transporteur, voir transporteurs disponibles
- ✅ Système d'avis (note 1-5, commentaire) après livraison
- ✅ Référence unique auto-générée

### 2.4 Livraisons (`livraisons/`)
- ✅ Livraison liée à la commande avec code de confirmation
- ✅ Démarrer livraison, confirmer avec code
- ✅ Update position GPS en temps réel (stockée dans `tracking/PositionVehicule`)
- ✅ Mes livraisons (vue transporteur)

### 2.5 Transporteurs (`transporteurs/`)
- ✅ Modèle profil : véhicule, plaque, disponibilité, vérification
- ✅ Toggle disponibilité
- ✅ Liste transporteurs disponibles (avec filtres)
- ✅ Validation admin (vérifier / rejeter)
- ✅ Export CSV

### 2.6 Notifications (`notifications/`)
- ✅ Modèle `Notification` avec type, message, lu/non-lu
- ✅ WebSocket (Django Channels + Daphne) : push en temps réel
- ✅ Endpoints : list, non-lues, marquer lue, tout lire
- ✅ Supprimer une notification, supprimer toutes les lues
- ✅ Alertes retard livraison (commandes EN_ROUTE dépassant estimated_delivery)
- ✅ Fonction `envoyer_notification()` réutilisable dans tout le projet

### 2.7 Analytics (`analytics/`)
- ✅ Dashboard admin : KPIs, évolution 6 mois, par statut, top fondateurs, top transporteurs
- ✅ Analytics fondateur : CA, commandes, taux livraison
- ✅ Stats publiques
- ✅ Heatmap legacy : commandes + boutiques + couverture villes
- ✅ 5 heatmap typées avec filtre période (7j/30j/90j) : commandes, retards, incidents, profits, trafic

### 2.8 Incidents (`incidents/`) — NOUVEAU
- ✅ 8 types d'incident : accident, panne, vol, colis_endommage, retard, client_absent, adresse_introuvable, autre
- ✅ Photos multiples (modèle `IncidentPhoto`)
- ✅ Statuts : ouvert → en_cours → resolu
- ✅ Prendre en charge, résoudre avec notes
- ✅ Stats agrégées (total, ouverts, en cours, résolus)
- ✅ Notification admin automatique à chaque signalement

### 2.9 Scoring (`scoring/`) — NOUVEAU
- ✅ Score 4 dimensions pondérées : ponctualité×0.30, fiabilité×0.30, satisfaction×0.25, rapidité×0.15
- ✅ Recalcul automatique par signals (post livraison, post avis, post incident)
- ✅ Endpoints : mon-score, classement, recalculer, recalculer-tous

### 2.10 Tickets (`tickets/`) — NOUVEAU
- ✅ Modèles `Ticket` + `TicketMessage` (thread)
- ✅ 3 niveaux de priorité + SLA (urgent=4h, moyen=24h, faible=72h)
- ✅ Notes internes (visibles admins seulement)
- ✅ Assignation à un agent, changement de statut
- ✅ Endpoint `mes-tickets/` pour utilisateurs non-admin

### 2.11 Contrats (`contrats/`) — NOUVEAU
- ✅ Génération PDF avec ReportLab (clauses + en-tête professionnel)
- ✅ Cycle de vie : brouillon → envoyé → signé → actif → expiré/résilié
- ✅ Téléchargement PDF (réponse blob)
- ✅ Vérification expiration (endpoint manuel + logique automatique)

### 2.12 Chatbot (`chatbot/`)
- ✅ Endpoint conversationnel avec historique de session
- ✅ Widget intégré dans admin et client dashboard

### 2.13 Tracking (`tracking/`)
- ✅ Modèle `PositionVehicule` (commande, point GPS, vitesse, horodatage)
- ⚠️ Pas exposé via URL — données disponibles mais non accessibles par API directe

### 2.14 Clients (`clients/`)
- ✅ Modèle `Client` (nom, email, téléphone, localisation GPS, note fidélité)
- ⚠️ Views et URLs minimales — gestion via `accounts/` principalement

---

## 3. CE QUI EST FAIT — FRONTEND

### 3.1 Infrastructure
- ✅ React 18 + Vite + React Router v6
- ✅ Zustand (authStore, cartStore, trackingStore)
- ✅ Axios avec intercepteurs (inject token, refresh auto, redirect /login)
- ✅ Framer Motion (animations page)
- ✅ Radix UI (avatar, dropdown, tooltip, scroll-area, badge, button, card)
- ✅ React Query (@tanstack/react-query)
- ✅ NotificationContext (toast + WebSocket)
- ✅ ThemeContext (dark/light, admin/default)
- ✅ I18nContext (internationalisation FR/EN)
- ✅ Hooks : useGeolocation, useWebSocket, useNotificationSocket

### 3.2 Authentification
- ✅ Login avec JWT (page glassmorphism)
- ✅ Register (choix de rôle)
- ✅ Refresh token silencieux
- ✅ ProtectedRoute par rôle

### 3.3 Interface ADMIN (sidebar + layout)
- ✅ Sidebar avec 13 sections : Dashboard, Map, Commandes, Boutiques, Incidents, Clients, Transporteurs, Scoring, Tickets, Contrats, Rapports, Heatmap, Paramètres
- ✅ Header avec badge notifications non-lues (polling 30s)
- ✅ ChatbotWidget flottant
- ✅ Thème dark glassmorphism

#### Pages admin opérationnelles :
| Page | Fonctionnalités |
|---|---|
| **Dashboard** | KPIs, courbes 6 mois, répartition statuts, top fondateurs/transporteurs |
| **Commandes** | Liste filtrée, modal détail, assigner transporteur, avancer/annuler statut, export CSV |
| **Boutiques** | Liste boutiques, valider/rejeter, voir détail |
| **Clients** | Liste clients admin, ban utilisateur, reset mdp |
| **Transporteurs** | Liste complète, onglets disponibles/tous, radar scoring, historique, export CSV, valider/rejeter |
| **Incidents** | Carte Leaflet (marqueurs colorés par type), filtres, panneau détail, résolution inline |
| **Scoring** | Classement avec podium, barres de progression, radar Recharts, recalcul |
| **Tickets** | File support, thread chat, changer statut, assigner |
| **Contrats** | Liste, génération/téléchargement PDF, lifecycle (signer/activer/résilier) |
| **Rapports** | Charts multi-types, KPIs incidents/tickets/scoring, export CSV |
| **Heatmap** | 5 types + filtre période, couverture territoriale, layers boutiques/rayons |
| **Map Tracking** | Carte live des livraisons en cours |
| **Paramètres** | Thème, langue, profil |

### 3.4 Interface FONDATEUR (boutique)
- ✅ StoreDash : KPIs CA, commandes
- ✅ Orders : liste des commandes de la boutique, confirmer/préparer
- ✅ Products : catalogue avec stock inline, toggle disponibilité, alertes rupture, CRUD modal
- ✅ Analytics : graphiques fondateur

### 3.5 Interface TRANSPORTEUR (chauffeur)
- ✅ Dashboard multi-onglets : Dashboard / Missions / Carte / Profil
- ✅ KPIs : livraisons, note moyenne, revenus, taux réussite
- ✅ Toggle disponibilité
- ✅ Liste missions actives + proposées avec carte Leaflet
- ✅ Actions : accepter, démarrer livraison, confirmer avec code
- ✅ GPS auto + mise à jour position temps réel
- ✅ Card "Signaler un incident" → formulaire 2 étapes
- ✅ SignalerIncident : sélecteur type, commande, description, GPS, photos

### 3.6 Interface CLIENT
- ✅ Dashboard multi-onglets : Explorer / Commandes / Carte / Profil
- ✅ Catalogue boutiques par catégorie + filtres
- ✅ Recherche de produits avec géolocalisation (boutiques proches)
- ✅ Panier complet (Zustand) : ajouter, retirer, quantité, total
- ✅ Application code promo inline
- ✅ Choix mode de paiement
- ✅ Suivi commandes en cours avec carte Leaflet
- ✅ Historique commandes + avis post-livraison
- ✅ Tickets support intégrés

### 3.7 API Service (`api.js`)
- ✅ 12 objets API : authApi, fondateursApi, commandesApi, livraisonsApi, transporteursApi, notificationsApi, analyticsApi, incidentsApi, scoringApi, ticketsApi, contratsApi, chatbotApi

---

## 4. CE QUI EST INCOMPLET / MANQUANT

### Backend incomplet
| Module | Problème |
|---|---|
| `tracking/urls.py` | Non exposé dans `logistique_backend/urls.py` — données inaccessibles via API |
| `clients/views.py` | Minimal, pas de CRUD complet pour le modèle `Client` séparé |
| `EMAIL_BACKEND` | `console` seulement — pas d'envoi email réel (reset mdp, confirmation commande) |
| Celery tasks périodiques | Broker configuré mais aucune tâche planifiée (ex: vérif expirations contrats) |
| WebSocket incidents/tickets | Channels actif mais nouveaux modules ne pushent pas de WS |
| Tests unitaires | Zéro test pytest/unittest écrit |
| Upload cloud | Images stockées localement — pas S3/Cloudinary |

### Frontend incomplet
| Composant | Problème |
|---|---|
| Header — panel notifications | Badge non-lues affiché mais pas de panel dépliable (liste paginée, supprimer, marquer lu) |
| Chauffeur — onglet Tickets | Pas de raccourci dans le TabNav du chauffeur |
| Client — lien Tickets | Pas de bouton "Support" dans ClientDashboard |
| StoreDash analytics | Données statiques hardcodées — n'appelle pas le vrai endpoint |
| store/Analytics.jsx | Page quasi vide, charts non connectés |
| Pagination | Aucune page ne gère `?page=N` |
| i18n | Clés manquantes pour scoring, tickets, contrats, incidents |

---

## 5. NOUVELLES FONCTIONNALITÉS À AJOUTER

---

### 5.1 ESPACE ADMIN — Nouvelles fonctionnalités

#### Gestion opérationnelle
- **Tableau de bord temps réel** : Carte live des chauffeurs en mission (positions WS), compteur animé commandes en cours, alertes immédiates (retards, incidents ouverts)
- **Module Paiements & Facturation** : Suivi des paiements Stripe (statuts, remboursements), génération de factures PDF pour les fondateurs, tableau de commissions plateforme par période
- **Calendrier des livraisons** : Vue calendrier (semaine/mois) des créneaux planifiés, drag-and-drop pour réassigner des livraisons, détection de conflits de planning
- **Gestion des zones de livraison** : Créer des polygones de zones sur la carte, assigner des transporteurs à des zones, tarification dynamique par zone
- **Module Promotions global** : Créer des campagnes promo multi-boutiques, codes plateforme (ex: PROMO10), suivi des conversions
- **Audit log** : Journal de toutes les actions admin (qui a fait quoi, quand) filtrable et exportable
- **Notifications planifiées** : Envoyer des notifications push/email à des segments d'utilisateurs (tous les clients d'une ville, tous les chauffeurs disponibles)

#### Business intelligence
- **Prévisions de demande** : Courbe de prédiction des commandes (régression simple), alertes sur pics attendus (weekends, fêtes)
- **Analyse de rentabilité** : Marge par boutique, par catégorie de produit, par zone géographique
- **Rapport d'activité automatique** : Export PDF hebdomadaire automatique (Celery beat) avec KPIs clés
- **Comparaison périodes** : Comparer N-1 / N sur tous les indicateurs (CA, livraisons, incidents)

#### Outils admin
- **Mode impersonation** : Se connecter temporairement en tant qu'un utilisateur pour débugger
- **Gestionnaire de bannières** : Afficher des messages d'alerte/maintenance sur l'interface client
- **Blacklist adresses** : Bloquer automatiquement les livraisons vers certaines adresses problématiques

---

### 5.2 ESPACE FONDATEUR (Boutique) — Nouvelles fonctionnalités

#### Gestion boutique
- **Horaires d'ouverture** : Définir les plages horaires par jour, fermeture exceptionnelle, affichage "Ouvert / Fermé" en temps réel côté client
- **Galerie boutique** : Photos de la boutique, logo HD, bannière promotionnelle
- **Menu/Catalogue structuré** : Sous-catégories, produits vedettes, produits en rupture masqués automatiquement
- **Import produits en masse** : Upload CSV pour créer/mettre à jour plusieurs produits en une fois
- **Gestion des variations** : Taille, couleur, saveur — avec stock individuel par variation

#### Commandes & livraisons
- **Tableau de bord temps réel** : Son de notification à chaque nouvelle commande, chronomètre de préparation, statut en direct
- **Impression tickets de préparation** : Bon de commande imprimable (PDF) pour la cuisine/préparation
- **Estimation temps de préparation** : Délai configurable par produit, affiché au client avant de commander
- **Gestion des créneaux de livraison** : Proposer des créneaux horaires, limiter le nombre de commandes simultanées

#### Analytique boutique
- **Rapport des ventes** : Produits les plus commandés, heures de pointe, CA par jour/semaine/mois, taux d'abandon panier
- **Alertes intelligentes** : Notification si un produit n'a pas été commandé depuis X jours, alerte si CA baisse de Y%
- **Avis clients** : Tableau des avis reçus, moyenne par produit, réponse aux avis
- **Programme fidélité** : Points cumulés par client, offres spéciales pour les habitués

#### Financier
- **Tableau des paiements reçus** : Historique des virements de la plateforme, commissions déduites, solde disponible
- **Demande de virement** : Bouton "Demander un versement" avec Stripe Connect

---

### 5.3 ESPACE TRANSPORTEUR (Chauffeur) — Nouvelles fonctionnalités

#### Mission & navigation
- **Navigation GPS intégrée** : Itinéraire OSRM affiché sur la carte avec virages, recalcul en cas de déviation, ETA mis à jour en live
- **Multi-livraisons optimisées** : Groupement de plusieurs commandes en un seul trajet, ordre de passage optimisé (algorithme TSP simplifié)
- **Mode hors ligne partiel** : Mise en cache des détails de mission pour zones sans réseau
- **QR Code confirmation** : Scanner le QR code du client pour confirmer la livraison (alternative au code SMS)

#### Revenus & performance
- **Portefeuille numérique** : Solde disponible, historique des gains par mission, demande de virement
- **Objectifs hebdomadaires** : Gamification — badge "10 livraisons cette semaine", bonus si objectif atteint
- **Analyse de mes performances** : Graphique de mes livraisons sur 30/90 jours, comparaison avec moyenne des autres chauffeurs, évolution de ma note
- **Historique détaillé** : Chaque livraison avec adresse, durée, montant, note reçue, incidents éventuels

#### Confort & sécurité
- **Check-list avant départ** : Valider mentalement : véhicule OK, colis scanné, navigation démarrée
- **Mode conduite** : Interface simplifiée pour usage au volant (grands boutons, texte large, action principale en 1 clic)
- **SOS / Urgence** : Bouton d'urgence qui envoie position GPS aux admins + numéro d'urgence
- **Détection d'immobilité** : Alerte si le chauffeur est immobile depuis 15+ min en mission (accident potentiel)
- **Gestion du carburant** : Saisir les pleins, calcul du coût carburant sur la période, rapport de dépenses

#### Social & profil
- **Profil public** : Les clients peuvent voir la note et le nombre de livraisons de leur chauffeur
- **Préférences de zone** : Indiquer les villes/quartiers préférés pour recevoir en priorité les missions dans ces zones
- **Chat avec le client** : Messagerie intégrée dans la livraison active (éviter d'utiliser le téléphone personnel)

---

### 5.4 ESPACE CLIENT — Nouvelles fonctionnalités

#### Commande & découverte
- **Recherche intelligente** : Recherche full-text (produit, boutique, catégorie) avec suggestions autocomplete
- **Filtres avancés** : Prix min/max, note boutique, délai de livraison estimé, disponibilité en ce moment
- **Favoris** : Marquer boutiques et produits favoris (cœur), accès rapide dans un onglet dédié
- **Commande rapide** : "Commander à nouveau" en 1 clic depuis l'historique (même panier, même adresse)
- **Planification de commande** : Commander maintenant pour livraison dans 2h, demain matin, etc.
- **Mode groupe** : Commande collective (plusieurs personnes ajoutent des produits au même panier)

#### Suivi & livraison
- **Tracking temps réel enrichi** : Position du chauffeur sur la carte avec flèche directionnelle, ETA dynamique ("Votre commande arrive dans 8 min"), historique du trajet
- **Notifications push** : Alerte à chaque changement de statut, alerte "Chauffeur à 5 min", alerte "Livré"
- **Photo de livraison** : Le chauffeur prend une photo du dépôt si client absent — reçue côté client
- **Instructions de livraison** : "Code d'immeuble 1234", "Laisser devant la porte", "Appeler avant"
- **Évaluation détaillée** : Note séparée pour la boutique ET le chauffeur, avec raisons prédéfinies (rapide, emballage soigné, chauffeur sympa...)

#### Compte & fidélité
- **Historique complet** : Toutes les commandes avec détail, reçu PDF téléchargeable, relancer une commande
- **Points de fidélité** : Gagner des points à chaque commande, convertir en réduction
- **Carnet d'adresses** : Plusieurs adresses de livraison sauvegardées (Maison, Bureau, Famille...)
- **Modes de paiement sauvegardés** : Carte enregistrée via Stripe, paiement 1 clic
- **Parrainage** : Code de parrainage personnel, réduction pour soi et pour l'ami parrainé

#### Social
- **Avis publics** : Voir les avis des autres clients sur une boutique avant de commander
- **Photos clients** : Partager une photo de sa commande reçue
- **Chat avec le chauffeur** : Messagerie in-app pendant la livraison active

---

## 6. AMÉLIORATIONS DESIGN À APPORTER

### 6.1 Design général (toutes interfaces)

#### Système de design
- **Palette de couleurs cohérente** : Définir 5 tokens de couleur (primary, secondary, accent, danger, success) et les appliquer uniformément — certaines pages mélangent les classes CSS et les styles inline
- **Typographie unifiée** : Choisir 2 polices maximum (ex: Inter pour le texte, Sora/Poppins pour les titres), définir une hiérarchie de tailles (`text-xs` à `text-4xl`) cohérente partout
- **Espacement systématique** : Adopter une grille 4px/8px stricte — certaines pages ont des `padding` arbitraires (0.65rem, 0.85rem, etc.)
- **Composants réutilisables** : Transformer les patterns répétés (cartes glass, badges, boutons d'action) en composants centralisés dans `/components/ui/`

#### Micro-interactions
- **Skeleton loading** : Remplacer les spinners `RefreshCw.spin` par des skeletons animés (shimmer) sur toutes les listes et tableaux
- **Transitions de page** : Framer Motion est installé mais peu utilisé — ajouter `AnimatePresence` + `motion.div` sur les changements de route
- **Feedback des actions** : Toast de succès/erreur sur TOUTES les actions (actuellement certaines utilisent `alert()` natif — à remplacer)
- **Hover states** : Ajouter des micro-animations sur les cartes, boutons, liens de la sidebar (scale, glow)
- **États vides** : Remplacer les "Aucun résultat" textuels par des illustrations SVG avec call-to-action

### 6.2 Interface ADMIN

#### Sidebar
- **Mode compact / étendu** : Toggle pour réduire la sidebar à des icônes seules (gain d'espace)
- **Favoris personnels** : Épingler les 3 pages les plus utilisées en haut
- **Badge de compteurs live** : Afficher le nombre d'incidents ouverts sur l'item Incidents, tickets non assignés sur Tickets
- **Barre de recherche globale** : Raccourci `Cmd+K` pour rechercher une commande, un client, un transporteur depuis n'importe quelle page

#### Dashboard admin
- **KPI cards animés** : Compteur qui s'incrémente à l'arrivée sur la page (framer-motion)
- **Mode focus** : Masquer les graphiques secondaires et afficher uniquement les alertes critiques
- **Carte mini en temps réel** : Widget miniature dans le dashboard montrant les livraisons en cours

#### Tableaux de données
- **Colonne fixe** : En-têtes figés lors du scroll horizontal
- **Sélection multiple** : Checkbox par ligne + actions groupées (annuler X commandes, valider X boutiques)
- **Tri multi-colonne** : Cliquer sur plusieurs colonnes avec `Shift`
- **Densité d'affichage** : Toggle compact / normal / spacieux (nombre de lignes visibles)

### 6.3 Interface FONDATEUR

#### Dashboard boutique
- **Mode "Cuisine"** : Vue ultra-simplifiée uniquement pour la préparation des commandes — grandes cartes, son de notification, chrono de préparation
- **Stats visuelles** : Remplacer les chiffres bruts par des graphiques sparkline inline (mini courbe de CA)
- **Catalogue produits** : Vue grille avec photos en avant-plan, plutôt que tableau

### 6.4 Interface TRANSPORTEUR (Chauffeur)

#### Mode conduite
- **Interface dark haute visibilité** : Police large, contrastes élevés, bouton principal centré (format thumb-friendly)
- **Carte en plein écran** : Quand une mission est en cours, la carte prend 80% de l'écran avec boutons flottants
- **Animation de route** : Polyline avec animation "pointillés qui avancent" pour indiquer la direction
- **Progress bar de livraison** : Barre visuelle du pourcentage du trajet complété

#### Profil & stats
- **Gauge chart** : Score global affiché en arc de cercle coloré (vert/orange/rouge) plutôt qu'un chiffre brut
- **Calendrier d'activité** : Vue type "GitHub contributions" (grille de jours colorés selon le nombre de livraisons)

### 6.5 Interface CLIENT

#### Catalogue & commande
- **Cards produits premium** : Photos en fond dégradé (déjà partiellement fait), animation flip au survol montrant ingrédients/détails
- **Panier slide-over** : Panneau latéral qui s'ouvre depuis la droite plutôt qu'une page dédiée (expérience mobile-first)
- **Progress bar commande** : Timeline visuelle des étapes (Commande → Préparation → En route → Livré) avec étape active animée
- **Carte de livraison enrichie** : Afficher à la fois la boutique (origine) et l'adresse client (destination) avec une ligne de trajet

#### Expérience générale
- **Splash screen** : Écran de démarrage animé lors du premier chargement
- **Mode sombre / clair** : Déjà côté admin, à porter sur l'espace client (actuellement fixe)
- **Onboarding** : Présentation des 3 fonctionnalités clés lors de la première connexion (tooltip tour)
- **Pull to refresh** : Sur mobile, tirer vers le bas pour rafraîchir les données

### 6.6 Responsive & Mobile

Actuellement les interfaces sont desktop-first. À adapter :
- **Grid responsive** : Passer à 1 colonne sur mobile (actuellement certaines grilles 4-colonnes ne s'adaptent pas)
- **Navigation mobile** : Remplacer la sidebar par une bottom navigation bar sur écrans < 768px
- **Touch gestures** : Swipe pour changer d'onglet dans le dashboard chauffeur
- **PWA** : Ajouter `manifest.json` + service worker pour installation sur l'écran d'accueil mobile

---

## 7. AMÉLIORATIONS TECHNIQUES À AJOUTER

### Performance
- **React Query** : Déjà installé mais sous-utilisé — migrer les `useEffect + fetch` vers des `useQuery` avec cache automatique et refetch intelligent
- **Virtualisation** : Pour les listes de > 100 éléments (commandes, transporteurs), utiliser `react-virtual` ou `@tanstack/react-virtual`
- **Lazy loading routes** : `React.lazy()` + `Suspense` sur toutes les pages pour réduire le bundle initial
- **Image optimization** : Compression côté Django (Pillow), formats WebP, lazy loading `<img loading="lazy">`

### Sécurité
- **HTTPS obligatoire** en production (Nginx + Let's Encrypt)
- **Rate limiting DRF** : Throttling sur les endpoints publics et login
- **Validation des uploads** : Vérifier MIME type et taille des images côté backend
- **Sanitisation** : DOMPurify côté frontend pour les contenus utilisateurs affichés en HTML

### Infrastructure
- **Docker Compose** : Container Django + Redis + Daphne + Celery + PostgreSQL + Nginx
- **CI/CD GitHub Actions** : Lint → Tests → Build → Deploy automatique
- **Monitoring** : Intégration Sentry (erreurs JS + Python)
- **Logs structurés** : Django logging en JSON (niveau par module)

---

## 8. RÉCAPITULATIF PRIORITÉS

### Priorité HAUTE (à faire maintenant)
1. Exposer `tracking/urls.py` dans urls.py principal — fonctionnalité déjà codée mais inaccessible
2. Panel notifications dépliable dans le Header
3. Email réel (SendGrid/SMTP) pour les confirmations
4. Responsive mobile (navigation bottom bar)
5. Remplacer `alert()` natifs par des toasts partout

### Priorité MOYENNE (sprint suivant)
6. Navigation GPS OSRM dans le dashboard chauffeur
7. Tableau des revenus chauffeur
8. Horaires d'ouverture boutique
9. Tracking temps réel enrichi côté client (position chauffeur live)
10. Docker Compose pour déploiement

### Priorité BASSE (v2)
11. Programme fidélité client
12. Multi-livraisons optimisées
13. Mode conduite grand format
14. PWA + notifications push natives
15. Tests automatisés E2E

---

*Document généré le 18 mai 2026 — DeliverMap v2.0*
