# LogisTrack - Plateforme de Gestion Logistique

## Prérequis
- [Docker](https://www.docker.com/products/docker-desktop/) et Docker Compose installés sur votre machine.
- [Git](https://git-scm.com/) pour la gestion de versions.

## Lancement pour l'équipe (Développement)

Pour lancer le projet complet avec la base de données (PostGIS), le backend (Django) et le frontend (React) en mode "Hot-Reload" :

1. Ouvrez un terminal à la racine du projet (où se trouve le fichier `docker-compose.yml`).
2. Exécutez la commande suivante :
   ```bash
   docker-compose up --build
   ```
   *(Le flag `--build` force la construction des images la première fois ou après l'ajout de dépendances).*

3. **Accéder à l'application :**
   - **Frontend (Application)** : [http://localhost:5173](http://localhost:5173)
   - **Backend (API)** : [http://localhost:8000/api/](http://localhost:8000/api/)
   - **Admin Django** : [http://localhost:8000/admin/](http://localhost:8000/admin/)

## 🤝 Comment travailler en équipe en même temps ?

Docker garantit que tout le monde a la **même configuration technique** (même base de données, mêmes librairies spatiales). Pour partager le **code**, vous devez utiliser **Git (via GitHub, GitLab ou Bitbucket)**.

Voici le workflow type pour votre équipe :

### 1. Le matin (ou avant de coder)
Chaque membre récupère le code le plus récent depuis Git et lance son Docker local :
```bash
git pull origin main
docker-compose up -d
```

### 2. En cas de changement de dépendances
Si un collègue a ajouté un paquet (`pip install...` dans `requirements.txt` ou `npm install...` dans `package.json`), il faut reconstruire l'image Docker :
```bash
docker-compose up --build -d
```

### 3. En cas de changement de Base de Données
Si un collègue a modifié un modèle Django (ex: ajouté un champ à `Commande`), vous devez appliquer sa migration dans votre Docker :
```bash
docker-compose exec backend python manage.py migrate
```

### 4. Partager son travail
Quand vous avez fini une fonctionnalité, vous la partagez avec l'équipe :
```bash
git add .
git commit -m "Ajout de la nouvelle fonctionnalité de statistiques"
git push origin main
```

## Commandes Utiles (Docker)

**Générer les données de test (Seed) :**
```bash
docker-compose exec backend python manage.py shell -c "import seed_data; seed_data.seed_db()"
```

**Créer un super utilisateur :**
```bash
docker-compose exec backend python manage.py createsuperuser
```

**Appliquer de nouvelles migrations (si vous modifiez un modèle) :**
```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

**Arrêter l'environnement :**
```bash
docker-compose down
```
*(Ajoutez `-v` si vous souhaitez également supprimer les volumes de données et réinitialiser la base de données).*

