# Docker Setup Guide

## Prerequisites
- Docker Desktop installed and running
- Git Bash or PowerShell

## Quick Start

### 1. Start Everything
```bash
docker-compose up -d
```

### 2. View Logs
```bash
# All services
docker-compose logs -f

# Just backend
docker-compose logs -f backend

# Just database
docker-compose logs -f postgres
```

### 3. Initialize Database
```bash
docker-compose exec backend python init_database.py
```

### 4. Stop Everything
```bash
docker-compose down
```

### 5. Stop and Remove All Data
```bash
docker-compose down -v
```

## Development Workflow

### Start Services
```bash
docker-compose up -d
```

### Check Status
```bash
docker-compose ps
```

### Access Backend Shell
```bash
docker-compose exec backend bash
```

### View Real-time Logs
```bash
docker-compose logs -f backend
```

### Restart Backend (after code changes)
```bash
docker-compose restart backend
```

### Rebuild Backend (after dependency changes)
```bash
docker-compose up -d --build backend
```

## Accessing Services

- Backend API: http://localhost:8001
- PostgreSQL: localhost:5432
- Health Check: http://localhost:8001/api/health

## Troubleshooting

### Backend won't start
```bash
docker-compose logs backend
```

### Database connection issues
```bash
docker-compose exec postgres psql -U doc_user -d document_retrieval
```

### Reset everything
```bash
docker-compose down -v
docker-compose up -d --build
docker-compose exec backend python init_database.py
```

### Check backend is healthy
```bash
curl http://localhost:8001/api/health
```