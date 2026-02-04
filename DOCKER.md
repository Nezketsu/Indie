# Docker Setup - Indie Marketplace

Ce guide explique comment lancer l'ensemble du projet avec Docker Compose.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DOCKER COMPOSE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ postgres │  │  redis   │  │  model   │  │classifier│  │ scraper  │      │
│  │  :5432   │  │  :6379   │  │ service  │  │  :8080   │  │ (daemon) │      │
│  └──────────┘  └──────────┘  │  :8000   │  └──────────┘  └──────────┘      │
│       │             │        └──────────┘        │                          │
│       └─────────────┴────────────┬───────────────┘                          │
│                                  │                                          │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │                           indie-network                           │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                  │                                          │
│       ┌──────────────────────────┴──────────────────────────┐              │
│       │                                                      │              │
│  ┌──────────┐                                          ┌──────────┐        │
│  │   web    │                                          │   cron   │        │
│  │  :3000   │                                          │ (daily)  │        │
│  └──────────┘                                          └──────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| `postgres` | 5432 | Base de données PostgreSQL |
| `redis` | 6379 | Queue Redis pour le classifier |
| `model-service` | 8000 | Service Python Fashion-CLIP (classification IA) |
| `classifier` | 8080 | API Go de classification |
| `scraper` | - | Daemon Go qui scrape les produits (toutes les 6h) |
| `web` | 3000 | Application Next.js |
| `cron` | - | Cron job quotidien (scraping + classification) |
| `meilisearch` | 7700 | Recherche full-text (optionnel) |

## Démarrage rapide

### 1. Configuration

```bash
# Copier le fichier d'environnement
cp .env.example .env

# Modifier les valeurs selon vos besoins
# Notamment CRON_SECRET pour la sécurité
nano .env
```

### 2. Lancer tous les services

```bash
# Démarrer tous les services
docker compose up -d

# Voir les logs
docker compose logs -f

# Voir les logs d'un service spécifique
docker compose logs -f web
docker compose logs -f cron
```

### 3. Avec Meilisearch (optionnel)

```bash
# Démarrer avec le profil search
docker compose --profile search up -d
```

## Cron Job Quotidien

Le service `cron` exécute automatiquement un job quotidien qui :

1. **Scrape les produits** - Récupère les nouveaux produits de toutes les marques actives
2. **Filtre les doublons** - Seuls les nouveaux produits sont ajoutés (upsert)
3. **Lance la classification** - Queue les produits non classifiés pour le classifier

### Configuration du cron

```bash
# Dans .env
CRON_SCHEDULE=0 3 * * *     # Par défaut: 3h du matin
CRON_RUN_ON_STARTUP=false   # Lancer au démarrage du container
TZ=Europe/Paris             # Fuseau horaire
```

### Exécuter manuellement

```bash
# Exécuter le job maintenant
docker compose exec cron /app/sync-and-classify.sh

# Ou via l'API web
curl -X GET http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Puis sync le classifier
curl -X POST http://localhost:8080/api/v1/sync
```

### Voir les logs du cron

```bash
docker compose logs -f cron
```

## Commandes utiles

### Gestion des services

```bash
# Arrêter tous les services
docker compose down

# Arrêter et supprimer les volumes (reset complet)
docker compose down -v

# Reconstruire les images
docker compose build

# Reconstruire et relancer
docker compose up -d --build

# Redémarrer un service
docker compose restart web
```

### Base de données

```bash
# Accéder à PostgreSQL
docker compose exec postgres psql -U indie -d indie_marketplace

# Backup
docker compose exec postgres pg_dump -U indie indie_marketplace > backup.sql

# Restore
cat backup.sql | docker compose exec -T postgres psql -U indie indie_marketplace
```

### Classifier

```bash
# Voir les stats de la queue
curl http://localhost:8080/api/v1/stats

# Voir les produits en attente de review
curl http://localhost:8080/api/v1/review

# Classifier un produit manuellement
curl -X POST http://localhost:8080/api/v1/classify \
  -H "Content-Type: application/json" \
  -d '{"product_id": "xxx", "image_url": "https://...", "title": "T-shirt noir"}'
```

## Développement

### Mode développement (services externes)

Pour développer sur un service spécifique, vous pouvez lancer uniquement les dépendances :

```bash
# Lancer uniquement postgres et redis
docker compose up -d postgres redis

# Puis lancer le service localement
cd apps/web && npm run dev
```

### Variables d'environnement pour le dev local

```bash
# .env local
DATABASE_URL=postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5432/<POSTGRES_DB>
REDIS_URL=localhost:6379
```

## Troubleshooting

### Le model-service est lent à démarrer

C'est normal - il télécharge les poids du modèle Fashion-CLIP (~500MB) au premier démarrage. Le healthcheck est configuré avec un `start_period` de 120s.

### Erreur de mémoire sur model-service

Le service nécessite au minimum 2GB de RAM. Augmentez la mémoire Docker si nécessaire :
- Docker Desktop → Settings → Resources → Memory

### Le cron ne s'exécute pas

Vérifiez :
1. Les logs : `docker compose logs cron`
2. Le fuseau horaire : `TZ` dans `.env`
3. Le schedule : `CRON_SCHEDULE` dans `.env`

### Impossible de se connecter à la base

Vérifiez que PostgreSQL est healthy :
```bash
docker compose ps
docker compose logs postgres
```
