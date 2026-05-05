# Application de Gestion Logistique (GeoDjango + React)

## Prérequis pour faire tourner le projet
1. **Python** (3.8+)
2. **Node.js** (18+)
3. **PostgreSQL** avec l'extension **PostGIS** installée.

## Étape 1 : Configuration de la Base de données
1. Ouvrez pgAdmin ou votre terminal psql.
2. Créez une base de données nommée `logistique_db`.
3. Activez PostGIS sur cette base :
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
4. Dans le fichier `backend/logistique_backend/settings.py`, modifiez le mot de passe de la base de données si nécessaire.

## Étape 2 : Lancement du Backend (Django)
Ouvrez un terminal dans le dossier `backend` :
```bash
# 1. Installez les dépendances
pip install django djangorestframework django-cors-headers djangorestframework-gis Pillow psycopg2-binary

# 2. Appliquez les migrations
python manage.py migrate

# 3. (Optionnel) Générez des fausses données
python seed_data.py

# 4. Lancez le serveur
python manage.py runserver
```

## Étape 3 : Lancement du Frontend (React)
Ouvrez un DEUXIÈME terminal dans le dossier `frontend` :
```bash
# 1. Installez les paquets (la première fois)
npm install

# 2. Lancez l'application
npm run dev
```

L'application sera accessible sur [http://localhost:5173/](http://localhost:5173/).
