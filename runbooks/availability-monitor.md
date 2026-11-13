# VM-local availability monitor

## Purpose

Once a minute, the Lightsail VM requests `http://127.0.0.1:8084/api/items` through the private web port. HTTP 200 means the web proxy, API route, and item query answered this one request. The check changes no inventory data. It records the HTTP status, curl exit code on failures, and elapsed seconds in the system journal. The third consecutive failed check writes an `ALERT` marker; a later success writes `RECOVERED`.

This is a local monitor, not a notification to Allen. If the VM is off, its timer cannot run. It also cannot prove the browser or SSH tunnel works from Allen's computer. An independent, authorized external check and a notification destination are later work.

## Files and installation

- `ops/check-availability.sh` is the checker. Its exact success rule is HTTP 200.
- `ops/devops-home-inventory-monitor.service` runs the checker as the `ubuntu` user and gives it a state directory for the consecutive-failure count.
- `ops/devops-home-inventory-monitor.timer` runs the service approximately once a minute after boot.
- The VM has the script at `/usr/local/bin/devops-home-inventory-monitor` and the units at `/etc/systemd/system/`. No app container or database configuration was changed.

## Inspect

On the Lightsail VM:

```bash
systemctl list-timers devops-home-inventory-monitor.timer --no-pager
sudo journalctl -u devops-home-inventory-monitor.service --since '10 minutes ago' --no-pager
sudo cat /var/lib/devops-home-inventory-monitor/consecutive-failures
```

The last command shows `0` after a successful check. A nonzero number counts consecutive failures. Investigate `ALERT`, `FAIL`, or missing scheduled runs by checking the web/API/database Compose status and logs, then the VM's Docker service and network. Confirm `/api/items` and a real browser workflow after recovery.

## Intentional shutdown

If the private lab is deliberately stopped, pause this timer first to avoid expected failure records:

```bash
sudo systemctl disable --now devops-home-inventory-monitor.timer
```

To resume checks after the app is running:

```bash
sudo systemctl enable --now devops-home-inventory-monitor.timer
```

These commands change the monitor timer only; they do not start or stop the inventory app.

## Verification and limits

On 2026-11-13, the staged script passed `bash -n` on the VM. With a separate temporary state directory and an unused port, three checks logged `FAIL`, `FAIL`, `ALERT` with HTTP 000 and curl exit 7. A following request to the real app logged `RECOVERED` with HTTP 200. The temporary state directory was removed. `systemd-analyze verify` passed, the timer became active, and a manual service run logged `OK status=200`. The first automatic timer firing then logged a second `OK status=200`, and the live failure counter was `0`. The VM-local `/api/items` route still returned 200. The week-long 99% target is not yet measured. No live app fault was injected.
