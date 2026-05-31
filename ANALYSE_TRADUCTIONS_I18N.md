# Analyse des langues et plan de correction i18n

Date d'analyse : 27 mai 2026  
Projet : DeliverMap / LogisTrack  
Objectif : corriger toutes les parties non traduites et rendre l'application coherente en francais, anglais, arabe et espagnol.

## 1. Resume du probleme

Le projet possede deja un systeme de traduction dans `frontend/src/contexts/I18nContext.jsx`. C'est une bonne base : l'application utilise un provider global, expose `useI18n()`, fournit `t(key)`, gere la langue dans `localStorage`, configure `document.documentElement.lang`, gere `dir="rtl"` pour l'arabe, et contient des helpers de formatage pour dates, nombres et prix.

Le probleme actuel n'est donc pas l'absence de systeme i18n. Le probleme est plutot que l'internationalisation est appliquee de maniere incomplete :

- plusieurs composants affichent encore du texte en dur en francais ;
- beaucoup de `placeholder`, `title`, `alert`, `confirm` et messages d'erreur ne passent pas par `t(...)` ;
- les dictionnaires ne sont pas tous complets ;
- certaines pages utilisent `useI18n`, mais melangent encore des textes traduits et non traduits ;
- les pages recentes semblent moins internationalisees que les pages principales ;
- l'arabe demande aussi une verification visuelle RTL, pas seulement une traduction des mots.

## 2. Etat actuel du systeme i18n

### Fichier principal

Le systeme actuel est centralise ici :

`frontend/src/contexts/I18nContext.jsx`

Il contient :

- `LOCALE_MAP` : `fr`, `en`, `ar`, `es`.
- Les dictionnaires : `FR`, `EN`, `AR`, `ES`.
- Le provider `I18nProvider`.
- Le hook `useI18n`.
- Les helpers : `formatDate`, `formatTime`, `formatDateTime`, `formatPrice`, `formatNumber`, `tStatus`.
- Le fallback actuel : si une cle manque dans la langue active, l'application revient vers `FR[key]`, puis vers le nom de la cle.

### Etat des dictionnaires

Analyse approximative des cles :

- `FR` : 554 cles.
- `EN` : 554 cles.
- `AR` : 194 cles.
- `ES` : 165 cles.

Conclusion :

- Le francais est la langue de reference.
- L'anglais semble aligne avec le francais.
- L'arabe est tres incomplet : environ 360 cles manquantes par rapport au francais.
- L'espagnol est tres incomplet : environ 389 cles manquantes par rapport au francais.

Le fallback vers le francais masque une partie du probleme : l'application ne casse pas, mais un utilisateur en arabe ou espagnol verra encore beaucoup de textes en francais.

## 3. Zones ou les textes non traduits apparaissent encore

Les recherches dans `frontend/src` montrent des textes visibles non passes par `t(...)` dans plusieurs zones.

### Routes et layouts

Fichiers concernes :

- `frontend/src/App.jsx`
- `frontend/src/layouts/TransporteurLayout.jsx`
- `frontend/src/layouts/StoreLayout.jsx`

Problemes observes :

- Titres de pages passes en dur, par exemple `Tableau de bord financier`, `Gamification & Badges`, `Parametres`.
- Textes de chargement comme `Chargement...`.
- Titres de layout et boutons de deconnexion codés directement.

Correction recommandee :

- Remplacer les props `pageTitle="..."` par `pageTitle={t('...')}`.
- Ajouter `useI18n()` dans les wrappers si necessaire.
- Creer des cles comme :

```js
drv_financial_dashboard: 'Tableau de bord financier',
drv_gamification_title: 'Gamification et badges',
settings_title: 'Parametres',
common_loading: 'Chargement...',
```

### Navigation admin

Fichiers concernes :

- `frontend/src/components/layout/AppSidebar.jsx`
- `frontend/src/components/layout/AppHeader.jsx`
- `frontend/src/components/AdminSidebar.jsx`
- `frontend/src/components/Header.jsx`
- `frontend/src/components/GlobalSearch.jsx`

Problemes observes :

- Plusieurs sections de sidebar sont encore en dur : `Tableau de bord`, `Operations`, `Gestion`, `Outils Admin`, `Ma Boutique`, `Navigation`.
- Plusieurs `title` ne sont pas traduits : `Se deconnecter`, `Supprimer`, `Tout marquer lu`.
- La recherche globale contient des labels fixes : `Commandes`, `Clients`, `Transporteurs`, `Aucun resultat`.

Correction recommandee :

- Utiliser les cles deja existantes dans `sb_*`, `common_*`, `adm_*`.
- Ajouter les cles manquantes pour les titres d'icones et tooltips.
- Ne pas garder de fallback visible comme `t('search_placeholder') || 'Rechercher...'`; si la cle manque, il faut la corriger dans le dictionnaire.

### Pages admin

Fichiers concernes :

- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/Commandes.jsx`
- `frontend/src/pages/Clients.jsx`
- `frontend/src/pages/Transporteurs.jsx`
- `frontend/src/pages/Boutiques.jsx`
- `frontend/src/pages/Incidents.jsx`
- `frontend/src/pages/Tickets.jsx`
- `frontend/src/pages/Contrats.jsx`
- `frontend/src/pages/Scoring.jsx`
- `frontend/src/pages/Rapports.jsx`
- `frontend/src/pages/MapPage.jsx`
- `frontend/src/pages/admin/LiveDashboard.jsx`
- `frontend/src/pages/admin/AlertesCentrePage.jsx`
- `frontend/src/pages/admin/SettingsPage.jsx`
- `frontend/src/pages/admin/PrevisionsPage.jsx`
- `frontend/src/pages/admin/ImpersonationPage.jsx`
- `frontend/src/pages/admin/HeatmapPage.jsx`
- `frontend/src/pages/admin/ZonesPage.jsx`
- `frontend/src/pages/admin/PromotionsPage.jsx`
- `frontend/src/pages/admin/BannieresPage.jsx`
- `frontend/src/pages/admin/BlacklistPage.jsx`

Problemes frequents :

- Certains titres sont traduits, d'autres non.
- Les messages d'erreur utilisent encore `alert('Erreur...')`.
- Les confirmations utilisent encore `confirm('Supprimer... ?')`.
- Les placeholders restent parfois en francais.
- Les libelles de cartes KPI sont parfois en dur.
- Les labels dans les popups de carte ne sont pas toujours traduits.
- Les boutons avec `title="..."` ne sont pas toujours internationalises.

Exemples reperes :

- `Commandes.jsx` : `Annuler la commande ${cmd.reference} ?`, `Vue liste`, `Vue Kanban`, `Exporter la page courante en CSV`, `Voir detail`, `Assigner transporteur`.
- `MapPage.jsx` : `Rechercher sur la carte...`, `Chargement des donnees cartographiques...`, `Disponible`, `Boutique`, `Aucun chauffeur actif`.
- `LiveDashboard.jsx` : `Tableau de bord live`, `Commandes actives`, `Incidents ouverts`, `Transporteurs en route`, `Aucune livraison en cours`.
- `SettingsPage.jsx` : plusieurs sections comme `Mot de passe`, `Sessions actives`, `Preferences de notification`, `Cache et stockage local`, `Maintenance`.
- `Tickets.jsx` : `Nouveau ticket`, `Aucun ticket`, `Repondre au ticket...`, categories comme `Livraison`.

Correction recommandee :

- Pour chaque page, importer `useI18n()` si ce n'est pas deja fait.
- Remplacer chaque texte visible par `t('cle')`.
- Ajouter les cles dans les quatre dictionnaires.
- Remplacer les messages dynamiques par des cles avec parametres :

```js
confirm_cancel_order: 'Annuler la commande {reference} ?',
empty_search_result_for: 'Aucun resultat pour "{query}"',
```

Usage :

```jsx
window.confirm(t('confirm_cancel_order', { reference: cmd.reference }))
```

### Pages client

Fichiers concernes :

- `frontend/src/pages/client/ClientDashboard.jsx`
- `frontend/src/pages/client/CheckoutPage.jsx`
- `frontend/src/pages/client/OrderTrackingPage.jsx`
- `frontend/src/pages/client/FavoritesPage.jsx`
- `frontend/src/components/CartSlideover.jsx`
- `frontend/src/components/ClientChat.jsx`
- `frontend/src/components/FideliteWidget.jsx`
- `frontend/src/components/GroupOrderModal.jsx`
- `frontend/src/components/ChatbotWidget.jsx`

Problemes observes :

- `ClientDashboard.jsx` utilise deja beaucoup `t(...)`, mais garde encore quelques textes directs.
- `CheckoutPage.jsx` contient plusieurs labels et placeholders directs : adresse, quartier, ville, instructions, carte bancaire.
- `OrderTrackingPage.jsx` contient encore des placeholders/commentaires visibles.
- `CartSlideover.jsx` utilise une devise `DZD` dans un endroit, alors que le projet travaille plutot avec MAD.
- `FideliteWidget.jsx` utilise encore des `alert(...)` avec texte direct.
- `GroupOrderModal.jsx` contient des erreurs et descriptions en dur.
- `ChatbotWidget.jsx` contient des titres, boutons et tooltips non traduits.

Correction recommandee :

- Creer un namespace `cl_` pour tous les parcours client.
- Creer un namespace `checkout_` pour le tunnel de commande.
- Creer un namespace `track_` pour le suivi de commande.
- Creer un namespace `chatbot_` pour l'assistant.
- Remplacer les devises fixes par `formatPrice(amount, 'MAD')`.

### Pages boutique / fondateur

Fichiers concernes :

- `frontend/src/pages/store/StoreDash.jsx`
- `frontend/src/pages/store/Orders.jsx`
- `frontend/src/pages/store/Products.jsx`
- `frontend/src/pages/store/Analytics.jsx`
- `frontend/src/pages/store/GaleriePage.jsx`
- `frontend/src/pages/store/AvisPage.jsx`
- `frontend/src/layouts/StoreLayout.jsx`

Problemes observes :

- Beaucoup de textes restent en francais direct.
- Les pages boutique utilisent moins `useI18n()` que les pages admin.
- Les confirmations et erreurs de gestion produit ne sont pas traduites.
- Les labels de statistiques sont fixes : `CA ce mois`, `Commandes totales`, `Note boutique`, `Taux annulation`.
- Les tables produits utilisent des headers fixes : `Image`, `Produit`, `Categorie`, `Prix`, `Stock`, `Disponible`, `Actions`.

Correction recommandee :

- Ajouter un namespace `store_` :

```js
store_dashboard_title
store_total_orders
store_month_revenue
store_total_revenue
store_rating
store_cancellation_rate
store_recent_orders
store_no_orders
store_products_title
store_new_product
store_delete_product_confirm
store_stock_invalid
store_gallery_add_image
store_reviews_empty
```

- Centraliser les erreurs de produit :

```js
store_product_save_error
store_product_delete_error
store_stock_update_error
```

### Pages transporteur / chauffeur

Fichiers concernes :

- `frontend/src/pages/chauffeur/ChauffeurDashboard.jsx`
- `frontend/src/pages/chauffeur/ModeLivraison.jsx`
- `frontend/src/pages/chauffeur/DashboardFinancier.jsx`
- `frontend/src/pages/chauffeur/GamificationPage.jsx`
- `frontend/src/pages/chauffeur/SignalerIncident.jsx`
- `frontend/src/pages/chauffeur/TransporteurParametresPage.jsx`
- `frontend/src/components/DrivingMode.jsx`

Problemes observes :

- Des placeholders restent directs : `Rechercher une expedition, client...`, `Scanner ou saisir le code client...`, `Message au client...`.
- Des alerts restent directs.
- Plusieurs statuts chauffeur sont parfois construits sous forme de texte direct : `En livraison`, `Disponible`, `Hors ligne`.
- La page parametres transporteur utilise deja des cles `par_*`, mais certains placeholders restent directs.

Correction recommandee :

- Continuer avec les namespaces existants `drv_*` et `par_*`.
- Ajouter un sous-ensemble pour le mode livraison :

```js
drv_delivery_mode
drv_scan_pin_placeholder
drv_client_message_placeholder
drv_search_delivery_placeholder
drv_confirm_pin
drv_take_photo_proof
drv_notify_departure
drv_route_optimized
```

## 4. Backend et messages API

Le backend Django renvoie probablement des messages d'erreur en francais dans plusieurs endpoints. Cela peut poser probleme si le frontend affiche directement `error.response.data.detail`.

Fichiers backend a verifier ensuite :

- `backend/accounts/views.py`
- `backend/commandes/views.py`
- `backend/livraisons/views.py`
- `backend/transporteurs/views.py`
- `backend/incidents/views.py`
- `backend/tickets/views.py`
- `backend/contrats/views.py`
- `backend/chatbot/views.py`

Deux strategies possibles :

### Strategie simple recommandee pour ce projet

Le backend renvoie des codes d'erreur stables, le frontend traduit.

Exemple backend :

```json
{
  "code": "ORDER_NOT_FOUND",
  "detail": "Commande introuvable"
}
```

Frontend :

```js
t(`api_error_${error.response?.data?.code}`)
```

Avantage : le frontend controle toutes les langues.

### Strategie Django i18n complete

Utiliser `gettext_lazy` cote Django et activer `LocaleMiddleware`.

Avantage : propre pour une vraie API multilingue.  
Inconvenient : plus long a mettre en place et a tester.

Pour ce projet, la strategie simple avec codes d'erreur est plus rapide et plus fiable.

## 5. Methode concrete pour corriger sans se perdre

### Etape 1 - Nettoyer et organiser les dictionnaires

Le fichier `I18nContext.jsx` devient trop gros. Il faut deplacer les dictionnaires dans des fichiers separes :

```text
frontend/src/i18n/fr.js
frontend/src/i18n/en.js
frontend/src/i18n/ar.js
frontend/src/i18n/es.js
frontend/src/i18n/index.js
```

`I18nContext.jsx` ne doit garder que :

- le provider ;
- le hook ;
- les helpers de formatage ;
- l'import des dictionnaires.

Avantage : les traductions seront plus faciles a corriger, comparer et maintenir.

### Etape 2 - Garder le francais comme source de verite

Le dictionnaire `fr.js` doit etre complet. Toutes les nouvelles cles doivent d'abord etre ajoutees en francais.

Regle :

- pas de texte visible directement dans les composants ;
- tout texte visible doit avoir une cle dans `fr.js` ;
- les autres langues doivent avoir exactement les memes cles.

### Etape 3 - Completer AR et ES

Aujourd'hui :

- `AR` manque environ 360 cles.
- `ES` manque environ 389 cles.

Action :

- Copier toutes les cles manquantes depuis `FR`.
- Traduire progressivement les valeurs.
- Tant qu'une traduction n'est pas prete, mettre une valeur temporaire claire, mais garder la cle.

Exemple :

```js
// Mauvais : cle absente

// Acceptable temporairement :
store_total_orders: 'Commandes totales', // TODO translate ES
```

### Etape 4 - Remplacer les textes page par page

Ordre recommande :

1. Layouts et navigation.
2. Auth : login/register.
3. Admin : dashboard, commandes, map, transporteurs, incidents, tickets.
4. Client : dashboard, checkout, tracking, favoris.
5. Boutique : dashboard, produits, commandes, avis, galerie.
6. Transporteur : dashboard, mode livraison, finances, gamification, parametres.
7. Composants globaux : chatbot, notifications, recherche globale, pagination, empty states.

### Etape 5 - Standardiser les noms de cles

Utiliser ces prefixes :

- `common_` : textes reutilisables.
- `auth_` : login/register.
- `nav_` ou `sb_` : navigation/sidebar.
- `adm_` : actions admin communes.
- `dash_` : dashboard admin.
- `co_` : commandes.
- `map_` : carte.
- `inc_` : incidents.
- `tic_` ou `ticket_` : tickets.
- `contrat_` : contrats.
- `cl_` : client.
- `checkout_` : tunnel commande.
- `track_` : suivi commande.
- `store_` : boutique/fondateur.
- `drv_` : transporteur/chauffeur.
- `par_` : parametres transporteur.
- `chatbot_` : assistant.
- `api_error_` : erreurs venant du backend.

### Etape 6 - Traduire aussi les attributs invisibles

Ne pas oublier :

- `placeholder`
- `title`
- `aria-label`
- `alt`
- `alert`
- `confirm`
- messages toast
- messages d'erreur
- textes dans les popups Leaflet
- labels de graphiques
- noms des series Recharts
- noms de fichiers exportes si visibles

Exemple :

```jsx
<button title={t('common_delete')} aria-label={t('common_delete')}>
  <Trash2 />
</button>
```

### Etape 7 - Gerer les variables dynamiques

Le systeme `t(key, params)` supporte deja `{param}`.

Ajouter des cles comme :

```js
confirm_cancel_order: 'Annuler la commande {reference} ?',
search_no_result_for: 'Aucun resultat pour "{query}"',
stores_available_count: '{count} boutiques disponibles',
last_update_at: 'Mis a jour a {time}',
```

Usage :

```jsx
t('confirm_cancel_order', { reference: cmd.reference })
t('stores_available_count', { count })
```

### Etape 8 - Verifier RTL pour arabe

Le provider met deja `dir="rtl"` pour `ar`, mais il faut verifier visuellement :

- sidebar a droite ou comportement acceptable ;
- alignement des textes ;
- icones directionnelles inversees si necessaire ;
- fleches precedent/suivant ;
- timeline commande ;
- carte et popups ;
- formulaires ;
- tableaux ;
- modales.

Ajouter si besoin des classes CSS :

```css
html[dir="rtl"] .sidebar {
  border-left: 1px solid var(--border);
  border-right: 0;
}

html[dir="rtl"] .icon-directional {
  transform: scaleX(-1);
}
```

## 6. Comment detecter les textes non traduits

### Recherche rapide dans le terminal

Chercher les textes francais fréquents :

```bash
rg "Erreur|Chargement|Rechercher|Annuler|Supprimer|Modifier|Ajouter|Aucune|Aucun|Commande|Client|Transporteur|Boutique|Livraison|Ticket|Contrat" frontend/src -g "*.jsx" -g "*.js"
```

Chercher les attributs souvent oublies :

```bash
rg "alert\\(|confirm\\(|placeholder=|title=|aria-label=|alt=" frontend/src -g "*.jsx" -g "*.js"
```

Chercher les textes mal encodes :

```bash
rg "Ã|Ø|Ù|ð|�" frontend/src backend -g "*.jsx" -g "*.js" -g "*.py"
```

### Script conseille a ajouter

Ajouter un script `scripts/check-i18n.mjs` qui :

- lit `fr.js`, `en.js`, `ar.js`, `es.js` ;
- compare les cles ;
- affiche les cles manquantes par langue ;
- echoue avec code `1` si une langue est incomplete ;
- cherche les textes visibles non traduits dans `frontend/src`.

Commande cible :

```bash
npm run i18n:check
```

Dans `frontend/package.json` :

```json
{
  "scripts": {
    "i18n:check": "node scripts/check-i18n.mjs"
  }
}
```

## 7. Exemple de correction

Avant :

```jsx
alert('Erreur lors de la suppression.');
if (!confirm('Supprimer ce produit ?')) return;
<button title="Supprimer">...</button>
<input placeholder="Rechercher une expedition, client..." />
```

Apres :

```jsx
alert(t('store_product_delete_error'));
if (!confirm(t('store_product_delete_confirm'))) return;
<button title={t('adm_delete')} aria-label={t('adm_delete')}>...</button>
<input placeholder={t('drv_search_delivery_placeholder')} />
```

Dans `fr.js` :

```js
store_product_delete_error: 'Erreur lors de la suppression.',
store_product_delete_confirm: 'Supprimer ce produit ?',
drv_search_delivery_placeholder: 'Rechercher une expedition, client...',
```

Dans `en.js` :

```js
store_product_delete_error: 'Error while deleting.',
store_product_delete_confirm: 'Delete this product?',
drv_search_delivery_placeholder: 'Search a shipment or client...',
```

Dans `ar.js` :

```js
store_product_delete_error: 'حدث خطأ أثناء الحذف.',
store_product_delete_confirm: 'هل تريد حذف هذا المنتج؟',
drv_search_delivery_placeholder: 'ابحث عن توصيل أو عميل...',
```

Dans `es.js` :

```js
store_product_delete_error: 'Error al eliminar.',
store_product_delete_confirm: '¿Eliminar este producto?',
drv_search_delivery_placeholder: 'Buscar un envio o cliente...',
```

## 8. Priorites de correction

### Priorite haute

- Completer `AR` et `ES` avec toutes les cles de `FR`.
- Corriger les textes de navigation, headers et layouts.
- Corriger les pages les plus visibles : login/register, client dashboard, admin dashboard, commandes, carte, transporteur dashboard, boutique dashboard.
- Corriger les `alert`, `confirm`, `placeholder`, `title`.
- Verifier l'encodage UTF-8.

### Priorite moyenne

- Traduire les pages admin avancees : heatmap, zones, promotions, bannieres, blacklist, impersonation, previsions.
- Traduire les labels de graphiques et exports.
- Traduire les popups Leaflet.
- Ajouter le script `i18n:check`.

### Priorite basse

- Traduire les commentaires de code uniquement si necessaire pour l'equipe.
- Traduire les noms internes non visibles par l'utilisateur.
- Traduire les logs `console.error`, sauf s'ils sont affiches a l'utilisateur.

## 9. Checklist de validation finale

- [ ] Aucun texte visible important n'est ecrit directement dans JSX.
- [ ] Tous les `placeholder` passent par `t(...)`.
- [ ] Tous les `title` et `aria-label` passent par `t(...)`.
- [ ] Tous les `alert` et `confirm` passent par `t(...)`.
- [ ] Les quatre dictionnaires ont exactement les memes cles.
- [ ] Le fallback FR n'apparait plus dans l'interface arabe et espagnole.
- [ ] Les dates utilisent `formatDate`, `formatTime` ou `formatDateTime`.
- [ ] Les prix utilisent `formatPrice`.
- [ ] Les statuts backend utilisent `tStatus` ou une cle equivalente.
- [ ] Les messages backend affiches dans le frontend ont une cle traduisible.
- [ ] Le mode arabe est teste avec `dir="rtl"`.
- [ ] Les tableaux restent lisibles en arabe.
- [ ] Les modales restent lisibles en arabe.
- [ ] Les graphiques et cartes gardent des labels comprehensibles.
- [ ] Le script `npm run i18n:check` passe sans cles manquantes.

## 10. Plan de travail recommande

### Jour 1

- Extraire les dictionnaires vers `frontend/src/i18n`.
- Completer toutes les cles manquantes dans AR et ES.
- Ajouter `npm run i18n:check`.
- Corriger navigation, headers, layouts.

### Jour 2

- Corriger admin : dashboard, commandes, clients, transporteurs, incidents, tickets, contrats, carte.
- Corriger les messages `alert`, `confirm`, `placeholder`, `title`.
- Tester FR et EN.

### Jour 3

- Corriger client : dashboard, checkout, suivi, favoris, panier, chatbot.
- Corriger boutique : dashboard, produits, commandes, avis, galerie, analytics.
- Corriger transporteur : dashboard, mode livraison, finances, gamification, parametres.

### Jour 4

- Tester arabe RTL.
- Tester espagnol.
- Corriger les debordements visuels.
- Faire une passe finale avec `rg`.

## 11. Conclusion

Le projet est deja pret pour une vraie internationalisation, car le provider i18n existe et plusieurs pages utilisent deja `t(...)`. Le travail restant consiste surtout a finir la migration de tous les textes visibles vers des cles, completer les dictionnaires arabe et espagnol, et ajouter une verification automatique pour eviter les regressions.

La meilleure strategie est de garder `FR` comme source de verite, d'imposer les memes cles dans `EN`, `AR` et `ES`, puis de corriger les pages par role : admin, client, boutique et transporteur. Une fois cette discipline en place, ajouter une nouvelle langue ou finaliser les traductions deviendra beaucoup plus simple.
