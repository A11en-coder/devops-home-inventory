# Isolated Compose lab

## What this starts

Run `./start-compose-lab.ps1` from PowerShell. Docker Compose builds and starts three services on a private project network:

browser -> 127.0.0.1:8081 -> web (NGINX) -> API -> db (PostgreSQL)

The browser talks to NGINX. NGINX forwards /api to the API service by its Docker service name. The API reaches PostgreSQL at db:5432. Only the website is published to Windows, and only on loopback. The existing manual containers and their devops-home-inventory-pgdata volume are separate.

## Prerequisites and start

Docker Desktop must be running. The ignored root .env must contain POSTGRES_DB and POSTGRES_PASSWORD. The ignored server/.env must contain DATABASE_URL for the existing local database at 127.0.0.1:5433. The script checks that the passwords agree and substitutes db:5432 only in process memory. Do not commit either .env.

From the project root:

```powershell
./start-compose-lab.ps1
```

Open http://127.0.0.1:8081. The script validates Compose configuration without printing it, builds images, waits for PostgreSQL and API health checks, and starts the website. The API applies the existing Prisma migration on startup. It should find nothing new to apply on later starts.

## Check and diagnose

```powershell
Invoke-WebRequest http://127.0.0.1:8081/api/ready
Invoke-WebRequest http://127.0.0.1:8081/api/items
docker ps --filter label=com.docker.compose.project=devops-home-inventory-lab
docker logs devops-home-inventory-lab-devops-home-inventory-api-1 --tail 50
```

A 200 from /api/ready means the API can query the database. If the page fails, check Docker Desktop and whether port 8081 is occupied. If readiness fails, inspect the API and database health/logs. Do not print the resolved Compose configuration because it includes the database password.

## Recreate and stop

```powershell
./start-compose-lab.ps1 -Recreate
./start-compose-lab.ps1 -Stop
```

-Recreate removes and rebuilds only this lab's containers and network, then starts them again. -Stop removes only this lab's containers and network. Both preserve the named volume devops-home-inventory-lab-pgdata. Running the script again starts the lab from that volume. The volume is persistence, not a backup. Do not use `docker compose down -v` unless you intentionally want to erase this lab's database after checking that its data can be discarded.

## Controlled website-stop exercise — 2026-11-10

Scope: isolated Compose lab web container only. Allen ran `docker stop devops-home-inventory-lab-web-1`. Symptom: the browser could not reach 127.0.0.1:8081. Evidence: `docker ps -a --filter name=devops-home-inventory-lab-web-1` showed Exited (0), confirming a normal stop. Cause: the website container was stopped deliberately; the browser port had no serving process. Recovery: Allen ran `docker start devops-home-inventory-lab-web-1` and reported that the page loaded again. Codex independently checked HTTP 200 for / and /api/ready after recovery. Database and API were not intentionally stopped; no saved data was changed. Lesson/prevention: when the page cannot be reached, inspect the web container status before changing configuration; a stopped container can be started without rebuilding it. This demonstrates guided stop/status/start diagnosis for one service, not recovery from an unknown outage.
