# DeliverMap — État du projet

> Dernière mise à jour : Mai 2026

---

## ✅ Fonctionnalités terminées

### 🔐 Phase 1 — Sécurité & Configuration
- [x] Variables sensibles déplacées dans `backend/.env` (clé secrète Django, DB, etc.)
- [x] `DEBUG=True` conditionnel, `ALLOWED_HOSTS` configuré
- [x] Données mock supprimées de toutes les pages (remplacement par appels API réels)
- [x] Clé MapTiler déplacée dans `frontend/.env` (`VITE_MAPTILER_KEY`)
- [x] Variables EmailJS ajoutées dans `frontend/.env`

### 🗺️ Cartes MapTiler
- [x] **Bug critique corrigé** : toutes les URLs de tuiles utilisaient des guillemets droits JSX (`url="..."`) au lieu de template literals (`url={`...`}`) — la clé API n'était jamais injectée
- [x] **11 fichiers corrigés** : `ChauffeurDashboard`, `ClientDashboard`, `DrivingMode`, `MapComponent`, `CommandeFormModal`, `HeatmapPage`, `LiveDashboard`, `MapPage` (admin + main), `ZonesPage`, `Incidents`
- [x] Les cartes affichent correctement les tuiles MapTiler

### 🌍 Internationalisation (i18n) — Complet
- [x] 4 langues : Français, Anglais, Arabe, Espagnol
- [x] Dictionnaires séparés dans `frontend/src/i18n/fr.js / en.js / ar.js / es.js`
- [x] Contexte `I18nContext` + hook `useI18n()` sur toutes les pages
- [x] Script `npm run i18n:check` → 0 clé manquante
- [x] Remplacement de tous les textes hardcodés français dans 50+ fichiers
- [x] `LanguageSwitcher` unifié dans `AppHeader`
- [x] Formats de date localisés (plus de `fr-FR` forcé)
- [x] Statuts et enums backend traduits

### 📱 Parcours Utilisateur
- [x] **Client** : catalogue boutiques, tunnel de commande complet, suivi live (timeline), historique
- [x] **Chauffeur** : acceptation/refus missions, navigation intégrée, confirmation livraison, mode livraison
- [x] **Admin** : tableau de bord, gestion utilisateurs, exports CSV/PDF, centre de notifications, heatmap, zones, incidents

### 🚗 Dashboard Chauffeur — Bugs corrigés
- [x] Import `useI18n` manquant → ajouté
- [x] `const { t } = useI18n()` ajouté dans le composant principal
- [x] Alias `wT` dans `WorkingHoursCard` pour éviter conflit avec `setTick(t => t+1)`
- [x] Fichier tronqué (fin de fichier manquante) → restauré
- [x] Octet nul `\x00` parasite en fin de fichier → supprimé
- [x] 7 routes chauffeur manquantes câblées dans `App.jsx`

### 🏗️ Composants & Pages
- [x] **Page 404** dédiée (`NotFoundPage.jsx`) avec illustration SVG et bouton retour intelligent selon le rôle
- [x] **ConfirmModal** remplace tous les `window.confirm()` natifs (6 pages concernées)
- [x] **8 composants** avec `export default` manquant corrigés
- [x] `SettingsPage`, `Orders`, `Products` — noms de composants internes corrigés
- [x] `ClientDashboard` — fichier tronqué restauré + export default ajouté
- [x] Babel parse complet : **0 erreur de syntaxe** sur tous les fichiers `src/**/*.{jsx,js}`

### 📧 Email à la création de compte
- [x] Service backend Django SMTP (`accounts/email_service.py`)
- [x] `RegisterView` appelle `send_welcome_email(user)` après inscription réussie
- [x] Template HTML professionnel inline (dark theme, badge rôle, info compte, CTA, footer)
- [x] Non bloquant — une erreur email ne stoppe jamais l'inscription
- [x] Config Gmail SMTP dans `backend/.env` (`EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`)
- [x] Fallback texte brut inclus

### 🔧 Qualité code
- [x] `api.js` — base URL corrigée (`/api/` suffix dans VITE_API_URL)
- [x] Scan global de tous les imports `App.jsx` (43 imports vérifiés)
- [x] Babel parse systématique après chaque session de corrections

---

## 🔴 Non terminé / À faire

### 📧 Email — Tests à valider
- [ ] **Tester la réception** après redémarrage du serveur Django avec les nouvelles variables `.env`
- [ ] Vérifier les logs Django : `[Email] ✅ Email de bienvenue envoyé à ...`
- [ ] Si erreur `SMTPAuthenticationError` → vérifier que la vérification 2 étapes est active sur `hatimaaarab1123@gmail.com`

### 🔑 Authentification avancée
- [ ] **Réinitialisation de mot de passe** par email (lien sécurisé avec token)
- [ ] **Vérification d'email** à l'inscription (confirmer l'adresse avant activation)
- [ ] **Connexion Google / OAuth** (optionnel)

### 📲 Notifications
- [ ] Notifications email pour les nouvelles commandes (vers le commerçant)
- [ ] Notification email au client quand sa commande est livrée
- [ ] Notification email au chauffeur quand une mission lui est assignée
- [ ] Push notifications navigateur (PWA)

### 🏪 Espace Boutique / Fondateur
- [ ] Vérifier que toutes les pages boutique sont fonctionnelles en conditions réelles (avec données API)
- [ ] Gestion des images produits / galerie

### 🚀 Production & Déploiement
- [ ] Changer `SECRET_KEY` Django pour une clé sécurisée en production
- [ ] Passer `DEBUG=False` en production
- [ ] Configurer `ALLOWED_HOSTS` avec le vrai domaine
- [ ] Serveur HTTPS (certificat SSL)
- [ ] Déploiement backend (ex: VPS, Railway, Render)
- [ ] Déploiement frontend (ex: Vercel, Netlify)
- [ ] Variables `.env` de production séparées
- [ ] Configuration `CORS_ALLOWED_ORIGINS` pour le domaine de production

### 🧪 Tests
- [ ] Tests unitaires backend (pytest — structure existe dans `tests/`)
- [ ] Tests d'intégration API
- [ ] Tests end-to-end frontend (Cypress / Playwright)

### ♿ Accessibilité & UX
- [ ] Attributs `aria-*` sur les composants interactifs
- [ ] Navigation clavier complète
- [ ] Mode sombre/clair (actuellement toujours dark)

### 📊 Analytics & Admin
- [ ] Rapports exportables au format Excel (`.xlsx`) en plus du CSV
- [ ] Graphiques de prévisions plus précis (données réelles vs mock)
- [ ] Tableau de bord admin mobile-friendly

---

## 🗂️ Structure des fichiers clés

```
projet dev/
├── backend/
│   ├── .env                          ✅ DB + Gmail SMTP configurés
│   ├── accounts/
│   │   ├── views.py                  ✅ RegisterView envoie l'email
│   │   └── email_service.py          ✅ Service email Django
│   └── logistique_backend/
│       └── settings.py               ✅ Config SMTP lue depuis .env
│
├── frontend/
│   ├── .env                          ✅ API URL + MapTiler + EmailJS
│   ├── src/
│   │   ├── services/
│   │   │   ├── api.js                ✅ Base URL corrigée
│   │   │   └── emailService.js       ⚠️  EmailJS (backup, pas utilisé)
│   │   ├── pages/
│   │   │   ├── auth/Register.jsx     ✅ Appel email après inscription
│   │   │   └── NotFoundPage.jsx      ✅ Page 404 créée
│   │   ├── components/
│   │   │   └── ConfirmModal.jsx      ✅ Remplace window.confirm()
│   │   ├── i18n/
│   │   │   ├── fr.js / en.js         ✅ ~1900 clés chacun
│   │   │   ├── ar.js / es.js         ✅ Alignés sur FR
│   │   └── contexts/
│   │       └── I18nContext.jsx       ✅ Hook useI18n() global
│
└── emailjs_template.html             ✅ Template HTML email (référence)
```

---

## 📋 Commandes utiles

```bash
# Frontend
cd frontend
npm run dev          # Démarrer Vite
npm run i18n:check   # Vérifier les clés i18n manquantes
npm run build        # Build production

# Backend
cd backend
python manage.py runserver    # Démarrer Django
python manage.py migrate      # Appliquer les migrations
```
