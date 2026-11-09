# Local frontend container

## What this starts

The React app is built into static HTML, JavaScript, and CSS by the first Dockerfile stage. A smaller, non-root NGINX container serves those files on its internal port 8080. Docker publishes it only to this computer at `127.0.0.1:8080`. NGINX forwards `/api/...` to `devops-home-inventory-api:3000/...` over `devops-home-inventory-net`; that API connects to PostgreSQL. The frontend image contains no database URL or password.

The Vite development proxy is used only during local development. The built frontend uses the NGINX rule in `client/nginx.conf`.

## Prerequisites

Run commands in Windows PowerShell from `C:\Users\Allen\Documents\devops-home-inventory`. Docker Desktop is running. The API and PostgreSQL containers are running on `devops-home-inventory-net`. Host port 8080 and the frontend container name are free before creating a new frontend container.

## Build and start

```powershell
docker build --tag devops-home-inventory-client:local .\client
docker run --detach --name devops-home-inventory-client --network devops-home-inventory-net --publish 127.0.0.1:8080:8080 devops-home-inventory-client:local
```

`client/.dockerignore` keeps local dependencies, build output, and environment files out of the build context. The Dockerfile runs `npm ci` and `npm run build`, then copies only the built files into the NGINX image. The host-side `127.0.0.1` keeps this local lab off the LAN.

## Verify and diagnose

```powershell
Invoke-WebRequest http://127.0.0.1:8080/
Invoke-WebRequest http://127.0.0.1:8080/api/ready
Invoke-RestMethod http://127.0.0.1:8080/api/items
docker ps --filter 'name=^/devops-home-inventory-client$'
docker logs devops-home-inventory-client
```

Open `http://127.0.0.1:8080/` in a browser. The page, its built assets, and `/api/ready` should respond. Add, Use one, and Delete should work through the same address; use only a disposable test item for a check. Refresh to confirm the final saved state.

If the page is unavailable, inspect the frontend container status and logs. If the page loads but `/api/ready` fails, check the API container and the shared network. NGINX resolves the API container name when it starts; if that API container is replaced with a new address, restart the frontend container.

```powershell
docker restart devops-home-inventory-client
```

A source change requires rebuilding this static frontend image and replacing only the frontend container. Do not remove the PostgreSQL container or its named volume as part of frontend cleanup. The extra Vite preview on port 5174 is not required for this containerized path.
