# Analyse i18n — État actuel & Tâches restantes
*Généré le 30 mai 2026 — Projet DeliverMap / LogisTrack*

---

## 1. État global

| Indicateur | Valeur |
|---|---|
| Clés dans les dictionnaires (FR / EN / AR / ES) | **1 753** chacun — parité parfaite ✅ |
| Valeurs vides | **0** ✅ |
| Clés utilisées dans le code mais **absentes** du dict | **12** ❌ |
| Fichiers avec texte français encore hardcodé | **33 fichiers** ⚠️ |
| Occurrences totales de français hardcodé | **134 lignes** |
| Résultat `npm run i18n:check` | **ÉCHEC — 1 erreur, 1 avertissement** |

---

## 2. Blocage immédiat — 12 clés manquantes dans le dictionnaire

Ces clés sont **utilisées dans le code** (`t('...')`) mais **n'existent pas** dans `fr.js` / `en.js` / `ar.js` / `es.js`.  
Le script `npm run i18n:check` échoue tant qu'elles ne sont pas ajoutées.

### 2.1 Clé invalide — BUG à corriger en priorité

| Fichier | Ligne | Problème |
|---|---|---|
| `src/pages/chauffeur/ChauffeurDashboard.jsx` | 339 | `LOCALE_MAP_C[t('_lang')]` — **`_lang` n'est pas une clé i18n** |

**Correction** : remplacer `t('_lang')` par `lang` (déjà disponible via `const { t, lang } = useI18n();`).

```jsx
// AVANT (incorrect)
new Date(2000, i, 1).toLocaleString(LOCALE_MAP_C[t('_lang')] || 'fr-FR', { month: 'short' })

// APRÈS (correct)
new Date(2000, i, 1).toLocaleString(LOCALE_MAP_C[lang] || 'fr-FR', { month: 'short' })
```

### 2.2 Clés à ajouter aux 4 dictionnaires

Ces clés doivent être ajoutées dans `fr.js`, `en.js`, `ar.js`, `es.js` :

| Clé | FR | EN | AR | ES |
|---|---|---|---|---|
| `cancel` | Annuler | Cancel | إلغاء | Cancelar |
| `reject` | Refuser | Reject | رفض | Rechazar |
| `accept` | Accepter | Accept | قبول | Aceptar |
| `nav_dashboard` | Tableau de bord | Dashboard | لوحة القيادة | Panel |
| `nav_live_map` | Carte en direct | Live map | الخريطة المباشرة | Mapa en vivo |
| `nav_history` | Historique | History | السجل | Historial |
| `nav_drive_mode` | Mode conduite | Drive mode | وضع القيادة | Modo conducción |
| `nav_objectives` | Objectifs | Objectives | الأهداف | Objetivos |
| `nav_messages` | Messages | Messages | الرسائل | Mensajes |
| `nav_profile` | Profil | Profile | الملف الشخصي | Perfil |
| `nav_settings` | Paramètres | Settings | الإعدادات | Configuración |

---

## 3. Fichiers à corriger — 33 fichiers, 134 occurrences

Classés par **priorité** (impact utilisateur + volume de travail).

---

### PRIORITÉ 1 — Critique (bloquant i18n:check)

#### `src/pages/chauffeur/ChauffeurDashboard.jsx` — 6 occurrences
- **L.339** : Bug `t('_lang')` → remplacer par `lang` (voir §2.1)
- **L.436–440** : `SOS_OPTIONS` — labels/messages en français hardcodés (note : ce tableau n'est pas rendu dans le JSX, mais doit être nettoyé)
  ```js
  { label: 'Accident de véhicule', message: 'ACCIDENT — Véhicule impliqué...' }
  // → { labelKey: 'chd_sos_accident', msgKey: 'chd_sos_accident_msg' }
  ```
- **L.182** : `label: \`✅ ${t('chd_mission_proposed').replace('✨ ','') || 'Mission assignée'}\`` — le fallback `'Mission assignée'` est en français

---

### PRIORITÉ 2 — Pages principales (interface utilisateur)

#### `src/pages/auth/Register.jsx` — 10 occurrences
- Formulaire d'inscription complet encore en français
- Textes concernés : messages d'erreur (`"Erreur lors de l'inscription..."`), titres (`"Compte créé !"`), descriptions des rôles, labels de formulaire
- **Action** : ajouter `useI18n()`, créer clés `reg_*`, remplacer tous les textes

#### `src/pages/client/CheckoutPage.jsx` — 11 occurrences
- Tunnel de commande : labels, messages d'erreur, estimations (ex. `"Livraison estimée : 30–45 min"`)
- Textes concernés : `'Code promo invalide ou expiré.'`, `'Une erreur est survenue...'`, `'Livraison estimée : 30–45 min'`, labels de formulaire
- **Action** : ajouter clés `ck_*`

#### `src/pages/client/ClientDashboard.jsx` — 9 occurrences
- Dashboard client : statuts commandés en dur (`label: 'Validée'`, `label: 'En préparation'`), catégories (`label: 'Électronique'`)
- **Action** : utiliser `tStatus()` pour les statuts, créer clés `cl_*` pour les catégories

#### `src/pages/Commandes.jsx` — 14 occurrences (VOLUME ÉLEVÉ)
- Page admin des commandes
- Headers de tableau : `['ID', 'Référence', 'Client', 'Boutique', 'Statut', ...]`
- Config statuts : `{ label: 'Validée' }`, `{ label: 'En préparation' }`, etc.
- Boutons d'action : `'Préparer →'`, `'En route →'`
- **Action** : utiliser `tStatus()` pour statuts, créer clés `cmd_*`

#### `src/pages/Tickets.jsx` — 9 occurrences
- Centre de support
- `'Gérez les demandes de support...'`, `'Créez et suivez...'`, `'Toutes priorités'`, `'Priorité'`, `'Dépassé'`, `'Aucune réponse pour l'instant.'`
- **Action** : créer clés `tkt_*`

#### `src/pages/Transporteurs.jsx` — 7 occurrences
- Page admin liste transporteurs
- Headers tableau, labels radar chart (`'Ponctualité'`, `'Fiabilité'`, `'Rapidité'`)
- Statut vérification : `'✔ Vérifié'` / `'⏳ En attente vérification'`
- **Action** : créer clés `tr_*`

---

### PRIORITÉ 3 — Pages admin & utilitaires

#### `src/utils/exportCsv.js` — 15 occurrences (VOLUME ÉLEVÉ)
- Utilitaire d'export CSV/PDF — headers de colonnes tous en français
- `alert('Aucune donnée à exporter.')`, labels `'Référence'`, `'Date création'`, `'Prénom'`, `'Téléphone'`, etc.
- **Note** : ce fichier exporte des données (labels CSV) — peut rester en FR pour les exports, mais l'`alert()` doit être traduit
- **Action** : passer l'objet `t` en paramètre ou utiliser l'`alert` via `t('export_no_data')`

#### `src/pages/admin/Dashboard.jsx` — 8 occurrences
- Labels de statuts dans config (`'✅ Livrée'`, `'❌ Annulée'`, `'⚙️ Préparation'`)
- Données mock : `'Inutilisé'`, `'Électronique'`, `'Médical'`
- `MONTHS_KEYS = ['Jan','Fév','Mar',...]` — tableau de mois en français hardcodé
- **Action** : remplacer `MONTHS_KEYS` par génération dynamique avec `lang`, utiliser `tStatus()` pour statuts

#### `src/pages/Incidents.jsx` — 2 occurrences
- `"Suivez et résolvez les incidents..."` (sous-titre)
- `"Notes de résolution"` (label de section)
- **Action** : créer clés `inc_*`

#### `src/pages/MapPage.jsx` — 6 occurrences
- `"Chargement des données cartographiques…"` — message de chargement
- Labels de légende / KPI encore hardcodés
- **Action** : utiliser clés `mp_*` existantes ou en créer

#### `src/pages/Rapports.jsx` — 3 occurrences
- Dict de statuts inline : `EN_ATTENTE: 'En attente'`, `VALIDEE: 'Validée'`, etc.
- `'## Indicateurs clés'` dans un export markdown
- **Action** : utiliser `tStatus()`, créer clé `rpt_indicators`

#### `src/pages/admin/Dashboard.jsx` — déjà listé ci-dessus

#### `src/pages/admin/SettingsPage.jsx` — 2 occurrences
- `<option value="fr">🇫🇷 Français</option>` (select de langue — acceptable)
- Label inline `{fr: 'Français', ar: 'العربية', ...}` — dictionnaire de noms de langues en dur
- **Action** : acceptable (noms de langues natifs), ou créer clés `lang_name_*`

#### `src/pages/admin/BlacklistPage.jsx` — 1 occurrence
- `placeholder="Contexte supplémentaire…"` — placeholder en français
- **Action** : `t('bl_extra_context')`

#### `src/pages/chauffeur/DashboardFinancier.jsx` — 1 occurrence
- L.333 : `['Date', 'Référence', 'Distance', 'Bruts', t('fin_commission'), 'Nets']`
  Mélange de textes hardcodés et de clés i18n dans le même tableau
- **Action** : passer tous les headers en clés `fin_*`

#### `src/pages/client/OrderTrackingPage.jsx` — 2 occurrences
- `"Détails"` — titre de section
- `"⭐ Notez votre expérience"` — titre de notation
- **Action** : créer clés `ot_details`, `ot_rate_experience`

#### `src/pages/store/Products.jsx` — 2 occurrences
- `label: 'Catégorie'` dans config de formulaire
- `'Sauvegarde…'` / `'Enregistrer'` / `'Créer'` dans bouton de soumission
- **Action** : créer clés `prd_category`, `prd_saving`, `prd_save`, `prd_create`

---

### PRIORITÉ 4 — Composants partagés

#### `src/components/OnboardingTour.jsx` — 4 occurrences
- Descriptions du tour d'accueil utilisateur (`"Parcourez les boutiques..."`, `"Suivez en temps réel"`, etc.)
- **Action** : créer clés `onb_*`

#### `src/components/OrderTimeline.jsx` — 3 occurrences
- `{ label: 'Validée', short: 'Validée' }`, `{ label: 'Préparation', short: 'Prépa' }`, `{ label: 'Livrée' }`
- **Action** : utiliser `tStatus()` ou convertir en `labelKey`

#### `src/components/KanbanCommandes.jsx` — 2 occurrences
- `label: 'En préparation'`, `label: 'Livrée'` dans colonnes Kanban
- **Action** : utiliser `tStatus()` ou clés `kb_*`

#### `src/components/ui/EmptyState.jsx` — 1 occurrence
- `title = 'Aucun résultat'` — prop par défaut
- **Action** : `title = t('empty_no_result')` (nécessite hook dans composant)

#### `src/components/DrivingMode.jsx` — 1 occurrence
- `"temps restant estimé"` — label sous le compteur
- **Action** : `t('dm_time_remaining')`

#### `src/components/GroupOrderModal.jsx` — 1 occurrence
- `'🚀 Créer une session groupe'` — texte de bouton
- **Action** : `t('go_create_session')`

#### `src/components/CommandeFormModal.jsx` — 1 occurrence
- `adresse_depart: 'Entrepôt Tanger Med'` — adresse par défaut hardcodée
- **Note** : donnée métier, peut rester ou venir d'une config backend

---

### PRIORITÉ 5 — Éléments techniques (impact minimal)

Ces fichiers contiennent du français dans des contextes non-UI ou acceptables :

| Fichier | Occurrence | Recommandation |
|---|---|---|
| `components/Header.jsx` L.8 | `label: 'Français'` dans LanguageSwitcher | ✅ Acceptable — nom natif de la langue |
| `components/LanguageSwitcher.jsx` L.15 | `label: 'Français'` | ✅ Acceptable — nom natif |
| `components/layout/AppHeader.jsx` L.29 | `label: 'Français'` | ✅ Acceptable — nom natif |
| `contexts/NotificationContext.jsx` L.279 | Message d'erreur dev `throw new Error(...)` | ✅ Messages dev, non visible utilisateur |
| `contexts/ThemeContext.jsx` L.70,83 | `throw new Error(...)` + `aria-label` | ⚠️ L'aria-label devrait être traduit |
| `hooks/useGeolocation.js` L.10 | `setError('Géolocalisation non supportée.')` | ⚠️ Visible utilisateur — créer clé `geo_not_supported` |
| `hooks/useNotificationSocket.js` L.77 | `console.warn(...)` | ✅ Log dev uniquement |
| `App.jsx` L.187 | `pageTitle="Paramètres"` | ⚠️ Visible dans le titre de page — créer clé |

---

## 4. Plan d'action recommandé (ordre d'exécution)

### Étape 1 — Débloquer i18n:check (30 min)
1. **Ajouter les 11 clés manquantes** (`cancel`, `reject`, `accept`, `nav_*`) aux 4 dictionnaires
2. **Corriger le bug `t('_lang')`** dans `ChauffeurDashboard.jsx` L.339 → remplacer par `lang`

### Étape 2 — Pages utilisateur critiques (2–3h)
3. `auth/Register.jsx` — 10 occurrences → clés `reg_*`
4. `client/CheckoutPage.jsx` — 11 occurrences → clés `ck_*`
5. `client/ClientDashboard.jsx` — 9 occurrences → utiliser `tStatus()` + clés `cl_*`
6. `Commandes.jsx` — 14 occurrences → clés `cmd_*`
7. `Tickets.jsx` — 9 occurrences → clés `tkt_*`

### Étape 3 — Pages admin & utilitaires (1–2h)
8. `Transporteurs.jsx` — 7 occurrences → clés `tr_*`
9. `admin/Dashboard.jsx` — 8 occurrences → fix MONTHS + tStatus
10. `utils/exportCsv.js` — 15 occurrences → passer `t` en paramètre
11. `chauffeur/DashboardFinancier.jsx` — 1 occurrence → clés `fin_*`
12. `Incidents.jsx`, `MapPage.jsx`, `Rapports.jsx` — 11 occurrences totales

### Étape 4 — Composants partagés (1h)
13. `OrderTimeline.jsx`, `KanbanCommandes.jsx` → utiliser `tStatus()`
14. `OnboardingTour.jsx` → clés `onb_*`
15. `DrivingMode.jsx`, `GroupOrderModal.jsx`, `EmptyState.jsx`
16. `client/OrderTrackingPage.jsx`, `store/Products.jsx`

### Étape 5 — Éléments techniques (30 min)
17. `hooks/useGeolocation.js` → `t('geo_not_supported')`
18. `contexts/ThemeContext.jsx` → aria-label traduit
19. `admin/BlacklistPage.jsx`, `admin/SettingsPage.jsx`
20. `App.jsx` → pageTitle via t()

### Étape 6 — Vérification finale
```bash
npm run i18n:check   # Doit retourner 0 erreur
```
```bash
# Babel parse sur tous les fichiers modifiés
node -e "require('@babel/parser').parse(require('fs').readFileSync('src/pages/...jsx','utf8'),{sourceType:'module',plugins:['jsx']})"
```

---

## 5. Résumé des nouvelles clés à créer

| Préfixe | Pour | Estimation |
|---|---|---|
| `cancel`, `reject`, `accept` | Actions générales | 3 clés |
| `nav_*` | Navigation chauffeur | 8 clés |
| `reg_*` | Page d'inscription | ~15 clés |
| `ck_*` | Checkout / paiement | ~12 clés |
| `cmd_*` | Page commandes admin | ~20 clés |
| `tkt_*` | Page tickets support | ~10 clés |
| `tr_*` | Page transporteurs | ~10 clés |
| `inc_*` | Page incidents | ~5 clés |
| `onb_*` | Onboarding tour | ~8 clés |
| `dm_*` | Drive mode composant | ~3 clés |
| `fin_*` (compléments) | Dashboard financier | ~3 clés |
| `ot_*` | Order tracking | ~5 clés |
| `geo_*` | Géolocalisation | ~2 clés |
| Divers | Autres composants | ~10 clés |
| **TOTAL estimé** | | **~114 nouvelles clés** |

---

## 6. Fichiers déjà 100% traduits ✅

Ces fichiers ont été entièrement traités dans les sessions précédentes :

- `pages/admin/AlertesCentrePage.jsx`
- `pages/admin/Contrats.jsx` *(cancel utilisé — clé manquante à ajouter)*
- `pages/admin/ImpersonationPage.jsx`
- `pages/admin/PrevisionsPage.jsx`
- `pages/admin/Rapports.jsx` *(statuts hardcodés encore présents)*
- `pages/admin/Scoring.jsx`
- `pages/chauffeur/DashboardFinancier.jsx` *(1 ligne restante)*
- `pages/chauffeur/GamificationPage.jsx`
- `pages/chauffeur/ModeLivraison.jsx`
- `pages/chauffeur/SignalerIncident.jsx`
- `pages/chauffeur/TransporteurParametresPage.jsx`
- `pages/store/StoreDashboard.jsx`
- `pages/store/Orders.jsx`
- `pages/store/Analytics.jsx`
- `pages/store/AvisPage.jsx`
- `pages/store/GaleriePage.jsx`
- `components/GlobalSearch.jsx`
- `contexts/I18nContext.jsx`
- `layouts/TransporteurLayout.jsx`
- `layouts/StoreLayout.jsx`

---

*Pour atteindre `npm run i18n:check` → 0 erreur : compléter les étapes 1 et 2 suffit.  
Pour une internationalisation complète à 100% : toutes les étapes 1–5.*
