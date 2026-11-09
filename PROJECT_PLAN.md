# DevOps Home Inventory — project brief and learning plan

Updated: 2026-11-09 (Australia/Sydney)

## Purpose and scope

Build a small household inventory app as the system Allen will deploy, operate, recover, and scale. The application is a learning workload; most effort goes into the runtime and operations around it. Work at roughly 5–7 hours per week in 30–90 minute sessions, with troubleshooting and review time. Re-estimate after the first foundations and runtime milestones.

### Proposed first release

Single-user inventory using synthetic, non-sensitive items. No sign-in or public write access in the first local version. Before any reachable deployment, decide and verify an access boundary; do not expose a writable inventory to anonymous users by accident.

User workflows:
1. Add an item with a name, whole-unit quantity, and low-stock threshold.
2. View all items and identify those strictly below their threshold; show Out of stock at zero.
3. Use one unit of an item; refresh and see the saved result. Restocking is deferred.

Rules and failure cases to settle before schema or UI work: names cannot be blank; quantities and thresholds cannot be negative; duplicate names must be rejected regardless of capitalization; a missing item and an unavailable database produce understandable errors. Quantities are nonnegative whole units; item removal is deferred. Keep the first interface to a list, add form, and quantity edit control, with loading, empty, success, and error states.

Observable local acceptance:
- A valid item can be added, listed, updated, and still appears after a page refresh and ordinary application restart.
- An item below its threshold is visibly marked low stock; zero is shown as Out of stock.
- Invalid input is rejected by the server without changing stored data; the UI explains the error.
- A failed database connection is distinguishable in logs and produces a controlled response.
- One focused automated check covers a meaningful server/data path; the main browser workflow is also checked manually.

Deferred: accounts and sharing, barcode scanning, images, notifications, shopping recommendations, complex categories, mobile app, and visual polish beyond usability. Revisit only when they serve an explicit learning need.

## Lifecycle roadmap

1. **Foundations:** identify a suitable Linux environment on this Windows host; learn files, permissions, processes, logs, ports, HTTP, and Git through a small local service and controlled diagnosis.
2. **Working app:** define one thin feature, then implement and verify browser → server → database behavior. Establish configuration, safe logs, and basic health behavior.
3. **Reproducible runtime:** run the app and database from documented inputs, learn container images, networks, and volumes, and verify restart persistence.
4. **Deployment:** compare one provider's current learning fit and total cost, then manually deploy, secure, and externally verify the system.
5. **Delivery automation:** add checks, versioned build, deployment, smoke verification, and a tested failed-release recovery path.
6. **Operation and recovery:** establish useful signals, a simple reliability target, backup and isolated restore, and a diagnosed incident exercise.
7. **Infrastructure as code:** model the understood deployment, review changes and drift, and rebuild an isolated environment without duplicating billable resources.
8. **Measured scaling:** define a bounded synthetic workload, collect a baseline, change one bottleneck, and compare results.

These are dependency stages, not fixed deadlines. Keep the app small enough to preserve operational practice. Each stage uses manageable sessions and records observed evidence before moving on.

## Current position and next task

Current: Stage 2, application feature cycle step 3 (implement and verify persistence), with a small Docker prerequisite lab. Stage 1 has guided Linux/HTTP practice; Linux capability will continue through the app. Next task: create server/ and client/ directories, then initialize the Node API package inside server/ before the Item schema and migration. Practice Python server cleanup is unconfirmed.

Known host observations (2026-11-09, read-only checks from Codex): Windows, PowerShell 7.6.9; Git 2.55.0, Node 24.16.0, npm 11.13.0; Docker CLI found, Docker engine connection unavailable. `wsl --list --verbose` returned `Wsl/E_ACCESSDENIED` from the Codex execution context. This does not establish whether WSL or a Linux distribution is installed for Allen's interactive session.

## Architecture and environment decisions

- Project directory: `C:\Users\Allen\Documents\devops-home-inventory`.
- Source layout: server/ for the Express/Prisma API and client/ for the React UI. Root contains project plan, Git rules, and local Docker initialization .env. Each application side gets its own package.json; no root package is needed for now. Application connection configuration will be added to an ignored server-specific file later.
- Existing cross-project learning record: `C:\Users\Allen\Documents\full-stack-learning-progress.md` (readable; last checked 2026-11-09). It records prior local full-stack work but no independently demonstrated Linux, container, cloud, or recovery capability.
- Application stack: plan to reuse familiar React/TypeScript, Express/TypeScript, Prisma, and PostgreSQL so infrastructure remains the main challenge. Local PostgreSQL will run in Docker Desktop; app code remains in the agreed Windows project directory. Exact package versions and runtime wiring are pending.
- Environment map: Windows host → Ubuntu WSL (Allen reported running) → local app/database (planned) → single cloud provider (later, undecided). A container is a process environment, not a separate server or backup.
- Cloud identity, region, public access, DNS/TLS, and deployment topology: undecided until deployment stage and cost review.
- Resource inventory: no cloud resources provisioned for this project. Docker Desktop Engine 29.1.3 and a successful hello-world:linux run were reported by Allen on 2026-11-09. The hello-world container was started with --rm and should have been removed; its image may remain cached. Estimated project cloud cost so far: A$0/month. Actual spend: none known. Cleanup: inspect/remove the cached test image only if space is needed. Local database resource (created/reported by Allen): Docker container devops-home-inventory-db from postgres:17, named volume devops-home-inventory-pgdata, host binding 127.0.0.1:5433 to container port 5432, using ignored .env for initialization. Allen reported both names free before creation. The volume is not a backup; stop/remove the container only when intended, and delete the named volume only after confirming data can be discarded or restored.

## Evidence and status

| Capability or deliverable | Planned | Implemented | Verified | Evidence / gap |
|---|---|---|---|---|
| Project brief | Yes | Drafted | Behavior partly agreed | This file; data/interface design pending |
| Linux environment | Yes | Ubuntu reported running | With guidance | Allen reported `/home/allen` in Ubuntu and Python 3.14.4; WSL distro listing showed only `docker-desktop` before installation |
| Local app workflow | Yes | No | No | Use one behavior defined; data/interface design pending |
| Containers through scaling | Yes | No | No | Later stages |

No capability is marked demonstrated independently yet. Record environment, date, command/check, observed result, and evidence location for later milestones without secrets. Runbooks, deployment version, migration state, incidents, and deferred improvements will be added when they exist.


## Foundation exercise evidence — 2026-11-09

Allen reported running Ubuntu in WSL, navigated from /mnt/c/Users/Allen to /home/allen, created /home/allen/devops-lab/note.txt, and inspected its permissions (-rw-r--r--, owner allen). In the lab he started Python's local file server bound to 127.0.0.1:8000, observed a successful GET /note.txt with HTTP 200, a missing path with HTTP 404, then ERR_CONNECTION_REFUSED after stopping the process. He restarted it and reported that it was running. These are reported interactive observations completed with guidance, not an independent diagnostic demonstration. The listener and port-conflict exercise followed.


Checkpoint: `ss -ltn` showed `127.0.0.1:8000` in LISTEN state. `ss -ltnp` identified `python3`, PID 1179, as the owner. A second server on that address/port failed with `[Errno 98] Address already in use`. After stopping the first server with Ctrl+C, Allen reported that the second started and `/note.txt` loaded. Completed with guidance; next revisit should change the port or process and ask Allen to diagnose from evidence without a prescribed cause. Practice server cleanup remains to be confirmed.

## First feature definition — inventory quantity

Status: Step 1 behavior agreed; Step 2 data/interface design in progress. Rules below are planned, not implemented or verified.

Allen's examples (quantity and low-stock threshold): cookies 40/5; meat 20/2; rice 100/30. All items use a generic whole-unit count. No separate unit label is needed in the first release; each Use one action subtracts exactly 1.

Main action: choose an item and use one unit. The stored quantity decreases by exactly 1, and the displayed quantity updates. A warning appears when the resulting quantity is strictly below that item's threshold. At exactly the threshold, no warning appears (interpretation of Allen's word "below"; confirm if intended behavior differs).

Example boundary check for cookies: 6 -> 5 gives no warning; 5 -> 4 gives a warning. A page refresh should show the saved quantity and the same warning state. At zero, keep the stored quantity at 0, show "Out of stock", and disable the Use one button. The server must also reject a direct or late Use one request at zero without changing data. Names must be unique regardless of capitalization (for example, Cookies and cookies conflict); item removal is deferred.

Trace: user presses Use one -> server validates and updates the selected item -> database stores the new quantity -> browser shows the new quantity and warning state. The server owns the rule so two quick requests cannot each overwrite the other with a stale count; implementation design is pending.





## Proposed first feature data and interface design

One inventory item has a generated stable ID, name, nonnegative whole-number quantity, and nonnegative whole-number low-stock threshold. Names must be nonblank and unique regardless of capitalization. The first thin slice uses sample items; the add-item workflow follows after Use one is verified end to end. No separate unit label or deletion in the first release.

Browser action: send the item ID for Use one; do not send a client-calculated new quantity. The server checks that the item exists and has stock, then decrements in the database as one guarded operation and returns the updated item. If missing, return a not-found error. If at zero, reject without changing stored data. If the database is unavailable, log safely and return a controlled service error. The list response includes current quantities; the browser derives warning when quantity < threshold and Out of stock when quantity = 0. Disable Use one while a request is pending or quantity is zero; show success/error feedback. If two requests race at quantity 1, exactly one succeeds and the other is rejected; final quantity is 0. Allen confirmed this expected behavior on 2026-11-09. The implementation must enforce it in the database update, not rely on the disabled browser button.

Proposed HTTP shape (to confirm before coding): GET /items lists items; POST /items/:id/use-one performs the action. Success returns the updated item; missing ID returns 404; zero stock returns 409. Add-item endpoint follows. Choice of framework, database runtime, and exact request/response fields awaits the environment/setup check. These are design proposals, not implemented or verified.




Local PostgreSQL checkpoint (reported by Allen, 2026-11-09): Docker Engine reachable from Allen''s Windows PowerShell; `hello-world:linux` ran. `.env` exists and Git ignore rule was verified without reading secret values. Container and volume names were reported free before creation. Allen reports the PostgreSQL container is up and `pg_isready -U postgres -d inventory_dev` says accepting connections. This verifies process readiness only; SQL access, schema, stored data, host port access, and restart persistence remain unverified. Container/volume creation is reported, not directly inspected by Codex because Docker API access is denied in the Codex process.

SQL access checkpoint (reported by Allen, 2026-11-09): `docker exec devops-home-inventory-db psql -U postgres -d inventory_dev -c "SELECT current_database();"` returned `inventory_dev`. This verifies a read-only SQL query inside the container. Windows host port/password connection, schema constraints, migrations, application behavior, and restart persistence remain unverified.


