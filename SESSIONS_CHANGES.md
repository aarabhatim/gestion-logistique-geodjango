# DeliverMap — Résumé des modifications UI/UX
> **Date :** 24 mai 2026  
> **Projet :** DeliverMap v2.0 — Plateforme logistique full-stack (Maroc)  
> **Stack :** Django 5.1 + DRF · React 18 + Vite · Leaflet/MapTiler · Recharts · Framer Motion

---

## 1. Partie Chauffeur (Transporteur) — Thème Orange

### `ChauffeurDashboard.jsx` — Redesign complet (1 310 lignes)

**Thème appliqué :**
```js
bg: '#0B0B0B'  |  surface: '#161616'  |  sidebar: '#111111'
primary: '#FF8A00'  |  primary2: '#FF6B00'
```

**Nouveautés layout :**
- Sidebar fixe **collapsible** (280px ↔ 72px icônes) avec transition CSS
- `NavItem` avec état actif gradient orange + glow, hover subtle
- Affichage dynamique du véhicule (emoji + plaque) : `MOTO 🛵 / VOITURE 🚗 / VAN 🚐 / CAMION 🚛`
- Topbar sticky avec SOS rouge, cloche, profil chip, logout
- Onglets : Dashboard · Expéditions · Carte · Historique · Conduite · Objectifs · Chat · Profil · Support · Incidents

**Dashboard tab :**
- 4 KPI cards premium (hover lift `translateY(-4px)`, icône badge coloré, trend ±%)
- `AreaChart` Recharts — revenus 12 mois avec dégradé orange
- `PieChart` donut — répartition statuts livraisons (live data)
- Jauge SVG `strokeDasharray` — taux de réussite
- Tableau livraisons récentes + carte Leaflet MapTiler sombre
- Feed activité temps réel

**Onglets pleine largeur (fix maxWidth supprimé) :**
| Onglet | Layout appliqué |
|--------|----------------|
| Profil | Hero banner + 4 KPI + grille 2 colonnes (Revenus, Véhicule, Heures, Actions) |
| Conduite | Pleine largeur, sans maxWidth |
| Chat | Pleine largeur, sans maxWidth |
| Support | Grille 2×2 (Tickets, Nouveau ticket, Incident, SOS) |

---

### `TransporteurLayout.jsx` — Shell partagé (nouveau fichier, 356 lignes)

Shell réutilisable pour les sous-pages chauffeur (`/chauffeur/finances`, `/chauffeur/gamification`).

- Même sidebar orange que `ChauffeurDashboard`
- Topbar : bouton `← Tableau de bord`, titre de page, SOS, Bell, profil, logout
- `useLocation()` pour activer le bon item nav
- Remplace `AdminShell` (thème bleu/violet) sur ces routes

**Routes modifiées dans `App.jsx` :**
```jsx
// Avant
<AdminShell><DashboardFinancier /></AdminShell>

// Après
<TransporteurLayout pageTitle="Tableau de bord financier" pageIcon="💰">
  <DashboardFinancier />
</TransporteurLayout>
```

---

### `DashboardFinancier.jsx` — Rethémé orange

- `StatCard` : fond `#161616`, badge icône radial-gradient, hover lift
- Graphique revenus : `stroke='#FF8A00'`, tooltip sombre
- Barres de profit : dégradé orange par intensité
- Tableau historique : hover `#FF8A0008`, références en pill orange
- Suppression de `glass-card` et `var(--text-secondary)`

---

### `GamificationPage.jsx` — Rethémé orange

- `JaugeCirculaire` : `motion.circle` avec glow `drop-shadow`
- `JaugeLineaire` : barre dégradée + `boxShadow` coloré
- `BadgeCard` : bordure `#FF8A0030` badges gagnés, tag "NOUVEAU" gradient
- Onglets actifs : gradient orange + `glowOrange`
- Classement : top 3 fond `#FF8A0008`, avatars gradient
- Suppression de toutes les classes `glass-card`

---

## 2. Partie Admin — Thème Vert Premium

### `AppSidebar.jsx` — Redesign complet + collapsible (371 lignes)

**Thème :**
```js
bg: '#060E09'  |  surface: '#0F1A12'
primary: '#22C55E'  |  primary2: '#16A34A'
```

**Nouveautés :**
- **Collapsible** : 260px (labels) ↔ 72px (icônes seules) avec transition `0.3s ease`
- `NavItem` : tooltip animé au hover quand sidebar réduite (Framer Motion)
- Indicateur actif : pill verte animée (`layoutId="sidebar-pill"`) + trait gauche glow
- `SectionHeader` : label texte quand expanded, séparateur `hr` quand collapsed
- Profil bas : avatar dégradé vert + nom/rôle + bouton logout rouge
- Bouton "Réduire" en bas

**Sections nav Admin :**
- Tableau de bord (Dashboard, Live, Carte, Calendrier)
- Opérations (Commandes, Boutiques, Incidents, Zones, Promotions)
- Gestion (Clients, Transporteurs, Scoring, Tickets, Contrats)
- Intelligence (Rapports, Heatmap, Prévisions)
- Outils Admin (Impersonation, Bannières, Blacklist, Paramètres)

---

### `AppHeader.jsx` — Redesign complet (415 lignes)

- Barre de recherche pill animée (fond + bordure verts au focus)
- Bouton "Nouvelle expédition" avec gradient vert + glow hover
- Sélecteur de langue dropdown premium avec drapeaux emoji
- Panel notifications :
  - Onglets "Non lues / Toutes"
  - Icône emoji par type (⚠️ WARNING, 🚨 DANGER, ✅ SUCCESS, 📦 LIVRAISON)
  - Suppression individuelle au hover
  - Bouton "Charger plus" si `hasMore`
- Avatar vert dégradé

---

### `Dashboard.jsx` — Redesign complet (575 lignes)

**KPI Cards (4 colonnes) :**
- Package · Truck · Users · TrendingUp
- Badge icône coloré, indicateur trend `+/-X%` pill colorée
- Hover lift avec glow coloré au bord

**Charts Row (2 colonnes) :**
- `LineChart` : commandes + CA avec légende
- `AreaChart` mini revenus + `BarChart` mini profit empilés

**Fleet Section (3 colonnes) :**
- Donut flotte (En route / Inutilisé / Maintenance) + taux global
- Barre progression véhicules en route + grille stats 2×2
- Feed activités récentes avec StatusBadge colorés

**Top Boutiques & Transporteurs :**
- Podium numéroté avec gradient sur la 1ère place
- Hover subtle vert/amber selon section

---

### `LiveDashboard.jsx` — Fix + rethémé

- Suppression de `glass-card`, `dashboard-container`, `page-title`, `var(--text-secondary)`
- `AnimatedCounter` redesigné avec badge icône et `borderLeft` coloré
- Carte Leaflet avec tuiles MapTiler `dataviz-dark`
- Panels incidents/livraisons en cours avec counts colorés

---

### `AdminShell.jsx` — Mise à jour layout

```jsx
// Avant (Tailwind classes)
<div className="flex h-screen overflow-hidden bg-background">

// Après (inline styles pour cohérence)
<div style={{ display: 'flex', height: '100vh', background: '#080E09' }}>
```
Le `flex-1` sur le contenu s'adapte automatiquement à la sidebar collapsible.

---

### `index.css` — Bloc admin theme `[data-role="admin"]`

Surcharge globale des CSS variables pour tous les composants admin :

```css
[data-role="admin"] {
  --bg-card:       rgba(15, 29, 18, 0.92);
  --accent-primary: #22C55E;
  --gradient-primary: linear-gradient(135deg, #16A34A, #22C55E);
  --glass-border:  1px solid rgba(34,197,94,0.1);
  ...
}
```

**Classes surchargées automatiquement :**
- `.glass-card` → fond vert sombre, bordure verte
- `.btn-primary` → gradient vert + glow
- `.btn-secondary` → fond vert translucide
- `.data-table tbody tr:hover` → fond vert très léger
- `.glass-input:focus` → bordure verte + glow
- `::-webkit-scrollbar-thumb` → dégradé vert

> **Effet :** Les 12+ pages admin utilisant l'ancien CSS (`Commandes`, `Clients`, `Transporteurs`, `Incidents`, `Scoring`, `Tickets`, `Contrats`, `Zones`, `Promotions`, `CalendrierPage`, `SettingsPage`, `HeatmapPage`) reçoivent le thème vert automatiquement sans modification de leurs fichiers.

---

## 3. Cartes — Migration MapTiler

**Clé API :** `5d2tALzIlgsl0ucJYKZL`

| Style | URL | Utilisé dans |
|-------|-----|-------------|
| `dataviz-dark` | `maps/dataviz-dark/{z}/{x}/{y}.png?key=...` | Admin, Chauffeur, Incidents, MapPage, ZonesPage, DrivingMode |
| `streets-v4` | `maps/streets-v4/{z}/{x}/{y}.png?key=...` | Client, CommandeFormModal |
| `satellite` | `maps/satellite/{z}/{x}/{y}.jpg?key=...` | HeatmapPage (couche satellite) |

**10 fichiers migrés :**
```
components/CommandeFormModal.jsx       → streets-v4
components/DrivingMode.jsx             → dataviz-dark
components/MapComponent.jsx            → dataviz-dark
pages/admin/HeatmapPage.jsx            → streets-v4 + satellite + dataviz-dark (LayersControl)
pages/admin/LiveDashboard.jsx          → dataviz-dark
pages/admin/ZonesPage.jsx              → dataviz-dark
pages/chauffeur/ChauffeurDashboard.jsx → dataviz-dark (×3)
pages/client/ClientDashboard.jsx       → streets-v4
pages/Incidents.jsx                    → dataviz-dark
pages/MapPage.jsx                      → dataviz-dark
```

---

## 4. Bugs corrigés

| Problème | Cause | Fix |
|----------|-------|-----|
| `Unexpected token` Vite (Commandes.jsx:579) | Marqueurs Git `<<<<<<< HEAD` non résolus | Gardé version HEAD (`changePage()`) |
| `ChauffeurDashboard.jsx:1188` tronqué | `sed` a corrompu le fichier lors du remplacement MapTiler | Fichier reconstitué manuellement + `export default` ré-ajouté |
| Onglets affichés en demi-largeur | `maxWidth: 600/640/700` sur les wrappers d'onglets | Suppressions + layout grille 2 colonnes |
| `glass-card` dans LiveDashboard | Référence à classes CSS non compatibles thème vert | Remplacement par styles inline |

---

## 5. Fichiers modifiés (récapitulatif)

```
frontend/src/
├── App.jsx                                    ← routes TransporteurLayout
├── index.css                                  ← bloc [data-role="admin"] + MapTiler
├── layouts/
│   └── TransporteurLayout.jsx                 ← NOUVEAU
├── components/layout/
│   ├── AdminShell.jsx                         ← layout inline styles
│   ├── AppSidebar.jsx                         ← redesign + collapsible
│   └── AppHeader.jsx                          ← redesign premium
├── components/
│   ├── CommandeFormModal.jsx                  ← MapTiler streets-v4
│   ├── DrivingMode.jsx                        ← MapTiler dataviz-dark
│   └── MapComponent.jsx                       ← MapTiler dataviz-dark
├── pages/
│   ├── Dashboard.jsx                          ← redesign premium
│   ├── Commandes.jsx                          ← fix merge conflict
│   ├── Incidents.jsx                          ← MapTiler dataviz-dark
│   ├── MapPage.jsx                            ← MapTiler dataviz-dark
│   ├── admin/
│   │   ├── LiveDashboard.jsx                  ← redesign + MapTiler
│   │   ├── HeatmapPage.jsx                    ← MapTiler ×3 (LayersControl)
│   │   └── ZonesPage.jsx                      ← MapTiler dataviz-dark
│   ├── chauffeur/
│   │   ├── ChauffeurDashboard.jsx             ← redesign complet + MapTiler ×3
│   │   ├── DashboardFinancier.jsx             ← thème orange
│   │   └── GamificationPage.jsx               ← thème orange
│   └── client/
│       └── ClientDashboard.jsx                ← MapTiler streets-v4
```

---

## 6. Commandes pour relancer

```bash
# Frontend
cd frontend
npm install
npm run dev          # http://localhost:5173

# Backend
cd backend
python manage.py runserver          # API HTTP :8000
daphne logistique_backend.asgi:application   # WebSocket :8001
```

---

*Document généré le 24 mai 2026 — DeliverMap v2.0*
