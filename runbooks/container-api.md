# Local API container

## What this starts

The existing PostgreSQL container `devops-home-inventory-db` keeps the data in the named volume `devops-home-inventory-pgdata`. The API image contains Node, installed dependencies, generated Prisma Client, and API source. The API container joins `devops-home-inventory-net`, reaches PostgreSQL at `devops-home-inventory-db:5432`, and is reachable from this Windows computer at `127.0.0.1:3001`. The original Windows API can continue using port 3000.

The image contains no `.env` file or `DATABASE_URL`. The connection URL is supplied when the API container starts. Docker stores runtime environment variables in container metadata, so keep Docker access local and do not share `docker inspect` output that includes them.

## Prerequisites

- Run commands in Windows PowerShell from `C:\Users\Allen\Documents\devops-home-inventory`.
- Docker Desktop is running, and `devops-home-inventory-db` is running.
- `server/.env` has the local `DATABASE_URL` for `127.0.0.1:5433`; keep it out of Git.
- Port 3001 and the API container name are free before creating a new API container.

## Build and connect

```powershell
docker build --tag devops-home-inventory-api:local .\server
```

This reads `server/Dockerfile` and creates an image. `server/.dockerignore` excludes local dependencies and environment files from the build context.

On a fresh setup, make a private network and attach the existing database container. If the network already exists or the database is already attached, skip the corresponding command.

```powershell
docker network create devops-home-inventory-net
docker network connect devops-home-inventory-net devops-home-inventory-db
```

The next PowerShell block reads the existing connection URL without printing it, swaps the Windows host/port for the database container name/port, passes it to Docker as a runtime variable, then removes it from that PowerShell process. Do not paste the URL into a command or commit it.

```powershell
$line = Get-Content .\server\.env | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $line) { throw 'DATABASE_URL not found' }
$value = $line.Substring('DATABASE_URL='.Length).Trim('"', "'")
$from = '@127.0.0.1:5433'
if (-not $value.Contains($from)) { throw 'Unexpected local database address' }
$env:DATABASE_URL = $value.Replace($from, '@devops-home-inventory-db:5432')
try {
  docker run --detach --name devops-home-inventory-api --network devops-home-inventory-net --publish 127.0.0.1:3001:3000 --env DATABASE_URL devops-home-inventory-api:local
} finally {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}
```

The host-side `127.0.0.1:3001` keeps this local test reachable only on this computer. The API listens on all interfaces *inside* its container through `HOST=0.0.0.0` in the Dockerfile.

## Verify and diagnose

```powershell
Invoke-WebRequest http://127.0.0.1:3001/ready
Invoke-RestMethod http://127.0.0.1:3001/items
docker ps --filter 'name=^/devops-home-inventory-api$'
docker logs devops-home-inventory-api
```

Expected: `/ready` returns HTTP 200 and `/items` shows the same saved items as the original API. If the container is running but `/ready` returns 503, check the database container, the shared network, and the runtime connection address. If port 3001 refuses connections, check `docker ps` and `docker logs` before changing configuration.

Restart only the API container to check that it reconnects and the saved items remain:

```powershell
docker restart devops-home-inventory-api
Invoke-WebRequest http://127.0.0.1:3001/ready
```

This does not restart PostgreSQL or prove a database backup exists. To stop the test API later, use `docker stop devops-home-inventory-api`. Remove that API container only when intentionally replacing it; do not remove the database container or named volume as part of API cleanup.

## Try the browser against the API container

The normal Vite development server still targets the Windows API on port 3000. To start a separate local preview that targets the containerized API on port 3001, run this from client/ in a new PowerShell window:

```powershell
$env:API_PROXY_TARGET = 'http://127.0.0.1:3001'
try {
  npm run dev -- --port 5174 --strictPort
} finally {
  Remove-Item Env:API_PROXY_TARGET -ErrorAction SilentlyContinue
}
```

Open `http://127.0.0.1:5174/`. Its `/api` requests pass through Vite to the API container; the React code stays unchanged. Try a disposable item through Add, Use one, and Delete, then refresh. Stop this Vite preview with Ctrl+C when finished. This preview still runs the frontend on Windows; containerizing the frontend is a later step.