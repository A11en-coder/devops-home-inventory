# Local database runbook

Environment: Windows PowerShell controlling Docker Desktop. This is the disposable development database `inventory_dev`, in container `devops-home-inventory-db`. Host access is limited to `127.0.0.1:5433`; PostgreSQL listens on port 5432 inside the container. Named volume `devops-home-inventory-pgdata` holds its data. A volume is not a backup.

## Prerequisites

- Docker Desktop running.
- Root `.env` for initial PostgreSQL container setup and ignored `server/.env` for the server connection. Do not print or commit their values.
- Run Prisma commands from `server/` in Windows PowerShell.

## Start and verify

For an existing stopped container, run `docker start devops-home-inventory-db`. Check `docker ps --filter name=devops-home-inventory-db`, then `docker exec devops-home-inventory-db pg_isready -U postgres -d inventory_dev`. From `server/`, `npx prisma migrate status` checks migration state; `npx prisma db seed` adds missing sample items without resetting existing counts. A healthy container alone does not prove the application workflow.

## Diagnose

1. Record the symptom, time, environment, and last change.
2. `docker ps --all --filter name=devops-home-inventory-db` distinguishes stopped from running.
3. `docker logs --tail 50 devops-home-inventory-db` shows recent database startup errors. Avoid printing environment variables or connection strings.
4. Check whether the server's request reaches `127.0.0.1:5433`, whether PostgreSQL accepts connections, and whether migrations are current. Change one thing at a time.

## Recovery and cleanup

If the container stopped, inspect logs and start that named container, then verify readiness and the original item workflow. For a failed migration, inspect its state and SQL before changing anything; do not reset meaningful data. `docker stop devops-home-inventory-db` stops this local database and leaves the named volume intact. Remove the volume only after confirming its data can be discarded or an isolated restore works. Backup and restore have not yet been demonstrated.
