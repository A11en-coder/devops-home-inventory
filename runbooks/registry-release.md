# Registry image release

Status (2026-11-13): the visible release-label change reached the private Lightsail site through the CI, registry, and VM helper path. Allen reports the browser shows 32981e6 and saved items remain; Codex confirmed the tunnel-served bundle and readiness. The VM release remains manually triggered.

## Scope and prerequisites

The VM uses the existing Compose project `devops-home-inventory-private`, PostgreSQL named volume `devops-home-inventory-private-pgdata`, and loopback website port 8084. `compose.registry.yaml` changes only the API and web image sources from local builds to digest-pinned GHCR images. The database container uses `postgres:17`; its volume is not a backup. Keep `compose.private.yaml` and the previous local images while rollback and retention decisions remain open. The VM-only `deploy.env` supplies database settings; do not transfer or print it.

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

## Repeatable release helper (run on the VM with guided verification)

release-registry.sh groups candidate validation, API/web pull, Compose startup, VM-local website/readiness checks, and promotion of compose.registry.yaml.next into one VM command: bash ./release-registry.sh. It keeps a timestamped copy of the previous active release file. Review the candidate image digests, volume, network, port, and migration compatibility before running it. The script does not copy files to the VM, open firewall ports, create credentials, verify the browser workflow, or automatically roll back a failed candidate. If it stops after changing containers, diagnose the symptom and run the retained active Compose file to switch back when schema compatibility permits. Allen reports the helper reached "Release passed VM checks" on 2026-11-12. The earlier release and rollback were manual.
## Second registry release through the helper

GitHub Actions run 43025738256 published commit 814daa25e04130dff6e9504a1408e30a6e86b894 (checks and both image pushes passed). Only documentation and the registry release file changed from the previous image build; application and migration files did not change. The proposed file changed only API/web image digests:

- API: ghcr.io/a11en-coder/devops-home-inventory-api@sha256:623ae00927b4d6c82ca1f1545a2b8facfd6934050ed5b751417b344eb44848c2
- Web: ghcr.io/a11en-coder/devops-home-inventory-web@sha256:ded91ee206ab5f551bf02dd37510165e1c362fd12e17e5af849e7d25716ad4ef

Allen copied the helper and candidate to Lightsail, reported silent Bash and Compose validation, created a synthetic Release helper test item at quantity 2, then ran the helper. He reported "Release passed VM checks"; after the release the item persisted at quantity 2, changed to 1 after Use and refresh, and stayed deleted after Delete and refresh. This is guided, user-reported VM/browser verification. Codex independently verified the hosted CI run and local candidate contents, but did not inspect the VM. The helper runs by manual SSH trigger and does not test rollback from a failed release. The local tracked registry Compose file now matches the successfully promoted candidate by these reports.
## Visible release-label change (2026-11-13)

Allen added a frontend header label that displays the first seven characters of the Git commit baked into the web image. GitHub Actions run 43234161704 passed the code check and published both images for commit 32981e657809c1e10ef9a97602c349587f14ec62:

- API: ghcr.io/a11en-coder/devops-home-inventory-api@sha256:f8cd22edbb8e4f0f0cced17f34c70887c92e17a32d1c5bdeab7c86836f7a5bf3
- Web: ghcr.io/a11en-coder/devops-home-inventory-web@sha256:d895f135ff38f0a594f443c8ef63da9eaef50f639ca56ed928cf1423d406880d

Codex inspected the published web image locally and found 32981e6 in its compiled assets. No server or database migration files changed from the prior deployed source. The proposed Compose file changed only the two image references and passed local config validation. Allen copied it to Lightsail, created a synthetic pre-release item, ran the existing VM release helper, and reported that the browser showed Release: 32981e6, previously saved items remained after refresh, and another item could be added. Through Allen's existing SSH tunnel, Codex independently observed HTTP 200 for the site and /api/ready and found 32981e6 in the served JavaScript. A read-only API request returned stored items; exact before/after quantities were not independently captured. The local tracked registry Compose file was updated to the reported active digests.

This proves a guided source-to-browser delivery of a visible application change. It does not establish an automatic GitHub-to-VM trigger, cloud failure recovery, or database backup/restore. The helper should have retained a timestamped previous registry Compose file on the VM; its exact filename was not independently checked.
## Windows operator helper (guided VM release verified)

release-from-windows.ps1 is a manual start button for the existing private release path. Before each use, the operator confirms the GitHub check/publish run, reviews the two image digests, and creates a synthetic browser item. Running with -Preview checks that a candidate changes exactly the API and web digest lines; it makes no SSH connection. Running with -ServerIp <current Lightsail IPv4> checks that no candidate is already staged on the VM, copies only compose.registry.yaml.next by SCP, compares Windows and VM SHA-256 checksums, and invokes the existing VM release-registry.sh over SSH. The private SSH key stays on Windows, deploy.env stays on the VM, and no application firewall port is opened. Afterward the operator checks the browser version label and saved item. A failed transfer or VM check stops the wrapper; inspect remote status/logs before retrying. Run one release at a time.

The first planned wrapper exercise uses the already published images from commit 1bca1d99c450871db209688994e13e6a4dd8c284, GitHub Actions run 43239183906:

- API: ghcr.io/a11en-coder/devops-home-inventory-api@sha256:61dcf294c3f7808e8d56b8b8607eb241c7ff77d4836b9331809103ffbee65755
- Web: ghcr.io/a11en-coder/devops-home-inventory-web@sha256:f6b530740b64cb48b38687f88baada6a385d91984c6ffc9299999a31b3d3dec0

This commit changed only the release records, not API code or database migrations. Its published web image contains the visible label 1bca1d9. The local candidate changed only the two image digests and passed Docker Compose config validation. The wrapper preview passed; a candidate with a changed web port was rejected. Allen ran the wrapper on 2026-11-13 and reported that its VM checks passed. Through SSH, Codex read the VM-local /api/ready response (200), the same two item names and quantities (3 each) as the pre-release snapshot, the new active API/web digest references, and a served web bundle containing 1bca1d9. Allen independently viewed the page through the browser tunnel and confirmed the new label and saved items. The wrapper was started manually from Windows; GitHub did not directly connect to the VM.
## Failure diagnosis and rollback

If the VM readiness check fails, inspect `docker compose ps` and the relevant service logs, then compare the requested image digests, migration output, and database health. If VM-local readiness is 200 but the Windows browser cannot connect, check the SSH tunnel and Lightsail SSH source rule before changing containers. Do not use `down --volumes` during diagnosis.

For this first release, the previous locally built API/web images and `compose.private.yaml` remain on the VM. A candidate application rollback is `sudo docker compose --env-file deploy.env -f compose.private.yaml up --no-build --detach`, followed by readiness, browser, and data checks. Allen exercised this switch-back path with synthetic data on 2026-11-12, then switched forward to the registry images. This proves the known-good version can be selected again while retaining the same database volume; it does not prove diagnosis of a broken release. For future releases, retain the previous digest-pinned Compose file. Application rollback does not reverse database migrations; check schema compatibility before any rollback. Do not remove images or the named database volume until retention and recovery decisions are made.

## Observed result and gaps

Allen reports both pinned registry manifests reachable from the VM, candidate config validation, both pulls, healthy startup, GHCR image sources in Compose status, and the synthetic item surviving the switch at quantity 2. He then used one unit, refreshed to see quantity 1, deleted the item, and refreshed to confirm absence. These are guided user-observed results; Codex has not directly accessed the VM. Automatic CI checks and GHCR publishing were independently verified in GitHub Actions run `43020915168`. The VM release itself was triggered manually over SSH. Allen then created a synthetic Rollback test item at quantity 2, switched to the cached VM-built images with compose.private.yaml and up --no-build --detach, reported all services healthy and the item preserved, switched forward with compose.registry.yaml and the same command, reported healthy GHCR services and the item preserved, then deleted it and confirmed it stayed absent. These VM observations were user-reported under guidance, not independently inspected by Codex. A GitHub-to-VM deployment trigger, automated browser/data checks, cloud failure recovery, and off-machine backup/restore remain open. An isolated local failed-release recovery was completed separately in runbooks/failed-release-lab.md.
