# MessoChat

Application de messagerie de groupe en temps reel avec style Discord.

## Features

- **Authentification** : Register / Login (username + mot de passe)
- **Groupes prives** : Creer des groupes, envoyer des demandes d'adhesion, accepter/refuser
- **Chat en temps reel** : Messages texte, vocaux, fichiers (photos, videos, audio)
- **Preview multimedia** : Photos affichees directement, mini-player video
- **PWA** : Installable comme application native
- **Admin du site** : Panel d'administration complet (mot de passe par defaut: `123456789`)
- **Theme Discord** : Interface sombre style Discord

## Stack technique

- **Backend** : Express.js + Socket.io + SQLite (better-sqlite3)
- **Frontend** : React + Vite
- **Auth** : JWT (JSON Web Tokens)
- **Upload** : Multer (photos, videos, audio, fichiers)
- **Temps reel** : Socket.io

## Installation

### Backend
```bash
cd server
npm install
npm start
```
Le serveur demarre sur `http://localhost:3001`

### Frontend
```bash
cd client
npm install
npm run dev
```
Le frontend demarre sur `http://localhost:5173`

## Structure

```
server/
  index.js          - Serveur Express + Socket.io
  db.js             - Base de donnees SQLite
  middleware/auth.js - Middleware JWT
  routes/
    auth.js         - Inscription / Connexion
    groups.js       - Gestion des groupes
    messages.js     - Messages
    upload.js       - Upload de fichiers
    admin.js        - Administration du site
  uploads/          - Fichiers uploades

client/
  src/
    context/AuthContext.jsx - Gestion d'etat auth
    pages/
      Login.jsx     - Page de connexion
      Register.jsx  - Page d'inscription
      Home.jsx      - Page d'accueil avec groupes
      Chat.jsx      - Chat de groupe
      Admin.jsx     - Panel admin
    App.jsx         - Routage
    App.css         - Theme Discord
```
