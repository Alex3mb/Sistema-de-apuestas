const { Pool } = require("pg");
const path = require("path");

let pool;

// Detectar si estamos en Render (producción) o local (desarrollo)
if (process.env.DATABASE_URL) {
  // ============================================
  // MODO PRODUCCIÓN - PostgreSQL en Render
  // ============================================
  console.log("🚀 Modo producción: Conectando a PostgreSQL...");

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Necesario para Render
    },
    // Timeouts para evitar desconexiones
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Probar la conexión
  pool.connect((err, client, release) => {
    if (err) {
      console.error("❌ Error conectando a PostgreSQL:", err.message);
    } else {
      console.log("✅ Conectado a PostgreSQL exitosamente");
      release();
    }
  });

  // Función para crear tablas si no existen
  const crearTablas = async () => {
    try {
      // Tabla jugadores
      await pool.query(`
        CREATE TABLE IF NOT EXISTS jugadores (
          id SERIAL PRIMARY KEY,
          nombre TEXT UNIQUE NOT NULL,
          saldo_total DECIMAL(10,2) DEFAULT 0,
          activo INTEGER DEFAULT 1
        );
      `);

      // Tabla rondas
      await pool.query(`
        CREATE TABLE IF NOT EXISTS rondas (
          id SERIAL PRIMARY KEY,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          estado TEXT DEFAULT 'activa',
          total_apuestas DECIMAL(10,2) DEFAULT 0
        );
      `);

      // Tabla equipos_ronda
      await pool.query(`
        CREATE TABLE IF NOT EXISTS equipos_ronda (
          id SERIAL PRIMARY KEY,
          ronda_id INTEGER REFERENCES rondas(id) ON DELETE CASCADE,
          nombre_equipo TEXT
        );
      `);

      // Tabla apuestas_ronda
      await pool.query(`
        CREATE TABLE IF NOT EXISTS apuestas_ronda (
          id SERIAL PRIMARY KEY,
          ronda_id INTEGER REFERENCES rondas(id) ON DELETE CASCADE,
          equipo_id INTEGER REFERENCES equipos_ronda(id) ON DELETE CASCADE,
          jugador_id INTEGER REFERENCES jugadores(id) ON DELETE CASCADE,
          monto_apuesta DECIMAL(10,2) DEFAULT 0
        );
      `);

      // Tabla enfrentamientos
      await pool.query(`
        CREATE TABLE IF NOT EXISTS enfrentamientos (
          id SERIAL PRIMARY KEY,
          ronda_id INTEGER REFERENCES rondas(id) ON DELETE CASCADE,
          jugador_equipoA_id INTEGER REFERENCES apuestas_ronda(id),
          jugador_equipoB_id INTEGER REFERENCES apuestas_ronda(id),
          monto_enfrentamiento DECIMAL(10,2),
          ganador_id INTEGER REFERENCES apuestas_ronda(id)
        );
      `);

      console.log("✅ Tablas verificadas/creadas en PostgreSQL");
    } catch (err) {
      console.error("❌ Error creando tablas:", err.message);
    }
  };

  // Ejecutar creación de tablas
  crearTablas();
} else {
  // ============================================
  // MODO DESARROLLO - SQLite local
  // ============================================
  console.log("💻 Modo desarrollo: Usando SQLite local");

  const sqlite3 = require("sqlite3");
  const dbPath = path.join(__dirname, "apuestas.db");
  const sqliteDb = new sqlite3.Database(dbPath);

  // Crear tablas en SQLite si no existen
  sqliteDb.serialize(() => {
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS jugadores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE,
        saldo_total REAL DEFAULT 0,
        activo INTEGER DEFAULT 1
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS rondas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        estado TEXT DEFAULT 'activa',
        total_apuestas REAL DEFAULT 0
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS equipos_ronda (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ronda_id INTEGER,
        nombre_equipo TEXT,
        FOREIGN KEY (ronda_id) REFERENCES rondas(id) ON DELETE CASCADE
      )
    `);

    sqliteDb.run(`
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

    sqliteDb.run(`
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

    console.log("✅ Tablas SQLite verificadas");
  });

  // Adaptador para que SQLite tenga la misma interfaz que PostgreSQL
  pool = {
    query: (text, params) => {
      return new Promise((resolve, reject) => {
        // Determinar si es SELECT o INSERT/UPDATE/DELETE
        const method = text.trim().toUpperCase().startsWith("SELECT")
          ? "all"
          : "run";

        sqliteDb[method](text, params, function (err, rows) {
          if (err) reject(err);
          else {
            // Adaptar la respuesta para que sea como PostgreSQL
            resolve({
              rows: rows || [],
              rowCount: rows?.length || 0,
              rowsAffected: this?.changes || 0,
            });
          }
        });
      });
    },
  };
}

// Exportar la función query (funciona igual en producción y desarrollo)
module.exports = {
  query: (text, params) => pool.query(text, params),
};
