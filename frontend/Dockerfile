FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json ./

# Installer les dépendances
RUN npm install

# Copier le reste de l'application
COPY . .

# Exposer le port de Vite
EXPOSE 5173

# Lancer Vite avec le flag --host pour être accessible depuis l'extérieur du conteneur
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
