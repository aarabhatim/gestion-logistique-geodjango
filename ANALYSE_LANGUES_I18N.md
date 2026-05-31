# Analyse du problème des langues et plan de correction

Date d'analyse : 26 mai 2026  
Projet : DeliverMap / LogisTrack

## 1. Résumé

Le projet possède déjà une base multilingue dans `frontend/src/contexts/I18nContext.jsx`. Les langues prévues sont :

- Français : `fr`
- Anglais : `en`
- Arabe : `ar`
- Espagnol : `es`

Le changement de langue existe aussi dans plusieurs composants comme :

- `frontend/src/components/LanguageSwitcher.jsx`
- `frontend/src/components/Header.jsx`
- `frontend/src/components/layout/AppHeader.jsx`
- `frontend/src/pages/admin/SettingsPage.jsx`

Mais les langues ne fonctionnent pas correctement parce que l'internationalisation n'est pas appliquée de manière complète et uniforme dans toute l'application.

## 2. Ce qui fonctionne déjà

- Un contexte i18n existe avec `I18nProvider`.
- La langue choisie est sauvegardée dans `localStorage` avec la clé `delivermap-i18n-v1`.
- Le provider applique `document.documentElement.lang`.
- Le provider applique `document.documentElement.dir = 'rtl'` pour l'arabe.
- Une fonction `t(key)` existe pour traduire les textes.
- Des fonctions `formatPrice` et `formatDate` existent.
- Plusieurs pages admin utilisent déjà `useI18n()`.
- La page paramètres permet de choisir langue, fuseau horaire et devise.

## 3. Problèmes trouvés

### 3.1 Beaucoup de textes sont encore codés en dur

Plusieurs pages affichent directement du texte en français au lieu d'utiliser `t('cle')`.

Exemples observés :

- `frontend/src/pages/MapPage.jsx`
- `frontend/src/pages/Contrats.jsx`
- `frontend/src/pages/Incidents.jsx`
- `frontend/src/pages/Tickets.jsx`
- `frontend/src/pages/store/StoreDash.jsx`
- `frontend/src/pages/store/Products.jsx`
- `frontend/src/pages/chauffeur/ChauffeurDashboard.jsx`
- `frontend/src/components/OrderTimeline.jsx`
- `frontend/src/components/KanbanCommandes.jsx`
- `frontend/src/components/GlobalSearch.jsx`
- `frontend/src/components/GroupOrderModal.jsx`

Conséquence : quand l'utilisateur choisit anglais, arabe ou espagnol, seules certaines parties changent. Le reste reste en français.

### 3.2 Certaines dates et nombres sont forcés en français

Plusieurs fichiers utilisent directement :

```js
toLocaleDateString('fr-FR')
toLocaleString('fr-FR')
toLocaleString('fr-FR')
```

Exemples :

- `frontend/src/components/AlertesActives.jsx`
- `frontend/src/utils/exportCsv.js`
- `frontend/src/components/FideliteWidget.jsx`
- `frontend/src/pages/admin/AlertesCentrePage.jsx`
- `frontend/src/pages/chauffeur/ChauffeurDashboard.jsx`
- `frontend/src/pages/client/ClientDashboard.jsx`
- `frontend/src/pages/Contrats.jsx`
- `frontend/src/pages/Clients.jsx`
- `frontend/src/pages/Commandes.jsx`
- `frontend/src/pages/Tickets.jsx`
- `frontend/src/pages/store/Analytics.jsx`
- `frontend/src/pages/store/StoreDash.jsx`
- `frontend/src/components/layout/AppHeader.jsx`

Conséquence : même si la langue est `en`, `ar` ou `es`, les dates restent au format français.

### 3.3 Le fallback masque les traductions manquantes

Dans `I18nContext.jsx`, la fonction `t` fait :

```js
dict[key] ?? DICTS.fr[key] ?? key
```

C'est pratique pour éviter les crashs, mais cela cache les clés manquantes. Si une traduction anglaise, arabe ou espagnole n'existe pas, l'application affiche le français sans signaler le problème.

Conséquence : on croit que la traduction existe, mais en réalité elle revient au français.

### 3.4 Encodage cassé dans plusieurs fichiers

Certains fichiers affichent des caractères comme :

```txt
ParamÃ¨tres
SÃ©curitÃ©
PrÃ©visions
FranÃ§ais
ðŸ‡«ðŸ‡·
Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©
```

Cela indique un problème de mojibake : du texte UTF-8 a probablement été lu ou sauvegardé avec un mauvais encodage.

Fichiers où le risque est visible :

- `frontend/src/contexts/I18nContext.jsx`
- `frontend/src/components/LanguageSwitcher.jsx`
- `frontend/src/components/layout/AppHeader.jsx`
- `frontend/src/pages/admin/SettingsPage.jsx`
- Plusieurs anciens fichiers `.md`

Conséquence : certains textes, drapeaux, accents et mots arabes peuvent apparaître cassés dans l'interface.

### 3.5 Plusieurs sélecteurs de langue existent

Le projet contient plusieurs implémentations proches :

- `LanguageSwitcher.jsx`
- `Header.jsx`
- `AppHeader.jsx`
- choix de langue dans `SettingsPage.jsx`

Conséquence : il y a un risque d'incohérence entre les menus. Un sélecteur peut afficher une langue différemment d'un autre ou ne pas utiliser les mêmes labels.

### 3.6 L'arabe nécessite plus qu'une traduction texte

Le provider active bien `dir="rtl"` pour l'arabe, mais cela ne suffit pas.

À vérifier :

- Sidebar inversée correctement.
- Alignement des boutons et tableaux.
- Modales et formulaires lisibles en RTL.
- Cartes et panneaux latéraux qui ne se cassent pas.
- Icônes directionnelles comme flèches gauche/droite.
- Espacement dans les tableaux.

Conséquence : l'arabe peut traduire quelques textes mais l'interface peut rester visuellement pensée pour le français.

### 3.7 Les textes venant du backend ne sont pas traduits

Certaines données viennent probablement de l'API :

- statuts de commandes ;
- types d'incidents ;
- catégories de tickets ;
- messages d'erreur ;
- notifications ;
- libellés de contrats ;
- statuts de transporteurs.

Si le backend envoie directement des textes en français, le frontend ne peut pas les traduire correctement sauf si on mappe les codes vers des clés i18n.

Exemple recommandé :

```js
statut: "EN_ROUTE"
```

Puis côté frontend :

```js
t(`status.${statut}`)
```

À éviter :

```js
statut_label: "En route"
```

## 4. Architecture recommandée

### 4.1 Séparer les dictionnaires

Actuellement, le fichier `I18nContext.jsx` contient toute la logique et tous les textes. Il est devenu trop grand.

Structure recommandée :

```txt
frontend/src/i18n/
  index.js
  locales/
    fr.json
    en.json
    ar.json
    es.json
  helpers.js
```

Avantages :

- fichiers plus faciles à maintenir ;
- comparaison plus simple entre langues ;
- ajout de nouvelles clés plus propre ;
- moins de risque de casser le provider React.

### 4.2 Garder un seul composant de sélection de langue

Il faut garder un seul composant officiel :

```txt
frontend/src/components/LanguageSwitcher.jsx
```

Puis l'utiliser partout :

- header admin ;
- header client ;
- paramètres ;
- pages transporteur si besoin.

Les autres menus de langue devraient être supprimés ou remplacés par ce composant.

### 4.3 Créer des namespaces de traduction

Les clés doivent être organisées par domaine.

Exemple :

```json
{
  "common": {
    "save": "Enregistrer",
    "cancel": "Annuler",
    "delete": "Supprimer"
  },
  "auth": {
    "login": "Connexion",
    "logout": "Déconnexion"
  },
  "admin": {
    "dashboard": "Tableau de bord",
    "orders": "Commandes"
  },
  "client": {
    "cart": "Mon panier",
    "checkout": "Passer commande"
  },
  "driver": {
    "available": "Disponible",
    "deliver": "Livrer"
  }
}
```

Cela évite les clés très longues et difficiles à retrouver.

### 4.4 Ajouter un mode debug pour les clés manquantes

En développement, `t(key)` devrait avertir quand une clé manque.

Exemple :

```js
if (import.meta.env.DEV && !dict[key]) {
  console.warn(`[i18n] Missing key "${key}" for lang "${lang}"`);
}
```

Pour l'affichage, on peut garder le fallback français, mais il faut au moins signaler le problème en console.

## 5. Plan de correction recommandé

### Phase 1 : corriger l'encodage

Objectif : supprimer les textes cassés.

Actions :

- Vérifier que tous les fichiers frontend sont en UTF-8.
- Corriger les textes cassés dans :
  - `I18nContext.jsx`
  - `LanguageSwitcher.jsx`
  - `AppHeader.jsx`
  - `SettingsPage.jsx`
- Remplacer les emojis cassés par de vrais emojis ou par des icônes Lucide.
- Vérifier que l'arabe s'affiche comme `العربية`, pas `Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©`.

Priorité : très haute, car c'est visible immédiatement.

### Phase 2 : centraliser les textes

Objectif : tout texte visible doit passer par `t()`.

Actions :

- Faire une passe page par page.
- Remplacer les textes français codés en dur par des clés i18n.
- Commencer par les pages les plus visibles :
  - login/register ;
  - dashboard admin ;
  - dashboard client ;
  - dashboard transporteur ;
  - commandes ;
  - carte ;
  - tickets ;
  - paramètres.

Exemple :

Avant :

```jsx
<button>Nouvelle expédition</button>
```

Après :

```jsx
<button>{t('admin.new_shipment')}</button>
```

### Phase 3 : remplacer les formats forcés en français

Objectif : dates, prix et nombres doivent suivre la langue choisie.

Actions :

- Remplacer `toLocaleDateString('fr-FR')` par `formatDate(date)`.
- Remplacer `toLocaleString('fr-FR')` par un helper `formatNumber`.
- Utiliser `formatPrice` pour tous les prix.

Exemple :

Avant :

```js
new Date(cmd.created_at).toLocaleDateString('fr-FR')
```

Après :

```js
formatDate(cmd.created_at)
```

### Phase 4 : traduire les statuts et enums

Objectif : ne jamais afficher directement un code backend ou un label français.

Créer des clés pour :

- statuts commande ;
- statuts livraison ;
- statuts ticket ;
- priorités ticket ;
- catégories ticket ;
- types d'incident ;
- rôles utilisateur ;
- types véhicule ;
- statuts contrat ;
- raisons blacklist.

Exemple :

```json
{
  "status": {
    "EN_ATTENTE": "En attente",
    "VALIDEE": "Validée",
    "EN_PREPARATION": "En préparation",
    "EN_ROUTE": "En route",
    "LIVREE": "Livrée",
    "ANNULEE": "Annulée"
  }
}
```

### Phase 5 : valider l'arabe RTL

Objectif : l'arabe doit être utilisable, pas seulement traduit.

Checklist :

- [ ] La sidebar reste lisible.
- [ ] Les tableaux ne débordent pas.
- [ ] Les champs de formulaire sont alignés correctement.
- [ ] Les boutons avec icônes restent cohérents.
- [ ] Les cartes Leaflet ne sont pas cassées.
- [ ] Les modales restent centrées.
- [ ] Les menus dropdown s'ouvrent du bon côté.
- [ ] Le texte arabe utilise une police lisible.

CSS recommandé :

```css
html[dir="rtl"] body {
  direction: rtl;
}

html[dir="rtl"] .ltr-only {
  direction: ltr;
}
```

Pour les cartes, coordonnées, références et codes, garder souvent `direction: ltr`.

### Phase 6 : ajouter des tests simples

Objectif : éviter de recasser les langues.

Tests recommandés :

- Vérifier que chaque langue contient les mêmes clés que le français.
- Vérifier qu'aucune clé utilisée dans le code ne manque dans les dictionnaires.
- Vérifier que le changement de langue met à jour `document.documentElement.lang`.
- Vérifier que l'arabe met `dir="rtl"`.
- Vérifier que `formatPrice` change selon la devise.
- Vérifier que `formatDate` ne force pas `fr-FR`.

## 6. Fichiers à corriger en priorité

### Priorité 1

- `frontend/src/contexts/I18nContext.jsx`
- `frontend/src/components/LanguageSwitcher.jsx`
- `frontend/src/components/layout/AppHeader.jsx`
- `frontend/src/pages/admin/SettingsPage.jsx`
- `frontend/src/pages/client/ClientDashboard.jsx`
- `frontend/src/pages/chauffeur/ChauffeurDashboard.jsx`

### Priorité 2

- `frontend/src/pages/Commandes.jsx`
- `frontend/src/pages/MapPage.jsx`
- `frontend/src/pages/Tickets.jsx`
- `frontend/src/pages/Contrats.jsx`
- `frontend/src/pages/Incidents.jsx`
- `frontend/src/pages/Clients.jsx`
- `frontend/src/pages/Transporteurs.jsx`

### Priorité 3

- `frontend/src/pages/store/StoreDash.jsx`
- `frontend/src/pages/store/Products.jsx`
- `frontend/src/pages/store/Analytics.jsx`
- `frontend/src/components/OrderTimeline.jsx`
- `frontend/src/components/KanbanCommandes.jsx`
- `frontend/src/components/GlobalSearch.jsx`
- `frontend/src/components/GroupOrderModal.jsx`
- `frontend/src/utils/exportCsv.js`

## 7. Checklist de finalisation i18n

- [ ] Tous les fichiers sont sauvegardés en UTF-8.
- [ ] Aucun texte cassé de type `Ã`, `Â`, `ð`, `Ø`, `Ù` dans l'interface.
- [ ] Un seul composant de langue est utilisé partout.
- [ ] Les dictionnaires sont séparés en fichiers JSON.
- [ ] Toutes les langues ont les mêmes clés.
- [ ] Les textes visibles passent par `t()`.
- [ ] Les dates utilisent `formatDate`.
- [ ] Les prix utilisent `formatPrice`.
- [ ] Les nombres utilisent un helper `formatNumber`.
- [ ] Les statuts backend sont traduits par mapping.
- [ ] L'arabe active bien `dir="rtl"`.
- [ ] Le layout RTL a été testé sur admin, client et transporteur.
- [ ] Le fallback français est conservé mais les clés manquantes sont loggées en développement.
- [ ] Les exports CSV utilisent les labels traduits.
- [ ] Les notifications sont traduisibles ou envoyées sous forme de code + paramètres.

## 8. Recommandation finale

Le système de langue ne doit pas être corrigé page par page au hasard. La meilleure approche est :

1. Corriger l'encodage.
2. Séparer les dictionnaires.
3. Unifier le sélecteur de langue.
4. Remplacer progressivement les textes codés en dur.
5. Remplacer les formats forcés `fr-FR`.
6. Tester spécifiquement l'arabe en RTL.

Avec cette méthode, le projet pourra réellement supporter les 4 langues prévues : français, anglais, arabe et espagnol.
