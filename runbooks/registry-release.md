# Registry image release

Status (2026-11-12): first GHCR release was deployed to the private Lightsail VM and verified by Allen with synthetic data. Rollback has not yet been exercised.

## Scope and prerequisites

The VM uses the existing Compose project `devops-home-inventory-private`, PostgreSQL named volume `devops-home-inventory-private-pgdata`, and loopback website port 8084. `compose.registry.yaml` changes only the API and web image sources from local builds to digest-pinned GHCR images. The database container uses `postgres:17`; its volume is not a backup. Keep `compose.private.yaml` and the previous local images until rollback is tested. The VM-only `deploy.env` supplies database settings; do not transfer or print it.

The first registry release uses GitHub build commit `427756eb7d837aa3dcdfb62d9f1a10c295264dae`:

- API: `ghcr.io/a11en-coder/devops-home-inventory-api@sha256:99b82fdeca0aeecce85122ea45a217f2b09c6abca734c238da81b7786b466afa`
- Web: `ghcr.io/a11en-coder/devops-home-inventory-web@sha256:bd4a457c0b4b82ee764185df1142cae2ea9626da426d5f5e21a4517ca0af2d8c`

The packages are public per Allen's GitHub UI report, so the VM does not need a registry token. The app itself remains private behind the SSH tunnel. Confirm the current Lightsail firewall still exposes no application or database port.

## Manual release sequence

1. Confirm CI checks and both registry pushes passed. Capture commit tag and image digests from the run. Review the candidate release file and schema compatibility before switching.
2. Copy the candidate Compose file from Windows to `~/devops-home-inventory/compose.registry.yaml.next` on the VM. Run `sudo docker compose --env-file deploy.env -f compose.registry.yaml.next config --quiet` from the project folder. Do not run `config` without `--quiet`, because it can print the database URL.
3. Run `sudo docker compose --env-file deploy.env -f compose.registry.yaml.next pull devops-home-inventory-api web`. This downloads the images without changing running containers.
4. Create a disposable, uniquely named inventory item through the browser tunnel and refresh to establish its saved state. Keep only synthetic data in this lab.
5. Rename the checked candidate to `compose.registry.yaml`. Run `sudo docker compose --env-file deploy.env -f compose.registry.yaml up --no-build --detach`. Expect a brief web/API interruption. The same project and named PostgreSQL volume are retained.
6. Run `sudo docker compose --env-file deploy.env -f compose.registry.yaml ps`, then request `http://127.0.0.1:8084/api/ready` from the VM. Confirm the API/web image entries are from GHCR and readiness returns 200. Through the SSH tunnel, refresh the browser and confirm the synthetic item, update it, then delete it and confirm absence after refresh.

## Failure diagnosis and rollback

If the VM readiness check fails, inspect `docker compose ps` and the relevant service logs, then compare the requested image digests, migration output, and database health. If VM-local readiness is 200 but the Windows browser cannot connect, check the SSH tunnel and Lightsail SSH source rule before changing containers. Do not use `down --volumes` during diagnosis.

For this first release, the previous locally built API/web images and `compose.private.yaml` remain on the VM. A candidate application rollback is `sudo docker compose --env-file deploy.env -f compose.private.yaml up --no-build --detach`, followed by readiness, browser, and data checks. This rollback path has **not** been exercised yet. For future releases, retain the previous digest-pinned Compose file. Application rollback does not reverse database migrations; check schema compatibility before any rollback. Do not remove images or the named database volume until retention and recovery decisions are made.

## Observed result and gaps

Allen reports both pinned registry manifests reachable from the VM, candidate config validation, both pulls, healthy startup, GHCR image sources in Compose status, and the synthetic item surviving the switch at quantity 2. He then used one unit, refreshed to see quantity 1, deleted the item, and refreshed to confirm absence. These are guided user-observed results; Codex has not directly accessed the VM. Automatic CI checks and GHCR publishing were independently verified in GitHub Actions run `43020915168`. The VM release itself was triggered manually over SSH. Automated deployment, post-deploy verification in a pipeline, failure/rollback drill, and off-machine backup/restore remain open.
