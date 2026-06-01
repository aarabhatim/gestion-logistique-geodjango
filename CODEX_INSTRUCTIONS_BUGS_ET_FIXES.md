# DeliverMap — Instructions pour Codex : Bugs & Corrections

> **Projet :** DeliverMap — Plateforme logistique full-stack (Maroc)
> **Stack :** Django 5.1 + DRF + PostGIS · React 18 + Vite · Leaflet · Recharts · Zustand · Django Channels · Redis · Celery
> **Frontend :** `frontend/src/`
> **Backend :** `backend/`
>
> Ce document liste tous les problèmes identifiés dans le projet et les instructions précises pour les corriger.
> Lis chaque section, applique les corrections dans l'ordre indiqué, puis passe à la suivante.

---

## PRIORITÉ 1 — Bugs React critiques (crashes)

### BUG-01 · `ReferenceError: t is not defined` dans `SaveBtn`

**Fichier :** `frontend/src/pages/chauffeur/TransporteurParametresPage.jsx`

**Problème :**
Le composant `SaveBtn` (défini hors du composant principal) utilise `t('tp_save')` à la ligne 81, mais `t` vient de `useI18n()` qui n'est disponible qu'à l'intérieur de `TransporteurParametresPage`. Résultat : crash complet de la page.

**Correction :**
1. Dans `SaveBtn`, remplace `{label || t('tp_save')}` par `{label || 'Enregistrer'}`.
2. À chaque endroit où `<SaveBtn>` est appelé sans `label`, passe explicitement `label={t('tp_save')}` depuis le composant parent où `t` est disponible.

```jsx
// AVANT (ligne ~81) — MAUVAIS
{label || t('tp_save')}

// APRÈS — CORRECT
{label || 'Enregistrer'}

// AVANT (appel sans label, ligne ~279) — MAUVAIS
<SaveBtn onClick={handleSaveProfil} loading={savingProfil} />

// APRÈS — CORRECT
<SaveBtn onClick={handleSaveProfil} loading={savingProfil} label={t('tp_save')} />
```

---

### BUG-02 · `ReferenceError: sosType is not defined` dans `ChauffeurDashboard`

**Fichier :** `frontend/src/pages/chauffeur/ChauffeurDashboard.jsx`

**Problème :**
Le modal SOS utilise `sosType`, `setSosType`, `sosSent` et `setSosSent` dans le JSX (lignes ~1314–1345), mais ces variables n'ont jamais été déclarées avec `useState`.

**Correction :**
Ajoute ces deux lignes juste après la déclaration de `sosModalOpen` (vers la ligne 390) :

```jsx
const [sosType, setSosType]   = useState('ACCIDENT');
const [sosSent, setSosSent]   = useState(false);
```

---

### BUG-03 · Warning `key` prop manquante / indéfinie

**Fichier :** `frontend/src/pages/chauffeur/TransporteurParametresPage.jsx`

**Problème :**
Dans la section Disponibilité, le `.map()` des cartes info utilise `key={item.title}` mais les objets du tableau ont la propriété `titleKey`, pas `title`. La clé est donc toujours `undefined`, ce qui déclenche des warnings React et peut causer des re-renders incorrects.

**Correction :**
```jsx
// AVANT — MAUVAIS
].map(item => (
  <div key={item.title} ...>

// APRÈS — CORRECT
].map(item => (
  <div key={item.titleKey} ...>
```

---

## PRIORITÉ 2 — États UI manquants (loading / empty / error)

### BUG-04 · Absence d'états vides ("empty states")

**Fichiers concernés :** Toutes les pages avec des listes ou tableaux, notamment :
- `frontend/src/pages/chauffeur/ChauffeurDashboard.jsx`
- `frontend/src/pages/client/` (commandes, tickets)
- `frontend/src/pages/store/` (produits, commandes)
- `frontend/src/pages/Commandes.jsx`, `Incidents.jsx`, `Tickets.jsx`

**Problème :**
Quand une liste est vide (aucune commande, aucun incident, aucun ticket, aucun produit), l'interface affiche soit rien, soit une erreur `.map is not a function`.

**Correction :**
Pour chaque `.map()` sur une liste venant de l'API, ajoute un état vide avant le rendu :

```jsx
{liste.length === 0 ? (
  <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
    <PackageIcon size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
    <div style={{ fontWeight: 600, fontSize: 15 }}>Aucun élément à afficher</div>
    <div style={{ fontSize: 13, marginTop: 6 }}>Les données apparaîtront ici une fois disponibles.</div>
  </div>
) : (
  liste.map(item => <MonComposant key={item.id} data={item} />)
)}
```

---

### BUG-05 · Absence de gestion d'erreur standardisée sur les appels API

**Fichiers concernés :** Tous les composants qui font des appels API avec `useEffect`.

**Problème :**
En cas d'erreur réseau ou 500 du backend, aucun message n'est affiché à l'utilisateur — la page reste bloquée sur le loader ou affiche une page blanche.

**Correction :**
Ajoute un état `error` dans chaque composant qui fetch des données :

```jsx
const [error, setError] = useState(null);

useEffect(() => {
  setLoading(true);
  setError(null);
  monApi.getData()
    .then(r => setData(r.data))
    .catch(err => setError(err.response?.data?.detail || 'Une erreur est survenue.'))
    .finally(() => setLoading(false));
}, []);

// Dans le rendu :
{error && (
  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 18px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 10 }}>
    <AlertCircle size={16} />
    {error}
    <button onClick={() => fetchData()} style={{ marginLeft: 'auto', fontSize: 12, color: '#fca5a5', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Réessayer</button>
  </div>
)}
```

---

### BUG-06 · Absence de protection contre les doubles clics sur les actions critiques

**Fichiers concernés :** Tous les boutons qui déclenchent des actions API (sauvegarder, accepter, refuser, supprimer, envoyer SOS).

**Problème :**
Un utilisateur qui clique rapidement deux fois peut déclencher deux requêtes simultanées, causant des doublons ou des états incohérents.

**Correction :**
Ajoute toujours `disabled={loading}` sur le bouton pendant que la requête est en cours :

```jsx
const [saving, setSaving] = useState(false);

const handleAction = async () => {
  if (saving) return; // Protection double clic
  setSaving(true);
  try {
    await api.doSomething();
    showToast('Succès !');
  } catch (e) {
    showToast('Erreur', 'error');
  } finally {
    setSaving(false);
  }
};

<button onClick={handleAction} disabled={saving}>
  {saving ? <Loader size={14} /> : 'Confirmer'}
</button>
```

---

## PRIORITÉ 3 — Données mockées à remplacer par l'API

### BUG-07 · Données statiques dans le dashboard chauffeur

**Fichier :** `frontend/src/pages/chauffeur/ChauffeurDashboard.jsx`

**Problème :**
Plusieurs données sont des valeurs en dur ou calculées localement sans appel API réel :
- `revenueData` (graphique des revenus) — tableau statique
- `donutData` (répartition livraisons) — valeurs hardcodées
- `recentActivity` — liste statique d'exemples

**Correction :**
Remplace les données mockées par des appels aux endpoints existants :

```jsx
// Revenus mensuels — utilise l'API analytics ou transposteurs
useEffect(() => {
  transporteursApi.monProfil().then(r => {
    setProfile(r.data);
    // Construire revenueData depuis r.data.historique_revenus si disponible
  });
  // Pour les stats du dashboard
  analyticsApi.statsTransporteur().then(r => setStats(r.data));
}, []);
```

Si l'endpoint n'existe pas encore côté backend, crée-le dans `backend/transporteurs/views.py` avec une route `GET /api/transporteurs/mes-stats/` qui retourne :
```json
{
  "revenus_mois": 4200,
  "livraisons_total": 47,
  "livraisons_reussies": 44,
  "note_moyenne": 4.7,
  "revenus_par_mois": [
    {"month": "Jan", "revenus": 3200},
    {"month": "Fév", "revenus": 3800}
  ]
}
```

---

### BUG-08 · `sendSOS` ne semble pas connecté à l'API backend

**Fichier :** `frontend/src/pages/chauffeur/ChauffeurDashboard.jsx`

**Problème :**
Le modal SOS collecte le type d'urgence mais la fonction `sendSOS` doit être vérifiée pour s'assurer qu'elle envoie bien une requête POST à `/api/transporteurs/sos/` avec `{ type: sosType, position: myPosition }`.

**Correction :**
Vérifie et complète la fonction `sendSOS` :

```jsx
const sendSOS = async () => {
  if (sosLoading) return;
  setSosLoading(true);
  try {
    await transporteursApi.envoyerSOS({
      type_urgence: sosType,
      latitude: myPosition?.[0],
      longitude: myPosition?.[1],
      message: `SOS ${sosType} — chauffeur ${user?.first_name} ${user?.last_name}`,
    });
    setSosSent(true);
    showToast('SOS envoyé ! Les admins ont été alertés.', 'success');
    setTimeout(() => {
      setSosModalOpen(false);
      setSosSent(false);
      setSosType('ACCIDENT');
    }, 3000);
  } catch (e) {
    showToast('Impossible d\'envoyer le SOS. Réessayez.', 'error');
  } finally {
    setSosLoading(false);
  }
};
```

---

## PRIORITÉ 4 — Notifications WebSocket (remplacement du polling)

### BUG-09 · Notifications en polling (30s) au lieu de WebSocket live

**Fichier :** `frontend/src/components/Header.jsx` et `frontend/src/contexts/NotificationContext.jsx`

**Problème :**
Le composant Header ou le contexte de notifications utilise un `setInterval` pour interroger l'API toutes les 30 secondes. Cela cause un délai de notification et surcharge inutilement le serveur.

**Correction :**
Dans `NotificationContext.jsx`, utilise la connexion WebSocket déjà en place (Django Channels) :

```jsx
useEffect(() => {
  if (!user) return;

  const token = localStorage.getItem('access_token');
  const ws = new WebSocket(`ws://localhost:8001/ws/notifications/?token=${token}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'notification') {
      setNotifications(prev => [data.notification, ...prev]);
      // Afficher un toast si besoin
    }
  };

  ws.onerror = () => {
    // Fallback : polling toutes les 30s si WebSocket indisponible
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  };

  return () => ws.close();
}, [user]);
```

---

### BUG-10 · Panneau de notifications dépliable manquant dans le Header

**Fichier :** `frontend/src/components/Header.jsx`

**Problème :**
La cloche affiche le nombre de notifications non lues, mais un clic dessus ne déploie pas de panneau listant les notifications. L'utilisateur ne peut pas voir le contenu sans naviguer vers une autre page.

**Correction :**
Ajoute un panneau dépliable positionné en `absolute` sous la cloche :

```jsx
const [notifOpen, setNotifOpen] = useState(false);

// Dans le JSX, autour de la cloche :
<div style={{ position: 'relative' }}>
  <button onClick={() => setNotifOpen(o => !o)}>
    <Bell size={20} />
    {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
  </button>

  {notifOpen && (
    <div style={{
      position: 'absolute', top: '110%', right: 0, width: 360,
      background: '#161616', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
      zIndex: 9999, maxHeight: 480, overflowY: 'auto',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Notifications</span>
        <button onClick={marquerToutesLues} style={{ fontSize: 12, color: '#FF8A00', background: 'none', border: 'none', cursor: 'pointer' }}>
          Tout marquer lu
        </button>
      </div>
      {notifications.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#888', fontSize: 13 }}>
          Aucune notification
        </div>
      ) : notifications.map(notif => (
        <div key={notif.id} onClick={() => { marquerLue(notif.id); setNotifOpen(false); }}
          style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', background: notif.lu ? 'transparent' : 'rgba(255,138,0,0.04)' }}>
          <div style={{ fontSize: 13, fontWeight: notif.lu ? 400 : 700, color: '#fff' }}>{notif.titre}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>{notif.message}</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{new Date(notif.created_at).toLocaleString('fr-FR')}</div>
        </div>
      ))}
    </div>
  )}
</div>
```

---

## PRIORITÉ 5 — Design & Cohérence UI

### BUG-11 · Mélange de styles inline, CSS global et Tailwind

**Fichiers concernés :** Tous les fichiers `.jsx` du projet

**Problème :**
Certaines pages utilisent du CSS inline (ex: `style={{ padding: '12px 16px', borderRadius: 12 }}`), d'autres utilisent des classes CSS globales, d'autres du Tailwind. Cela rend la maintenance très difficile et crée des incohérences visuelles.

**Correction (à faire progressivement) :**
1. Crée un fichier `frontend/src/styles/tokens.js` avec les valeurs de design communes :

```js
// frontend/src/styles/tokens.js
export const T = {
  bg: '#0B0B0B',
  surface: '#111111',
  card: '#161616',
  card2: '#1C1C1C',
  primary: '#FF8A00',
  primary2: '#FF6B00',
  text: '#FFFFFF',
  text2: '#888888',
  border: 'rgba(255,255,255,0.06)',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  radius: { sm: 8, md: 12, lg: 16, xl: 20 },
  grad: 'linear-gradient(135deg, #FF8A00, #FF6B00)',
};
```

2. Importe et utilise ce fichier dans chaque page au lieu de redéfinir les couleurs localement.

---

### BUG-12 · Encodage des caractères cassé (caractères accentués)

**Fichiers concernés :** Plusieurs fichiers JSX avec des textes en dur (non traduits)

**Problème :**
Certains textes affichés dans l'interface contiennent des caractères mal encodés visibles à l'écran : `PrÃ©visions`, `BanniÃ¨res`, `RÃ©duire`, `DÃ©tails`.

**Correction :**
1. Vérifie que tous les fichiers `.jsx` sont sauvegardés en **UTF-8** (sans BOM).
2. Dans VS Code : `File > Save with Encoding > UTF-8`.
3. Remplace tous les textes en dur mal encodés par leurs versions correctes.
4. Pour les textes qui ne sont pas encore dans le système i18n, entoure-les avec `t('clé')` et ajoute la clé dans les fichiers de traduction `frontend/src/i18n/`.

---

## PRIORITÉ 6 — Sécurité & Configuration

### BUG-13 · Clé secrète Django par défaut dans le code source

**Fichier :** `backend/logistique_backend/settings.py` · Ligne 36

**Problème :**
```python
SECRET_KEY = os.environ.get('SECRET_KEY', 'delivermap-secret-key-change-in-production-2025')
```
La valeur de fallback est une clé connue. Si l'environnement ne fournit pas `SECRET_KEY`, Django utilise cette clé publiquement visible dans le dépôt.

**Correction :**
```python
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'dev-only-secret-key-not-for-production'
    else:
        raise ValueError("La variable d'environnement SECRET_KEY est obligatoire en production.")
```

---

### BUG-14 · `CORS_ALLOW_ALL_ORIGINS = True` en développement

**Fichier :** `backend/logistique_backend/settings.py` · Ligne 241

**Problème :**
```python
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'True' if DEBUG else 'False') == 'True'
```
En développement, toutes les origines sont autorisées. C'est acceptable localement, mais il faut s'assurer que la variable d'environnement `CORS_ALLOW_ALL_ORIGINS=False` est bien définie en production et que `CORS_ALLOWED_ORIGINS` liste les domaines autorisés.

**Correction dans `.env` de production :**
```env
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://delivermap.ma,https://www.delivermap.ma
```

---

### BUG-15 · `DEBUG=True` par défaut

**Fichier :** `backend/logistique_backend/settings.py` · Ligne 37

**Problème :**
```python
DEBUG = os.environ.get('DEBUG', 'True') == 'True'
```
Si la variable d'environnement `DEBUG` n'est pas définie, Django démarre en mode debug, exposant les tracebacks complets dans les réponses d'erreur.

**Correction :**
```python
DEBUG = os.environ.get('DEBUG', 'False') == 'True'
```
Et dans le fichier `.env` de développement local :
```env
DEBUG=True
```

---

## PRIORITÉ 7 — Backend : endpoints manquants ou incomplets

### BUG-16 · Application `clients/` avec contenu minimal

**Dossier :** `backend/clients/`

**Problème :**
L'application `clients` est installée et exposée dans `urls.py` mais son contenu est minimal. Cela peut causer des erreurs 404 ou 500 quand le frontend essaie d'appeler `/api/clients/`.

**Correction :**
Vérifie que les fichiers suivants existent et sont correctement implémentés dans `backend/clients/` :
- `models.py` — Modèle `ProfilClient` lié à `CustomUser`
- `serializers.py` — Sérialiseur du profil client
- `views.py` — ViewSet avec au minimum : récupérer son profil, mettre à jour ses infos
- `urls.py` — Routes : `profil/`, `historique-commandes/`

Endpoints minimum à implémenter :
```python
# clients/urls.py
from django.urls import path
from .views import MonProfilClientView, HistoriqueCommandesView

urlpatterns = [
    path('profil/', MonProfilClientView.as_view(), name='client-profil'),
    path('historique/', HistoriqueCommandesView.as_view(), name='client-historique'),
]
```

---

### BUG-17 · Application `tracking/` non connectée au frontend

**Dossier :** `backend/tracking/`

**Problème :**
L'application `tracking` est dans `urls.py` et `settings.py` mais ses vues de tracking GPS temps réel ne semblent pas utilisées par le frontend qui gère la position dans `transporteurs/`.

**Correction :**
1. Vérifie le contenu de `backend/tracking/views.py`.
2. Si l'app tracking gère l'historique des positions GPS, expose un endpoint : `GET /api/tracking/positions/?commande_id=X` pour récupérer le trajet d'une livraison.
3. Relie cet endpoint dans `frontend/src/services/api.js` :
```js
trackingApi: {
  getPositions: (commandeId) => api.get(`/tracking/positions/?commande_id=${commandeId}`),
  updatePosition: (data) => api.post('/tracking/positions/', data),
}
```

---

## PRIORITÉ 8 — Performances & UX avancée

### BUG-18 · Absence de confirmation pour les actions dangereuses

**Fichiers concernés :** Pages avec suppression, bannissement, annulation, résiliation.
- `frontend/src/pages/Clients.jsx` (bannir/débannir)
- `frontend/src/pages/Commandes.jsx` (annuler commande)
- `frontend/src/pages/admin/` (blacklist, résiliation contrat)

**Problème :**
Un clic accidentel sur "Bannir", "Annuler", "Supprimer" déclenche immédiatement l'action sans demander de confirmation.

**Correction :**
Avant chaque action irréversible, affiche un dialog de confirmation :

```jsx
const confirmerAction = (message, callback) => {
  if (window.confirm(message)) {
    callback();
  }
};

// Utilisation :
<button onClick={() => confirmerAction(
  'Êtes-vous sûr de vouloir bannir cet utilisateur ?',
  () => handleBannir(userId)
)}>
  Bannir
</button>
```

Ou mieux, crée un composant `ConfirmModal` réutilisable avec un design cohérent au lieu d'utiliser `window.confirm`.

---

### BUG-19 · Responsive mobile non vérifié

**Fichiers concernés :** Tous les dashboards, tableaux et cartes.

**Problème :**
Les dashboards utilisent des grilles `gridTemplateColumns: 'repeat(4, 1fr)'` et des cartes Leaflet en hauteur fixe qui cassent sur mobile et tablette.

**Correction :**
Remplace les grilles fixes par des grilles responsive :

```jsx
// AVANT — MAUVAIS
gridTemplateColumns: 'repeat(4, 1fr)'

// APRÈS — CORRECT
gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
```

Pour les tableaux, enveloppe-les dans un conteneur avec `overflowX: 'auto'` :

```jsx
<div style={{ overflowX: 'auto', width: '100%' }}>
  <table style={{ minWidth: 600 }}>
    ...
  </table>
</div>
```

---

## Résumé des actions à effectuer par ordre de priorité

| # | Fichier | Action | Urgence |
|---|---------|--------|---------|
| 1 | `TransporteurParametresPage.jsx` | Fix `t is not defined` dans `SaveBtn` | 🔴 Critique |
| 2 | `ChauffeurDashboard.jsx` | Ajouter `useState` pour `sosType` et `sosSent` | 🔴 Critique |
| 3 | `TransporteurParametresPage.jsx` | Fix `key={item.title}` → `key={item.titleKey}` | 🟠 Élevée |
| 4 | Tous les composants avec `.map()` | Ajouter états vides (empty states) | 🟠 Élevée |
| 5 | Tous les composants API | Ajouter `error` state + message réessai | 🟠 Élevée |
| 6 | Boutons actions critiques | Ajouter `disabled` pendant le loading | 🟠 Élevée |
| 7 | `ChauffeurDashboard.jsx` | Remplacer données mockées par API | 🟡 Moyenne |
| 8 | `ChauffeurDashboard.jsx` | Vérifier `sendSOS` connecté à l'API | 🟡 Moyenne |
| 9 | `NotificationContext.jsx` | Remplacer polling par WebSocket | 🟡 Moyenne |
| 10 | `Header.jsx` | Ajouter panneau notifications dépliable | 🟡 Moyenne |
| 11 | Tous les `.jsx` | Créer `tokens.js` et unifier les styles | 🟡 Moyenne |
| 12 | Tous les `.jsx` | Corriger encodage UTF-8 des textes | 🟡 Moyenne |
| 13 | `settings.py` ligne 36 | Sécuriser `SECRET_KEY` — lever une erreur si absente | 🟠 Élevée |
| 14 | `settings.py` ligne 241 | Restreindre CORS en production | 🟡 Moyenne |
| 15 | `settings.py` ligne 37 | Changer défaut `DEBUG` à `False` | 🟠 Élevée |
| 16 | `backend/clients/` | Implémenter contenu minimal du module clients | 🟡 Moyenne |
| 17 | `backend/tracking/` | Vérifier et connecter les endpoints tracking | 🟡 Moyenne |
| 18 | Pages avec actions dangereuses | Ajouter confirmations avant suppression/bannissement | 🟡 Moyenne |
| 19 | Dashboards et tableaux | Corriger responsive mobile | 🟢 Basse |

---

## Conventions à respecter dans tout le code

1. **Toujours** utiliser `key={item.id}` dans les `.map()` (jamais l'index ou une propriété qui peut être `undefined`).
2. **Toujours** implémenter `loading`, `error` et `data` dans les composants qui font des appels API.
3. **Toujours** désactiver les boutons de soumission pendant un appel en cours (`disabled={loading}`).
4. **Toujours** importer `t` depuis `useI18n()` dans le composant qui l'utilise — ne pas le passer à des composants enfants définis en dehors du scope.
5. **Toujours** valider les tableaux avant de les mapper : `Array.isArray(liste) && liste.map(...)`.
6. **Ne jamais** mettre de valeurs sensibles (clé API, mot de passe, secret) dans le code source.
7. **Ne jamais** laisser `console.log` de debug dans le code final.

---

*Document généré le 1er juin 2026 — DeliverMap v2.0*
