# Isolated failed-release lab

Status (2026-11-12): the guided failure and recovery exercise is complete. The disposable containers, network, volume, and credentials file were removed. The two Compose examples remain for study.

This disposable Docker Compose project was `devops-home-inventory-failure-lab`. It published only Windows loopback port `18086`, used the separate named volume `devops-home-inventory-failure-lab-pgdata`, and used generated synthetic credentials in local `deploy.env`. It did not connect to Lightsail or the existing local project on port 8081. The credentials file was removed during cleanup; recreate it before rerunning the examples. Do not print or commit credentials.

## Learning goal

Distinguish a failed release from a healthy process or static page. Use container status, API logs, and `/api/ready` to find why the candidate failed; then return to the known-good Compose file and verify the saved item still works. This changes application containers only; it does not demonstrate database backup or restore.

## Planned exercise

1. In the browser at `http://127.0.0.1:18086`, create and refresh a disposable item with quantity 2.
2. From this folder, apply `compose.bad.yaml` with `docker compose --env-file deploy.env -f compose.bad.yaml up --no-build --detach --wait --wait-timeout 30`. Failure is expected. The only intentional difference is that the API command exits with code 23 before opening port 3000.
3. Inspect `docker compose --env-file deploy.env -f compose.bad.yaml ps` and `docker compose --env-file deploy.env -f compose.bad.yaml logs --tail 30 devops-home-inventory-api`. Compare the website and `/api/ready` responses.
4. Recover with `docker compose --env-file deploy.env -f compose.good.yaml up --no-build --detach --wait --wait-timeout 180`. Verify `/api/ready`, the browser item, and a saved Use action.
5. After recording the evidence and removing the synthetic item, clean up only this project and its named volume. Confirm the exact project/volume targets before deletion.

If recovery fails, stop and inspect the current Compose status and API/db logs. Do not use `down --volumes` as a recovery step.

## Observed exercise (2026-11-12)

- **Symptom and impact:** Allen reported the candidate `up --wait` failed because the API did not start. Compose status showed the database healthy, web running, and API repeatedly restarting with exit code 23. The browser showed the page but could not load items; `/api/ready` returned 502 from NGINX.
- **Evidence and cause:** API logs contained `LAB_FAULT_API_STOPPED_BEFORE_PORT_3000`. Allen compared the two Compose `command:` lines. The candidate replaced the normal migration and server startup with a command that printed the marker and exited 23. The image and database configuration were unchanged.
- **Recovery:** Allen reapplied `compose.good.yaml` and reported all services healthy and the saved practice item still visible. This demonstrates guided recovery from a deliberately failed application release with the same database volume. It does not demonstrate database restore or remote deployment recovery.
- **Verification limit:** Allen reported a successful Use action, but Codex's later read-only API check showed `Recovery test` at quantity 3 rather than the expected 1. The decrement is therefore **not counted as verified**. Allen then reported deleting the item; Codex confirmed the API item list was empty.
- **Cleanup:** Codex verified the project and volume names, ran `docker compose --env-file deploy.env -f compose.good.yaml down --volumes`, confirmed no failure-lab containers or volume remained, removed local `deploy.env`, and checked the preexisting local app's `/api/ready` still returned 200.
- **Prevention:** Keep candidate and known-good Compose files separate; gate promotion on API readiness and a user workflow. When readiness fails, inspect the failing service's status and logs before changing the database or deleting its volume.
