const { Pool } = require("pg");
const path = require("path");

let pool;

// Detectar si estamos en Render (producción) o local (desarrollo)
if (process.env.DATABASE_URL) {
  // ============================================
  // MODO PRODUCCIÓN - PostgreSQL en Render
  // ============================================
  console.log("🚀 ===== MODO PRODUCCIÓN: PostgreSQL ====");
  console.log(
    "📌 DATABASE_URL encontrada:",
    process.env.DATABASE_URL ? "SÍ" : "NO",
  );

  // Mostrar información de la URL (ocultando contraseña)
  try {
    const urlParts = process.env.DATABASE_URL.split("@");
    if (urlParts.length > 1) {
      const hostPort = urlParts[1].split("/")[0];
      console.log("📌 Host:", hostPort);
      console.log(
        "📌 Base de datos:",
        urlParts[1].split("/")[1]?.split("?")[0] || "unknown",
      );
    } else {
      console.log("📌 URL format: unknown");
    }
  } catch (e) {
    console.log("📌 No se pudo parsear la URL");
  }

  try {
    // Limpiar la URL de posibles parámetros SSL conflictivos
    const cleanUrl = process.env.DATABASE_URL.split("?")[0];
    console.log("📌 Usando URL limpia (sin parámetros)");

    // Configurar el pool de conexiones
    pool = new Pool({
      connectionString: cleanUrl,
      ssl: {
        rejectUnauthorized: false, // Necesario para certificados de Render
      },
      // Timeouts generosos para evitar desconexiones prematuras
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000, // 15 segundos para conectar
    });

    console.log("✅ Pool de conexiones creado");
    console.log("⏳ Probando conexión a PostgreSQL...");

    // Probar la conexión inmediatamente
    pool.connect((err, client, release) => {
      if (err) {
        console.error("❌ ERROR CONECTANDO A POSTGRESQL:");
        console.error("   Código:", err.code);
        console.error("   Mensaje:", err.message);
        console.error("   Stack:", err.stack);

        // Intentar con configuración alternativa
        console.log("🔄 Intentando con configuración alternativa SSL...");

        // Segundo intento con SSL diferente
        const pool2 = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: true,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 15000,
        });

        pool2.connect((err2, client2, release2) => {
          if (err2) {
            console.error("❌ También falló el segundo intento:", err2.message);
          } else {
            console.log("✅ Segundo intento EXITOSO");
            pool = pool2;
            release2();
          }
        });
      } else {
        console.log("✅ CONEXIÓN EXITOSA a PostgreSQL");

        // Verificar versión
        client.query("SELECT version()", (err, res) => {
          if (err) {
            console.log("⚠️ No se pudo obtener versión:", err.message);
          } else {
            console.log(
              "📊 Versión PostgreSQL:",
              res.rows[0].version.substring(0, 60) + "...",
            );
          }
        });

        // Verificar tablas existentes
        client.query(
          `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `,
          (err, res) => {
            if (err) {
              console.log("⚠️ No se pudo listar tablas:", err.message);
            } else {
              const tablas = res.rows.map((r) => r.table_name).join(", ");
              console.log("📋 Tablas existentes:", tablas || "ninguna");
            }
          },
        );

        release();
      }
    });

    // Función para crear tablas si no existen
    const crearTablas = async () => {
      console.log("📦 Creando/verificando tablas en PostgreSQL...");

      try {
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

        console.log("🎉 ¡TODAS LAS TABLAS VERIFICADAS CORRECTAMENTE!");

        // Contar registros existentes
        try {
          const result = await pool.query("SELECT COUNT(*) FROM jugadores");
          console.log(`📊 Total jugadores en BD: ${result.rows[0].count}`);
        } catch (err) {
          console.log("ℹ️ Tabla jugadores vacía o sin datos");
        }
      } catch (err) {
        console.error("❌ ERROR CREANDO TABLAS:");
        console.error("   Mensaje:", err.message);
        console.error("   Código:", err.code);
        console.error("   Stack:", err.stack);
        throw err;
      }
    };

    // Ejecutar creación de tablas
    crearTablas().catch((err) => {
      console.error("❌ ERROR FATAL: No se pudieron crear las tablas");
      console.error("   La aplicación continuará pero puede tener problemas");
    });
  } catch (err) {
    console.error("❌ ERROR CRÍTICO CONFIGURANDO POSTGRESQL:");
    console.error("   Mensaje:", err.message);
    console.error("   Stack:", err.stack);

    // Crear un pool ficticio para que la app no explote
    pool = {
      query: async () => {
        console.error("⚠️ Intentando consultar sin conexión a BD");
        return { rows: [], rowCount: 0 };
      },
    };
  }
} else {
  // ============================================
  // MODO DESARROLLO - SQLite local
  // ============================================
  console.log("💻 ===== MODO DESARROLLO: SQLite =====");
  console.log("📌 DATABASE_URL no encontrada, usando SQLite local");

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

    // Contar registros
    sqliteDb.get("SELECT COUNT(*) as count FROM jugadores", (err, row) => {
      if (err) {
        console.log("ℹ️ No se pudo contar jugadores");
      } else {
        console.log(`📊 Total jugadores locales: ${row.count}`);
      }
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
    console.error("❌ ERROR CONFIGURANDO SQLITE:");
    console.error("   Mensaje:", err.message);
    console.error("   Stack:", err.stack);

    // Crear un pool ficticio
    pool = {
      query: async () => {
        console.error("⚠️ SQLite no disponible");
        return { rows: [], rowCount: 0 };
      },
    };
  }
}

// Exportar la función query
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool, // Exportar el pool también
};
