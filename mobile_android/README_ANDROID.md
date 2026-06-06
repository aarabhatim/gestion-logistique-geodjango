# DeliverMap — Application Android

Application mobile Android (Java) connectée au backend Django REST de DeliverMap.

## Fonctionnalités

### Authentification
- Écran de connexion (username + mot de passe)
- Écran d'inscription (prénom, nom, email, téléphone, mot de passe)
- Redirection automatique selon le rôle (ADMIN → admin, CLIENT → client)

### Interface Admin
- Onglet **Commandes** : liste de toutes les commandes avec statut coloré et montant
- Onglet **Clients** : liste des utilisateurs CLIENT (nom, email, téléphone, statut)
- Onglet **Chauffeurs** : liste des TRANSPORTEUR (même infos)
- Pull-to-refresh sur chaque onglet
- Menu latéral avec déconnexion

### Interface Client
- Onglet **Boutiques** : liste des boutiques (logo, nom, catégorie, ville, note, frais de livraison, statut ouvert/fermé)
- Onglet **Mes commandes** : historique et statut des commandes du client connecté
- Pull-to-refresh
- Menu latéral avec déconnexion

---

## Ouvrir dans Android Studio

1. Lancez **Android Studio**
2. `File → Open` → sélectionnez le dossier `mobile_android/`
3. Attendez que Gradle synchronise les dépendances
4. Configurez l'URL du backend (voir ci-dessous)
5. Lancez sur émulateur ou appareil physique

---

## Configuration de l'URL du backend

Fichier : `app/src/main/java/com/delivermap/mobile/api/ApiClient.java`

```java
// Émulateur Android Studio (par défaut)
public static final String BASE_URL = "http://10.0.2.2:8000/api/";

// Appareil physique sur le même réseau Wi-Fi
// public static final String BASE_URL = "http://192.168.1.XX:8000/api/";
```

> **Important** : le backend Django doit être lancé (`lancer_serveurs.bat`) avant de tester l'app.

---

## Structure du projet

```
mobile_android/
├── app/src/main/
│   ├── java/com/delivermap/mobile/
│   │   ├── api/
│   │   │   ├── ApiClient.java       ← Client Retrofit + intercepteur JWT
│   │   │   └── ApiService.java      ← Endpoints REST (login, register, commandes, boutiques...)
│   │   ├── models/
│   │   │   ├── User.java
│   │   │   ├── Commande.java
│   │   │   ├── Boutique.java
│   │   │   ├── Client.java
│   │   │   ├── Chauffeur.java
│   │   │   ├── LoginRequest.java
│   │   │   ├── RegisterRequest.java
│   │   │   └── LoginResponse.java
│   │   ├── ui/
│   │   │   ├── SplashActivity.java  ← Routage auto selon rôle
│   │   │   ├── auth/
│   │   │   │   ├── LoginActivity.java
│   │   │   │   └── RegisterActivity.java
│   │   │   ├── admin/
│   │   │   │   └── AdminDashboardActivity.java
│   │   │   └── client/
│   │   │       └── ClientDashboardActivity.java
│   │   ├── adapters/
│   │   │   ├── CommandeAdapter.java
│   │   │   ├── ClientAdapter.java
│   │   │   ├── ChauffeurAdapter.java
│   │   │   └── BoutiqueAdapter.java
│   │   └── utils/
│   │       └── TokenManager.java    ← Stockage tokens JWT en SharedPreferences
│   ├── res/
│   │   ├── layout/                  ← Tous les écrans XML
│   │   ├── menu/                    ← Menus navigation drawer
│   │   ├── drawable/                ← Icône boutique
│   │   └── values/                  ← strings.xml, themes.xml
│   └── AndroidManifest.xml
└── build.gradle                     ← Dépendances Retrofit, Glide, Material
```

---

## Dépendances clés

| Librairie | Usage |
|-----------|-------|
| Retrofit 2.9 | Appels API REST |
| OkHttp Logging | Debug des requêtes |
| Gson | Parsing JSON |
| Glide 4.16 | Chargement des logos boutiques |
| Material Components | UI moderne (tabs, cards, inputs) |
| SwipeRefreshLayout | Pull-to-refresh |
