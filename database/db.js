const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "apuestas.db");
const db = new sqlite3.Database(dbPath);

console.log("📁 BD en:", dbPath);

db.serialize(() => {
  // Tabla de jugadores (SIN nivel)
  db.run(`
    CREATE TABLE IF NOT EXISTS jugadores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE,
      saldo_total REAL DEFAULT 0,
      activo INTEGER DEFAULT 1
    )
  `);

  // Tabla para rondas/partidos
  db.run(`
    CREATE TABLE IF NOT EXISTS rondas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      estado TEXT DEFAULT 'activa',
      total_apuestas REAL DEFAULT 0
    )
  `);

  // Tabla para equipos de cada ronda
  db.run(`
    CREATE TABLE IF NOT EXISTS equipos_ronda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ronda_id INTEGER,
      nombre_equipo TEXT,
      FOREIGN KEY (ronda_id) REFERENCES rondas(id) ON DELETE CASCADE
    )
  `);

  // Tabla para apuestas de cada jugador en cada ronda
  db.run(`
    CREATE TABLE IF NOT EXISTS apuestas_ronda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ronda_id INTEGER,
      equipo_id INTEGER,
      jugador_id INTEGER,
      monto_apuesta REAL DEFAULT 0,
      FOREIGN KEY (ronda_id) REFERENCES rondas(id) ON DELETE CASCADE,
      FOREIGN KEY (equipo_id) REFERENCES equipos_ronda(id) ON DELETE CASCADE,
      FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE
    )
  `);

  // Tabla para enfrentamientos 1 a 1
  db.run(`
    CREATE TABLE IF NOT EXISTS enfrentamientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ronda_id INTEGER,
      jugador_equipoA_id INTEGER,
      jugador_equipoB_id INTEGER,
      monto_enfrentamiento REAL,
      ganador_id INTEGER,
      FOREIGN KEY (ronda_id) REFERENCES rondas(id) ON DELETE CASCADE,
      FOREIGN KEY (jugador_equipoA_id) REFERENCES apuestas_ronda(id),
      FOREIGN KEY (jugador_equipoB_id) REFERENCES apuestas_ronda(id),
      FOREIGN KEY (ganador_id) REFERENCES apuestas_ronda(id)
    )
  `);

  console.log("✅ Tablas creadas/verificadas");
});

module.exports = db;
