require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cambiar-esta-password';
const DATA_FILE = path.join(__dirname, 'data', 'calendar.json');

// ─── Rotación base ────────────────────────────────────────────────────────────
const BASE_ROTATION = [
  { name: 'Laura Cadena',    color: '#5B5BD6' },
  { name: 'Joaquín Hurtado', color: '#D97706' },
];
// Primer sábado de la rotación
const START_DATE = new Date('2026-07-25T12:00:00Z');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { overrides: {} };
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { overrides: {} };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Devuelve todos los sábados desde hoy (o desde startYear) hasta fin de endYear
function getSaturdays(startYear, endYear) {
  const saturdays = [];
  const start = new Date(`${startYear}-01-01T12:00:00Z`);
  const end = new Date(`${endYear}-12-31T12:00:00Z`);
  // Avanzar al primer sábado del rango
  const d = new Date(start);
  while (d.getDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  while (d <= end) {
    saturdays.push(new Date(d));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return saturdays;
}

// Calcula la asignación base por rotación para una fecha dada
function getBaseAssignment(date) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = date.getTime() - START_DATE.getTime();
  const weekIndex = Math.round(diff / msPerWeek);
  const idx = ((weekIndex % BASE_ROTATION.length) + BASE_ROTATION.length) % BASE_ROTATION.length;
  return BASE_ROTATION[idx];
}

function dateKey(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Construye la lista completa de sábados con asignaciones (respetando overrides)
function buildCalendar(data) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const saturdays = getSaturdays(currentYear, currentYear + 1);

  return saturdays.map((sat) => {
    const key = dateKey(sat);
    const base = getBaseAssignment(sat);
    const override = data.overrides[key];
    const assigned = override
      ? { ...BASE_ROTATION.find(p => p.name === override) || base, name: override }
      : base;
    return {
      date: key,
      name: assigned.name,
      color: assigned.color || base.color,
      isOverride: !!override,
    };
  });
}

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secreto-por-defecto-cambiar',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }, // 8 horas
}));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de autenticación para rutas admin
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.status(401).json({ error: 'No autorizado' });
}

// ─── API pública (solo lectura) ───────────────────────────────────────────────

app.get('/api/calendar', (req, res) => {
  const data = loadData();
  const entries = buildCalendar(data);
  const now = new Date();

  // Próximo sábado (hoy inclusive si es sábado)
  let nextEntry = null;
  for (const entry of entries) {
    const sat = new Date(entry.date + 'T12:00:00Z');
    if (sat >= now) { nextEntry = entry; break; }
  }

  // Días que faltan para el próximo sábado
  let daysUntil = null;
  if (nextEntry) {
    const sat = new Date(nextEntry.date + 'T12:00:00Z');
    const todayMidnight = new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z');
    const satMidnight  = new Date(nextEntry.date + 'T00:00:00Z');
    daysUntil = Math.round((satMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
  }

  res.json({ entries, nextEntry, daysUntil, people: BASE_ROTATION });
});

// ─── API admin (protegida) ────────────────────────────────────────────────────

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Contraseña incorrecta' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/admin/status', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

// Guardar un override (asignación manual para una fecha)
app.post('/api/admin/override', requireAuth, (req, res) => {
  const { date, name } = req.body;
  if (!date || !name) return res.status(400).json({ error: 'Faltan campos' });
  if (!BASE_ROTATION.find(p => p.name === name)) {
    return res.status(400).json({ error: 'Nombre no válido' });
  }
  const data = loadData();
  data.overrides[date] = name;
  saveData(data);
  res.json({ ok: true });
});

// Eliminar un override (volver a la rotación base)
app.delete('/api/admin/override/:date', requireAuth, (req, res) => {
  const { date } = req.params;
  const data = loadData();
  delete data.overrides[date];
  saveData(data);
  res.json({ ok: true });
});

// ─── Rutas HTML ───────────────────────────────────────────────────────────────

// /admin sirve la página de administración
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ─── Inicio ───────────────────────────────────────────────────────────────────

// Asegurar que existe el directorio de datos
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DATA_FILE)) {
  saveData({ overrides: {} });
}

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Admin en http://localhost:${PORT}/admin`);
});
