# Private Linux deployment preparation

Status: local preparation only. No cloud VM or public website has been created.

## Files and purpose

- compose.private.yaml starts the existing web, API, and PostgreSQL images on a separate Docker network. It publishes only the website on 127.0.0.1:8084. On a Linux VM, that address is the VM's own loopback address; a remote browser needs an SSH tunnel to reach it. The API and database have no published ports.
- deploy.env.example lists the settings required by Compose and contains placeholders only.
- deploy.env is the actual private settings file. It is ignored by Git and must be created separately on each machine with a new strong URL-safe password. The same password goes in POSTGRES_PASSWORD and inside DATABASE_URL; DATABASE_URL must point to db:5432, the PostgreSQL service on the private Docker network. Never print, commit, or copy a real password into the example file.
- server/.env remains for the Windows development API and is unrelated to this Linux deployment setup.

## Before using on a Linux VM

Create deploy.env from the example using a fresh password, then run `chmod 600 deploy.env`. This Linux command lets the file owner read and change the file while denying ordinary other users. It does not hide the password from the VM administrator or make an environment variable into a secret vault. The current API requires DATABASE_URL as an environment variable; a later hardening step can move toward Docker Compose secrets.

Docker and Compose must be installed on the VM. Restrict SSH access, keep the website bound to loopback, and use synthetic data until access control and HTTPS are ready. Do not expose the API or database ports.

## Validate and run

From the project directory:

```sh
docker compose --env-file deploy.env -f compose.private.yaml config --quiet
docker compose --env-file deploy.env -f compose.private.yaml up --build --detach
```

--env-file tells Compose exactly which private settings file to read. -f selects this deployment plan. config --quiet checks that required values are present without printing the resolved configuration; running config without --quiet may reveal the password. up --build --detach builds images and starts containers in the background. The API runs pending Prisma migrations after PostgreSQL becomes healthy.

Check the website and database-backed readiness from the VM or through an SSH tunnel:

```sh
curl -fsS http://127.0.0.1:8084/
curl -fsS http://127.0.0.1:8084/api/ready
docker compose --env-file deploy.env -f compose.private.yaml ps
```

A successful /api/ready response means the API can query PostgreSQL. If the site fails, inspect container status and logs before changing settings.

## Stop and recovery

```sh
docker compose --env-file deploy.env -f compose.private.yaml down
```

This removes this project's containers and network while keeping its named database volume. Starting again reuses that volume. The volume is not an off-machine backup. Do not add --volumes unless the data is known disposable or restored elsewhere.

## Local rehearsal evidence — 2026-11-10

Codex generated a new disposable deploy.env, verified that Git ignored it, and ran config --quiet successfully. The private Compose project started on loopback port 8084 with a fresh named volume. The page and /api/ready returned 200. A synthetic item was created, listed, then deleted; the final list was empty. The original lab on port 8081 remained ready. Codex removed the rehearsal containers, network, fresh volume, and generated deploy.env. Only the non-secret plan and example remain. This verifies local configuration flow; Linux file permissions, SSH tunnel, remote VM, public DNS/TLS, authentication, and remote recovery are not yet verified.
