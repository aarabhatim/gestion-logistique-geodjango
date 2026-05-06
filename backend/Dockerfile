FROM python:3.11-slim

# Eviter l'écriture de fichiers .pyc et forcer l'affichage stdout
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Installer les dépendances systèmes pour GeoDjango (GDAL, GEOS, PROJ)
RUN apt-get update && apt-get install -y \
    binutils \
    libproj-dev \
    gdal-bin \
    python3-gdal \
    libgdal-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installer les dépendances Python
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Le code sera monté en volume pour le dev, mais on copie quand même
COPY . /app/

# Commande par défaut (peut être surchargée par docker-compose)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
