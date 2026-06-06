# DeliverMap — État du projet

> Dernière mise à jour : Juin 2026

---

## ✅ Fonctionnalités terminées

### 🔐 Phase 1 — Sécurité & Configuration
- [x] Variables sensibles dans `backend/.env` (clé secrète Django, DB, etc.)
- [x] `DEBUG=True` conditionnel, `ALLOWED_HOSTS` configuré
- [x] Données mock supprimées — appels API réels partout
- [x] Clé MapTiler dans `frontend/.env`

### 🗺️ Cartes MapTiler
- [x] Bug critique corrigé : 11 fichiers (template literals dans URLs de tuiles)
- [x] Cartes affichent correctement les tuiles MapTiler

### 🌍 Internationalisation (i18n)
- [x] 4 langues : Français, Anglais, Arabe, Espagnol
- [x] Dictionnaires dans `frontend/src/i18n/fr.js / en.js / ar.js / es.js`
- [x] `useI18n()` sur toutes les pages — 0 texte hardcodé
- [x] `npm run i18n:check` → 0 clé manquante

### 📱 Parcours Utilisateur
- [x] Client : catalogue, commande, suivi live, historique
- [x] Chauffeur : missions, navigation, livraison
- [x] Admin : dashboard, gestion, exports, notifications, heatmap, zones

### 🏗️ Composants & Pages
- [x] Page 404 dédiée avec retour intelligent selon le rôle
- [x] ConfirmModal remplace tous les window.confirm()
- [x] Babel parse : 0 erreur de syntaxe

### 📧 Email à la création de compte
- [x] Django SMTP via Gmail App Password
- [x] Template HTML professionnel (dark theme, badge rôle, CTA)
- [x] Non bloquant — erreur email n'arrête pas l'inscription

### 🔑 Réinitialisation de mot de passe
- [x] ForgotPassword.jsx — envoi lien par email
- [x] ResetPassword.jsx — saisie nouveau mot de passe via token URL
- [x] Backend : PasswordResetRequestView + PasswordResetConfirmView
- [x] Token sécurisé (secrets.token_urlsafe) stocké en cache Django 1h
- [x] Routes dans App.jsx + lien "Mot de passe oublié ?" sur Login

### 📊 Export Excel (.xlsx)
- [x] openpyxl ajouté dans requirements.txt
- [x] backend/dm_utils/export_excel.py — export Commandes, Transporteurs, Clients
- [x] 3 endpoints : GET /api/commandes/export/xlsx/, /transporteurs/export/xlsx/, /clients/export/xlsx/
- [x] Bouton "Excel" dans Commandes.jsx, Transporteurs.jsx, Clients.jsx
- [x] Fichiers stylisés : thème sombre, en-têtes colorés, couleurs conditionnelles

### 🔔 Notifications email
- [x] 9 fonctions d'email dans backend/utils/emails.py
- [x] email_nouvelle_commande_fondateur() — à chaque nouvelle commande
- [x] email_mission_acceptee_chauffeur() — confirmation mission au chauffeur
- [x] email_confirmation_commande() — confirmation au client

### ♿ Accessibilité (ARIA)
- [x] ConfirmModal : role="dialog", aria-modal, aria-labelledby, aria-describedby, focus auto, Escape pour fermer
- [x] Header.jsx : aria-label/expanded/haspopup sur langue et cloche, role="listbox", aria-selected
- [x] AdminSidebar.jsx : aria-current="page", aria-pressed sur épingle, role="tooltip", aria-label sur nav
- [x] Login.jsx : htmlFor/id sur labels/inputs, aria-required, role="alert", aria-busy
- [x] Register.jsx : tous les inputs liés par id, aria-required, aria-label, aria-busy

---

## 🔴 Non terminé / À faire

### 🚀 Production & Déploiement
- [ ] SECRET_KEY Django sécurisée en production
- [ ] DEBUG=False en production
- [ ] ALLOWED_HOSTS avec vrai domaine
- [ ] Serveur HTTPS (certificat SSL)
- [ ] Déploiement backend (VPS, Railway, Render…)
- [ ] Déploiement frontend (Vercel, Netlify…)
- [ ] CORS_ALLOWED_ORIGINS pour le domaine de production

### 🧪 Tests
- [ ] Tests unitaires backend (pytest — structure dans tests/)
- [ ] Tests end-to-end (Playwright ou Cypress)

### 🔐 Auth avancée (optionnel)
- [ ] Vérification email à l'inscription
- [ ] Connexion Google / OAuth

### 📲 Notifications avancées (optionnel)
- [ ] Push notifications navigateur (PWA)

---

## 🗂️ Fichiers clés

```
projet dev/
├── backend/
│   ├── .env                          ✅ DB + Gmail SMTP
│   ├── accounts/views.py             ✅ Register + PasswordReset
│   ├── accounts/email_service.py     ✅ Service email Django SMTP
│   ├── commandes/views.py            ✅ Export XLSX + emails
│   ├── transporteurs/views.py        ✅ Export XLSX
│   ├── clients/views.py              ✅ Export XLSX
│   ├── dm_utils/export_excel.py      ✅ openpyxl (3 exports)
│   └── utils/emails.py               ✅ 9 templates email HTML
│
└── frontend/src/
    ├── pages/auth/Login.jsx           ✅ Aria + mot de passe oublié
    ├── pages/auth/Register.jsx        ✅ Aria + email welcome
    ├── pages/auth/ForgotPassword.jsx  ✅ Reset par email
    ├── pages/auth/ResetPassword.jsx   ✅ Nouveau mot de passe
    ├── pages/Commandes.jsx            ✅ Export Excel
    ├── pages/Transporteurs.jsx        ✅ Export Excel
    ├── pages/Clients.jsx              ✅ Export Excel
    ├── components/ConfirmModal.jsx    ✅ Aria dialog complet
    ├── components/Header.jsx          ✅ Aria notifications
    └── components/AdminSidebar.jsx    ✅ Aria nav
```

## 📋 Commandes utiles

```bash
# Frontend
cd frontend && npm run dev
cd frontend && npm run i18n:check

# Backend
cd backend && pip install -r requirements.txt   # inclut openpyxl
cd backend && python manage.py runserver
```
