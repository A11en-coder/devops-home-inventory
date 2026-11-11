# Private cloud launch

Status (2026-11-11): user-reported private Lightsail deployment running with healthy db/API/web, HTTP 200 readiness, SSH tunnel browser access, synthetic item persistence across an ordinary Compose restart, and reboot recovery with Docker startup and tunnel reconnection. This is a supervised lab with synthetic data, not a public production launch. Actual billing and resource ID remain to be checked; the VM continues to incur charges.

## What the SSH tunnel does

Windows browser -> 127.0.0.1:8084 on Windows -> encrypted SSH connection on port 22 -> 127.0.0.1:8084 on the VM -> NGINX web container -> API -> PostgreSQL.

The browser address still says 127.0.0.1 because it connects to the Windows end of the tunnel. SSH carries that request to the VM. On the VM, compose.private.yaml binds the website to its own loopback address. The API and database are not published. Closing the SSH connection closes the tunnel, not the app or database.

Windows OpenSSH_for_Windows_9.5p2 and scp are present. No AWS CLI or Git remote is configured; use a Git archive of committed source plus scp for the first manual transfer. The private deploy.env file must be created on the VM, never included in the archive.

## Proposed billable resource and access

Provider: Amazon Lightsail. Region: Asia Pacific (Sydney), ap-southeast-2. Blueprint: Ubuntu 24.04 LTS. Bundle: Small-2GB Linux with public IPv4, 2 GB RAM and 60 GB included disk, listed at US$12/month. One VM, one attached static IPv4 address (listed as no extra charge while attached). No managed database, load balancer, domain, extra disk, or public website port in this first lab.

Firewall: allow inbound SSH TCP/22 only from Allen's current public IPv4 address; remove any default public HTTP/HTTPS rules and review IPv6 rules too. Determine the actual source IP immediately before creating the rule. Do not publish 8084, 3000, or 5432. If the source IP changes, update the SSH rule through the Lightsail console before reconnecting. Use a Lightsail key pair and store its private key outside Git. Verify SSH host identity at first connection.

Price basis checked 2026-11-10: US$12/month for the VM. At RBA's 2026-11-09 indicative 1 AUD = 0.6894 USD, this is about A$17.41/month before GST, exchange fees, optional snapshots, and transfer overages; roughly A$19.15 with 10% GST as a planning estimate. Reserve A$25/month for this single VM and keep the total below Allen's A$30/month ceiling. A static IP attached to a VM is listed at no extra charge, but an unattached one may incur charges. Actual region/account price and tax must be checked immediately before creation. Do not count trial credits as permanent free use.

Sources: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html ; https://docs.aws.amazon.com/lightsail/latest/userguide/compare-options-choose-lightsail-instance-image.html ; https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-firewall-and-port-mappings-in-amazon-lightsail.html ; https://docs.aws.amazon.com/en_en/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html ; https://www.rba.gov.au/statistics/frequency/exchange-rates.html

## Deployment sequence after explicit approval

1. Create only the specified Lightsail VM; a static IP was proposed but not attached in the observed lab. Record its owner, region, public IP, resource ID, start time, and observed billing.
2. Configure the firewall as above and verify SSH access from Windows. The AWS console browser SSH can be a recovery path if Allen's source IP changes.
3. Install Docker Engine and Compose plugin from Docker's official Ubuntu repository after checking the VM's actual Ubuntu version and existing packages. Verify docker and docker compose versions and the Docker service. Source: https://docs.docker.com/engine/install/ubuntu/
4. Make a Git archive of committed project files on Windows, verify it excludes .env and deploy.env, transfer it with scp, and extract it into a project directory on the VM. No Git remote currently exists.
5. On the VM, create a new private deploy.env using deploy.env.example as a guide. Generate a fresh URL-safe password; put the same password in POSTGRES_PASSWORD and the DATABASE_URL for db:5432. Set file permissions with chmod 600. Do not print the resolved Compose config or secret.
6. From the VM project directory, run the config --quiet and up --build --detach commands in runbooks/private-deployment.md using sudo if needed. If a 2 GB build lacks memory, stop and measure before choosing a workaround or paid size increase.
7. Verify locally on the VM that / and /api/ready return 200; inspect Compose health and logs. Open an SSH tunnel from Windows using the verified key and VM IP:
   ssh -i <private-key-path> -N -L 8084:127.0.0.1:8084 ubuntu@<vm-public-ip>
   -i selects the SSH private key; -N opens no remote shell; -L maps Windows port 8084 to the VM's loopback port 8084. While that command is running, open http://127.0.0.1:8084 on Windows.
8. Test synthetic View/Add/Use/Delete through the tunnel. Restart only the web container and check recovery. Verify a saved item persists through an ordinary Compose restart before deleting the synthetic test item. Record image/version, migration state, resource costs, and observed results.

## Stop condition and cleanup

Stop if the actual cost exceeds the agreed ceiling, SSH access cannot be secured, the VM cannot run the stack reliably, or any secret appears in logs/Git. Keep the website private; the app has no authentication. Do not put meaningful personal inventory data on this lab until access control, HTTPS/public exposure design, and an off-machine backup with tested restore are completed.

After the lab, remove the VM, attached static IP, any snapshots, and unused keys/resources deliberately. Deleting the VM also deletes its local Docker database volume; keep no meaningful data there without a verified backup. Confirm the Lightsail billing/resource inventory after cleanup.

## Observed launch and recovery (2026-11-11)

Allen reports Docker Compose v5.7.0, Windows SSH success, source archive transfer and extraction, VM-only deploy.env mode 600, Compose config --quiet success, healthy db/API/web startup, VM-local /api/ready HTTP 200, and browser use through a private SSH tunnel. The transferred archive SHA-256 matched the Windows copy; Git archive metadata identifies source commit ab5465c. No application registry images were pushed or pulled; API and web images were built on the VM. The synthetic Cloud test item was deleted and confirmed absent after refresh. These are user reports, not independent Codex access to the VM.

The first deployed containers had restart policy no. Local compose.private.yaml was updated to restart: unless-stopped on all three services. Allen staged and checked the new file on the VM, saved the old file as compose.private.yaml.before-restart, applied the new file with Compose up --no-build --detach, and reported three running containers with policy unless-stopped. Ubuntu reported Docker enabled at boot. After a controlled VM reboot, the services appeared running without a manual Compose up, and VM-local /api/ready returned 200. The Windows browser could not connect until Allen reopened the SSH tunnel, which reboot had ended. The database volume was retained. If the VM page returns 200 but the Windows browser cannot connect, check that the SSH tunnel is running before changing containers.

A separate Windows SSH timeout occurred when Allen's home public IPv4 changed while the Lightsail SSH firewall still allowed the earlier /32 address. The VM was Running and retained its public IPv4. Allen updated only the SSH source /32 to his current address while retaining Lightsail browser SSH, then reconnected. Do not publish the website, API, or database ports to work around a tunnel or SSH source issue. The instance's dynamic public IPv4 and current home source IP must be checked when connection symptoms recur.

Remaining Stage 4 checks: confirm exact Lightsail resource name/ID and actual account billing, confirm no extra billable resources or public application ports, and record current deployed Compose revision/image IDs. One Lightsail VM continues to incur charges until deliberately cleaned up. No tested off-machine backup, public authentication, HTTPS, or independent recovery is claimed.