# WatchTower

![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white)
![Prometheus](https://img.shields.io/badge/-Prometheus-E6522C?logo=prometheus&logoColor=white)
![Grafana](https://img.shields.io/badge/-Grafana-F46800?logo=grafana&logoColor=white)
![Docker](https://img.shields.io/badge/-Docker-2496ED?logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)

A self-built observability stack: it generates traffic, watches itself in real time, fires alerts when something breaks, and pings me on Telegram before I'd even notice.

## Why I built this

I wanted to build something outside the usual CRUD-app territory — something that touches the part of software that most junior projects skip: what happens *after* the code ships. Companies like Netflix or Uber run systems like this at massive scale to know the moment something goes wrong. I wanted to understand that world from the inside, even at a small scale.

The Telegram notification piece was completely new to me — I'd never wired up a bot API before, and getting the whole chain to talk to each other (Prometheus → Alertmanager → my backend → Telegram) was the part that taught me the most about how independent systems actually connect and pass data between each other.

I built the whole thing in one long session — around 20 hours, with breaks in between. Most of that time went into the architecture and the alerting logic, not the code itself. Once the design clicked, writing it was the easy part.

## What it does

- **Simulates traffic** to a REST API through a "Chaos Panel" — fire single requests or bursts of 20 to stress-test the system on demand.
- **Collects metrics** in real time: request rate, error rate, and response latency.
- **Evaluates alert rules continuously** and fires them automatically when thresholds are crossed.
- **Sends live Telegram notifications** the moment an alert triggers — no dashboard-refreshing needed.
- **Visualizes everything** in Grafana.

## Architecture

Five containers, each with one job, talking to each other over a private Docker network:

| Service | Tech | Port | Role |
|---|---|---|---|
| Frontend | React + Nginx | 3000 | Chaos Panel — where I trigger traffic |
| Backend | Node.js + Express | 3001 | REST API, exposes `/metrics`, receives the alert webhook |
| Prometheus | v2.50 | 9090 | Scrapes metrics every 15s, evaluates alert rules |
| Alertmanager | v0.27 | 9093 | Routes firing alerts to the backend webhook |
| Grafana | v10.3 | 3003 | Dashboards on top of Prometheus |

**How data flows:** I click a button on the Chaos Panel → the backend handles the request and records it (route, status code, duration) → every 15 seconds Prometheus pulls those metrics → if error rate or latency crosses a threshold, Prometheus fires an alert → Alertmanager processes it and POSTs to my backend's webhook → the backend formats it and sends it straight to my phone via Telegram. Grafana just watches Prometheus independently and draws the graphs.

## Decisions I made (and why)

- **RED method (Rate, Errors, Duration)** for instrumentation — it's the standard way to monitor request-driven services, so I used it instead of inventing my own metrics.
- **Three alerts, not ten.** `HighErrorRate` (>10% of requests returning 5xx for 30s), `HighLatency` (p95 above 1s for 1 minute), and `BackendDown` (scrape target unreachable for 15s). I kept it to three because each one maps to a real failure mode, not because more alerts look more impressive.
- **Multi-stage Docker builds with a non-root user** on both services — small detail, but it's the difference between "it runs" and "it runs the way you'd actually deploy it."
- **GitHub Actions → GHCR** on every push to `main`, so the images build themselves instead of me doing it by hand.

## What's honestly still missing

I'd rather be upfront about this than pretend it's finished:

- Grafana starts with **no pre-built dashboard** — right now you have to build your own panels manually the first time.
- No automated tests yet (the CI pipeline is ready for them, I just haven't written them).
- No auth on the backend endpoints.
- Runs locally via Docker Compose — not deployed anywhere public yet.

These are next on my list, roughly in that order.

## Running it locally

```bash
docker compose up --build
```

| URL | What you'll find |
|---|---|
| `localhost:3000` | Chaos Panel — click around and generate traffic |
| `localhost:3001/metrics` | Raw Prometheus metrics |
| `localhost:9090` | Prometheus — check `Status > Targets` to confirm it's scraping |
| `localhost:9093` | Alertmanager — active alerts show up here |
| `localhost:3003` | Grafana (`admin` / `watchtower`) |

Trigger an alert: hit **"Burst x20 (trigger alert!)"** a few times on the Chaos Panel, then check Alertmanager or your Telegram — `HighErrorRate` should fire within about 30 seconds.

```bash
docker compose down       # stop everything
docker compose down -v    # stop and wipe Prometheus/Grafana data too
```

---

Built by [Victor Cartagena](https://github.com/VictorCa23)
