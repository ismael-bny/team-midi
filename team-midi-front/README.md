# Projet Web – Gestion d’un site de planification pour entraîneur et athlètes

## Ismaël BEN AYED - IG3

Ce site permet à un **coach d’athlétisme** de gérer des groupes d’athlètes, de planifier des séances d’entraînement et des compétitions, et de consulter les retours des athlètes.  
Les athlètes ont accès à un planning personnalisé où ils peuvent donner un **feedback**, une **cote d’effort**, et renseigner un **lien vers une activité** (Garmin, Strava, etc.).

---

## Architecture

Le projet ne repose sur aucun framework côté frontend.  
Le backend est structuré autour d’une **architecture REST** : chaque type de donnée (utilisateur, séance, groupe...) a ses propres routes pour permettre l’ajout, la modification, la suppression et la consultation.

La base de données comporte 5 tables (users, groupes, seances, competitions, feedbacks).

Les routes sont organisées via un système de **routage dynamique**, et un **middleware** est utilisé pour protéger les routes privées et vérifier les autorisations.

---

## Technologies utilisées

### Backend
- **Deno** + **Oak** (v11.1.0)  
  → La version récente posait problème pour certaines fonctions qui ne marchaient pas, j’ai volontairement rétrogradé pour éviter d’y passer plus de temps.
- **JWT** pour gérer l’authentification, stocké dans un **cookie HttpOnly** signé
- **PostgreSQL** (initialement SQLite, mais migration nécessaire pour déployer sur le cloud car SQLite ne convenait pas)

### Frontend
- HTML / CSS / JavaScript natif (pas de framework)
- **FullCalendar** pour l’affichage interactif du planning
- Utilisation de **modales JavaScript** pour gérer la création de séances, l’envoi de feedback, et les détails utilisateur

---

## Fonctionnalités de sécurité

- Mots de passe **hachés avec bcrypt**
- Authentification **JWT** dans des cookies sécurisés (`HttpOnly`)
- **Middleware** de contrôle d’accès sur toutes les routes privées (vérification du JWT)
- **Séparation des rôles** : seul un coach peut accéder à certaines pages ou effectuer des actions d’administration
- Communication **en HTTPS**, certifiée par Let's Encrypt
- CORS configuré pour gérer la communication entre frontend et backend hébergés sur des domaines séparés

---

## Communication temps réel

Le site utilise une **WebSocket** côté backend pour notifier les athlètes lorsqu’une nouvelle séance est créée.  

---

## Déploiement

- Application **déployée sur le cloud Polytech**, via Dokku
- Deux apps séparées :
  - `ismael-benayed-back` (API REST sécurisée + WebSocket)
  - `ismael-benayed-front` (frontend statique nginx)
- HTTPS actif avec **certificats Let’s Encrypt**
- Connexion à la base PostgreSQL, variables d’environnement `.env` bien définies

---

## Résultat final

- Le site est en ligne, 100 % fonctionnel et respecte toute les contraintes soumises
- Connexion, inscription, feedbacks, affichage dynamique du planning
- Gestion complète des groupes, des séances et compétitions côté coach
- Sécurité respectée (authentification, HTTPS, middleware)
- WebSocket fonctionnelle
- Base PostgreSQL avec tables relationnelles cohérentes
