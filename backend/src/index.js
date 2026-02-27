const express = require("express");
const cors = require("cors");
const client = require("prom-client");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 3001;

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "8633352089:AAH0sbfJr9iiJJCHuMZCLmLSpH4i-xj99rg";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "1595766651";

app.use(cors());
app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const labels = { method: req.method, route: req.route?.path ?? req.path, status_code: res.statusCode };
    httpRequestCounter.inc(labels);
    end(labels);
  });
  next();
});

function sendTelegram(message) {
  const text = encodeURIComponent(message);
  const path = `/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${text}&parse_mode=HTML`;
  const options = { hostname: "api.telegram.org", port: 443, path, method: "GET" };
  const req = https.request(options, (res) => {
    console.log(`Telegram response: ${res.statusCode}`);
  });
  req.on("error", (e) => console.error("Telegram error:", e.message));
  req.end();
}

app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/api/success", (req, res) => {
  res.status(200).json({ status: "ok", message: "Request processed successfully." });
});

app.get("/api/error", (req, res) => {
  res.status(500).json({ status: "error", message: "Simulated internal server error." });
});

app.get("/api/slow", async (req, res) => {
  const delay = parseInt(req.query.ms ?? "2000", 10);
  await new Promise((resolve) => setTimeout(resolve, delay));
  res.status(200).json({ status: "ok", message: `Responded after ${delay}ms delay.` });
});

app.post("/webhook-alerts", (req, res) => {
  const payload = req.body;
  const alerts = payload?.alerts ?? [];

  alerts.forEach((alert) => {
    const status = alert.status === "firing" ? "FIRING" : "RESOLVED";
    const emoji = alert.status === "firing" ? "🚨" : "✅";
    const severity = alert.labels?.severity ?? "unknown";
    const alertname = alert.labels?.alertname ?? "Unknown";
    const summary = alert.annotations?.summary ?? "";
    const description = alert.annotations?.description ?? "";
    const time = new Date().toLocaleString("es-ES", { timeZone: "America/Bogota" });

    const logEntry = { level: status, alertname, severity, summary };
    console.log(JSON.stringify(logEntry));

    const message =
      `${emoji} <b>WatchTower Alert — ${status}</b>\n\n` +
      `📛 <b>Alerta:</b> ${alertname}\n` +
      `⚠️ <b>Severidad:</b> ${severity}\n` +
      `📝 <b>Resumen:</b> ${summary}\n` +
      `🔍 <b>Detalle:</b> ${description}\n` +
      `⏰ <b>Hora:</b> ${time}`;

    sendTelegram(message);
  });

  res.status(200).json({ received: alerts.length });
});

app.get("/health", (req, res) => res.json({ status: "healthy" }));

app.get("/test-telegram", (req, res) => {
  sendTelegram(
    "🧪 <b>WatchTower Test</b>\n\n" +
    "✅ Conexion con Telegram funcionando correctamente.\n" +
    "🗼 Tu sistema de alertas esta activo y listo."
  );
  res.json({ sent: true, message: "Mensaje de prueba enviado a Telegram" });
});

app.listen(PORT, () => {
  console.log(`WatchTower backend running on http://localhost:${PORT}`);
  sendTelegram("🗼 <b>WatchTower iniciado</b>\n\nEl sistema de observabilidad esta en linea y monitoreando.");
});