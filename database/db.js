const { Pool } = require("pg");
const path = require("path");

let pool;

// Detectar si estamos en Render (producción) o local (desarrollo)
if (process.env.DATABASE_URL) {
  // ============================================
  // MODO PRODUCCIÓN - PostgreSQL en Render
  // ============================================
  console.log("🚀 Modo producción: Conectando a PostgreSQL...");
  console.log(
    "📌 DATABASE_URL encontrada:",
    process.env.DATABASE_URL ? "SÍ" : "NO",
  );
  console.log(
    "📌 Host:",
    process.env.DATABASE_URL.split("@")[1]?.split("/")[0] || "desconocido",
  );

  try {
    // Configurar el pool de conexiones
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Necesario para Render
      },
      // Timeouts para evitar desconexiones
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Aumentado a 10 segundos
    });

    console.log("✅ Pool de conexiones creado");

    // Probar la conexión inmediatamente
    pool.connect((err, client, release) => {
      if (err) {
        console.error("❌ Error conectando a PostgreSQL:");
        console.error("   Mensaje:", err.message);
        console.error("   Código:", err.code);
        console.error("   Stack:", err.stack);
      } else {
        console.log("✅ Conectado a PostgreSQL exitosamente");

        // Verificar versión
        client.query("SELECT version()", (err, res) => {
          if (err) {
            console.error("❌ Error consultando versión:", err.message);
          } else {
            console.log(
              "📊 Versión PostgreSQL:",
              res.rows[0].version.substring(0, 50) + "...",
            );
          }
        });

        release();
      }
    });

    // Función para crear tablas si no existen
    const crearTablas = async () => {
      try {
        console.log("📦 Creando/verificando tablas en PostgreSQL...");

        // Tabla jugadores
        console.log("   → Creando tabla jugadores...");
        await pool.query(`
          CREATE TABLE IF NOT EXISTS jugadores (
            id SERIAL PRIMARY KEY,
            nombre TEXT UNIQUE NOT NULL,
            saldo_total DECIMAL(10,2) DEFAULT 0,
            activo INTEGER DEFAULT 1
          );
        `);
        console.log("   ✅ Tabla jugadores lista");

        // Tabla rondas
        console.log("   → Creando tabla rondas...");
        await pool.query(`
          CREATE TABLE IF NOT EXISTS rondas (
            id SERIAL PRIMARY KEY,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            estado TEXT DEFAULT 'activa',
            total_apuestas DECIMAL(10,2) DEFAULT 0
          );
        `);
        console.log("   ✅ Tabla rondas lista");

        // Tabla equipos_ronda
        console.log("   → Creando tabla equipos_ronda...");
        await pool.query(`
          CREATE TABLE IF NOT EXISTS equipos_ronda (
            id SERIAL PRIMARY KEY,
            ronda_id INTEGER REFERENCES rondas(id) ON DELETE CASCADE,
            nombre_equipo TEXT
          );
        `);
        console.log("   ✅ Tabla equipos_ronda lista");

        // Tabla apuestas_ronda
        console.log("   → Creando tabla apuestas_ronda...");
        await pool.query(`
          CREATE TABLE IF NOT EXISTS apuestas_ronda (
            id SERIAL PRIMARY KEY,
            ronda_id INTEGER REFERENCES rondas(id) ON DELETE CASCADE,
            equipo_id INTEGER REFERENCES equipos_ronda(id) ON DELETE CASCADE,
            jugador_id INTEGER REFERENCES jugadores(id) ON DELETE CASCADE,
            monto_apuesta DECIMAL(10,2) DEFAULT 0
          );
        `);
        console.log("   ✅ Tabla apuestas_ronda lista");

        // Tabla enfrentamientos
        console.log("   → Creando tabla enfrentamientos...");
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
        console.log("   ✅ Tabla enfrentamientos lista");

        console.log(
          "🎉 ¡Todas las tablas creadas/verificadas correctamente en PostgreSQL!",
        );

        // Verificar que las tablas tienen datos (opcional)
        try {
          const result = await pool.query("SELECT COUNT(*) FROM jugadores");
          console.log(`📊 Total jugadores en BD: ${result.rows[0].count}`);
        } catch (err) {
          console.log(
            "⚠️ No se pudo contar jugadores (tabla vacía o error):",
            err.message,
          );
        }
      } catch (err) {
        console.error("❌ Error crítico creando tablas:");
        console.error("   Mensaje:", err.message);
        console.error("   Código:", err.code);
        console.error("   Stack:", err.stack);
        throw err; // Re-lanzar para que se detenga la aplicación
      }
    };

    // Ejecutar creación de tablas (sin await aquí para no bloquear)
    crearTablas().catch((err) => {
      console.error(
        "❌ Fallo fatal en migración de tablas. La aplicación no puede continuar.",
      );
      process.exit(1);
    });
  } catch (err) {
    console.error("❌ Error crítico configurando PostgreSQL:");
    console.error("   Mensaje:", err.message);
    console.error("   Stack:", err.stack);
    process.exit(1);
  }
} else {
  // ============================================
  // MODO DESARROLLO - SQLite local
  // ============================================
  console.log("💻 Modo desarrollo: Usando SQLite local");
  console.log("📌 DATABASE_URL no encontrada, usando base de datos local");

  try {
    const sqlite3 = require("sqlite3");
    const dbPath = path.join(__dirname, "apuestas.db");
    console.log("📁 Ruta SQLite:", dbPath);

    const sqliteDb = new sqlite3.Database(dbPath);
    console.log("✅ Archivo SQLite abierto/creado");

    // Crear tablas en SQLite si no existen
    sqliteDb.serialize(() => {
      console.log("📦 Creando/verificando tablas en SQLite...");

      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS jugadores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT UNIQUE,
          saldo_total REAL DEFAULT 0,
          activo INTEGER DEFAULT 1
        )
      `);
      console.log("   ✅ Tabla jugadores lista");

      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS rondas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          estado TEXT DEFAULT 'activa',
          total_apuestas REAL DEFAULT 0
        )
      `);
      console.log("   ✅ Tabla rondas lista");

      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS equipos_ronda (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ronda_id INTEGER,
          nombre_equipo TEXT,
          FOREIGN KEY (ronda_id) REFERENCES rondas(id) ON DELETE CASCADE
        )
      `);
      console.log("   ✅ Tabla equipos_ronda lista");

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
      console.log("   ✅ Tabla apuestas_ronda lista");

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
      console.log("   ✅ Tabla enfrentamientos lista");

      console.log("🎉 Todas las tablas SQLite verificadas");
    });

    // Adaptador para que SQLite tenga la misma interfaz que PostgreSQL
    pool = {
      query: (text, params) => {
        return new Promise((resolve, reject) => {
          try {
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
          } catch (err) {
            reject(err);
          }
        });
      },
    };

    console.log("✅ Adaptador SQLite listo para usar");
  } catch (err) {
    console.error("❌ Error configurando SQLite:");
    console.error("   Mensaje:", err.message);
    console.error("   Stack:", err.stack);
    process.exit(1);
  }
}

// Exportar la función query (funciona igual en producción y desarrollo)
module.exports = {
  query: (text, params) => pool.query(text, params),
};
