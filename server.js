const express = require("express");
const path = require("path");
const db = require("./database/db");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde public/
app.use(express.static(path.join(__dirname, "public")));

// ============================================
// RUTAS DE JUGADORES - POSTGRESQL
// ============================================

// Registrar jugador - POSTGRESQL
app.post("/jugador", async (req, res) => {
  const { nombre } = req.body;
  console.log("📥 POST /jugador - Nombre:", nombre);

  if (!nombre) return res.status(400).json({ error: "Faltan datos" });

  try {
    const result = await db.query(
      "INSERT INTO jugadores (nombre, saldo_total, activo) VALUES ($1, $2, $3) RETURNING id",
      [nombre, 0, 1],
    );

    console.log(`✅ Jugador registrado con ID: ${result.rows[0].id}`);
    res.json({
      mensaje: "Jugador registrado correctamente",
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error("❌ Error registrando jugador:", error);

    if (error.code === "23505") {
      return res.status(400).json({ error: "El jugador ya existe" });
    }

    res.status(400).json({ error: "Error al registrar jugador" });
  }
});

// Ver jugadores - POSTGRESQL
app.get("/jugadores", async (req, res) => {
  console.log("📥 GET /jugadores - Solicitado");

  try {
    const result = await db.query(
      "SELECT id, nombre, saldo_total, activo FROM jugadores ORDER BY activo DESC, nombre",
    );

    console.log(`✅ Enviados ${result.rows.length} jugadores`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en /jugadores:", error);
    res.status(500).json({
      error: "Error al obtener jugadores",
      detalle: error.message,
    });
  }
});

// Modificar jugador - POSTGRESQL
app.post("/jugador/modificar", async (req, res) => {
  const { id, nombre, saldo, activo } = req.body;
  console.log("📥 POST /jugador/modificar - ID:", id);

  if (!id) return res.status(400).json({ error: "ID requerido" });

  try {
    let updates = [];
    let params = [];
    let paramIndex = 1;

    if (nombre !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      params.push(nombre);
    }
    if (saldo !== undefined) {
      updates.push(`saldo_total = $${paramIndex++}`);
      params.push(saldo);
    }
    if (activo !== undefined) {
      updates.push(`activo = $${paramIndex++}`);
      params.push(activo);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No hay datos para modificar" });
    }

    params.push(id);
    const query = `UPDATE jugadores SET ${updates.join(", ")} WHERE id = $${paramIndex}`;

    const result = await db.query(query, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Jugador no encontrado" });
    }

    res.json({ mensaje: "Jugador modificado correctamente" });
  } catch (error) {
    console.error("❌ Error modificando jugador:", error);

    if (error.code === "23505") {
      return res.status(400).json({ error: "Ese nombre ya está en uso" });
    }

    res.status(400).json({ error: "Error al modificar jugador" });
  }
});

// Eliminar jugador - POSTGRESQL
app.delete("/jugador/eliminar/:id", async (req, res) => {
  const id = req.params.id;
  console.log("📥 DELETE /jugador/eliminar - ID:", id);

  if (!id) return res.status(400).json({ error: "ID inválido" });

  try {
    const result = await db.query("DELETE FROM jugadores WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Jugador no encontrado" });
    }

    res.json({ mensaje: "Jugador eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error eliminando jugador:", error);
    res.status(500).json({ error: "Error al eliminar jugador" });
  }
});

// Actualizar saldo (sistema anterior) - POSTGRESQL
app.post("/resultado", async (req, res) => {
  const { jugador_id, cambio } = req.body;
  console.log("📥 POST /resultado - Jugador:", jugador_id, "Cambio:", cambio);

  if (!jugador_id || cambio === undefined) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    await db.query(
      "UPDATE jugadores SET saldo_total = saldo_total + $1 WHERE id = $2",
      [cambio, jugador_id],
    );

    res.json({ mensaje: "Saldo actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error actualizando saldo:", error);
    res.status(500).json({ error: "Error al actualizar saldo" });
  }
});

// ============================================
// RUTAS PARA EL SISTEMA 5 VS 5 - POSTGRESQL
// ============================================

// Crear una nueva ronda con equipos - POSTGRESQL
app.post("/api/ronda/nueva", async (req, res) => {
  const { equipoA, equipoB } = req.body;
  console.log(
    "📥 POST /api/ronda/nueva - Equipo A:",
    equipoA?.length,
    "Equipo B:",
    equipoB?.length,
  );

  if (!equipoA || !equipoB || equipoA.length === 0 || equipoB.length === 0) {
    return res
      .status(400)
      .json({ error: "Se requieren ambos equipos con jugadores" });
  }

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Crear la ronda
    const rondaResult = await client.query(
      "INSERT INTO rondas (estado) VALUES ('activa') RETURNING id",
    );
    const rondaId = rondaResult.rows[0].id;
    console.log(`✅ Ronda creada ID: ${rondaId}`);

    // 2. Crear equipo A
    const equipoAResult = await client.query(
      "INSERT INTO equipos_ronda (ronda_id, nombre_equipo) VALUES ($1, 'A') RETURNING id",
      [rondaId],
    );
    const equipoAId = equipoAResult.rows[0].id;

    // 3. Crear equipo B
    const equipoBResult = await client.query(
      "INSERT INTO equipos_ronda (ronda_id, nombre_equipo) VALUES ($1, 'B') RETURNING id",
      [rondaId],
    );
    const equipoBId = equipoBResult.rows[0].id;

    // 4. Insertar apuestas del equipo A
    for (const j of equipoA) {
      await client.query(
        "INSERT INTO apuestas_ronda (ronda_id, equipo_id, jugador_id, monto_apuesta) VALUES ($1, $2, $3, $4)",
        [rondaId, equipoAId, j.jugador_id, j.apuesta || 0],
      );
    }

    // 5. Insertar apuestas del equipo B
    for (const j of equipoB) {
      await client.query(
        "INSERT INTO apuestas_ronda (ronda_id, equipo_id, jugador_id, monto_apuesta) VALUES ($1, $2, $3, $4)",
        [rondaId, equipoBId, j.jugador_id, j.apuesta || 0],
      );
    }

    await client.query("COMMIT");

    res.json({
      rondaId,
      equipoAId,
      equipoBId,
      mensaje: "Ronda creada exitosamente",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error creando ronda:", error);
    res
      .status(500)
      .json({ error: "Error al crear ronda", detalle: error.message });
  } finally {
    client.release();
  }
});

// Obtener detalles de una ronda - POSTGRESQL
// Obtener detalles de una ronda - VERSIÓN CORREGIDA
app.get("/api/ronda/:id", async (req, res) => {
  const rondaId = req.params.id;
  console.log(`📥 GET /api/ronda/${rondaId} - Solicitado`);

  try {
    // Obtener ronda
    const rondaResult = await db.query("SELECT * FROM rondas WHERE id = $1", [
      rondaId,
    ]);

    if (rondaResult.rows.length === 0) {
      return res.status(404).json({ error: "Ronda no encontrada" });
    }

    const ronda = rondaResult.rows[0];

    // Obtener equipos
    const equiposResult = await db.query(
      "SELECT * FROM equipos_ronda WHERE ronda_id = $1",
      [rondaId],
    );

    // Obtener apuestas con todos los detalles
    const apuestasResult = await db.query(
      `
      SELECT ar.*, j.nombre as jugador_nombre, e.nombre_equipo
      FROM apuestas_ronda ar
      JOIN jugadores j ON ar.jugador_id = j.id
      JOIN equipos_ronda e ON ar.equipo_id = e.id
      WHERE ar.ronda_id = $1
      ORDER BY ar.id ASC
      `,
      [rondaId],
    );

    // Obtener enfrentamientos con todos los detalles
    const enfrentamientosResult = await db.query(
      `
      SELECT 
        e.id,
        e.ronda_id,
        e.monto_enfrentamiento,
        e.ganador_id,
        a1.id as apuestaA_id,
        a1.jugador_id as jugadorA_id,
        j1.nombre as nombre_jugadorA,
        a1.monto_apuesta as monto_jugadorA,
        a2.id as apuestaB_id,
        a2.jugador_id as jugadorB_id,
        j2.nombre as nombre_jugadorB,
        a2.monto_apuesta as monto_jugadorB,
        jg.nombre as nombre_ganador
      FROM enfrentamientos e
      LEFT JOIN apuestas_ronda a1 ON e.jugador_equipoA_id = a1.id
      LEFT JOIN apuestas_ronda a2 ON e.jugador_equipoB_id = a2.id
      LEFT JOIN jugadores j1 ON a1.jugador_id = j1.id
      LEFT JOIN jugadores j2 ON a2.jugador_id = j2.id
      LEFT JOIN apuestas_ronda ag ON e.ganador_id = ag.id
      LEFT JOIN jugadores jg ON ag.jugador_id = jg.id
      WHERE e.ronda_id = $1
      ORDER BY e.id ASC
      `,
      [rondaId],
    );

    console.log(
      `📊 Ronda ${rondaId}: ${apuestasResult.rows.length} apuestas, ${enfrentamientosResult.rows.length} enfrentamientos`,
    );

    res.json({
      ronda,
      equipos: equiposResult.rows,
      apuestas: apuestasResult.rows,
      enfrentamientos: enfrentamientosResult.rows,
    });
  } catch (error) {
    console.error("❌ Error en /api/ronda/:id:", error);
    res
      .status(500)
      .json({ error: "Error al obtener ronda", detalle: error.message });
  }
});

// Crear enfrentamientos - POSTGRESQL
// Crear enfrentamientos - POSTGRESQL
// Crear enfrentamientos - versión con búsqueda de IDs de apuestas
// Crear enfrentamientos - versión con búsqueda de IDs de apuestas
// Crear enfrentamientos - VERSIÓN CORREGIDA
// Crear enfrentamientos - VERSIÓN ULTRA CORREGIDA
app.post("/api/ronda/enfrentar", async (req, res) => {
  const { rondaId, emparejamientos } = req.body;
  console.log("🔴🔴🔴 POST /api/ronda/enfrentar 🔴🔴🔴");
  console.log(`📥 Ronda ID: ${rondaId}`);
  console.log(
    `📥 Emparejamientos recibidos:`,
    JSON.stringify(emparejamientos, null, 2),
  );

  if (!rondaId || !emparejamientos || emparejamientos.length === 0) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    for (const e of emparejamientos) {
      // Verificar que los IDs sean válidos
      if (!e.jugadorA_id || !e.jugadorB_id) {
        console.error("❌ IDs inválidos:", e);
        throw new Error(
          `IDs inválidos: jugadorA_id=${e.jugadorA_id}, jugadorB_id=${e.jugadorB_id}`,
        );
      }

      // Verificar que los IDs existan en apuestas_ronda
      const checkA = await client.query(
        "SELECT id FROM apuestas_ronda WHERE id = $1 AND ronda_id = $2",
        [e.jugadorA_id, rondaId],
      );
      if (checkA.rows.length === 0) {
        throw new Error(
          `La apuesta ${e.jugadorA_id} no existe en la ronda ${rondaId}`,
        );
      }

      const checkB = await client.query(
        "SELECT id FROM apuestas_ronda WHERE id = $1 AND ronda_id = $2",
        [e.jugadorB_id, rondaId],
      );
      if (checkB.rows.length === 0) {
        throw new Error(
          `La apuesta ${e.jugadorB_id} no existe en la ronda ${rondaId}`,
        );
      }

      // Insertar el enfrentamiento con TODOS los campos
      const result = await client.query(
        `INSERT INTO enfrentamientos 
         (ronda_id, jugador_equipoA_id, jugador_equipoB_id, monto_enfrentamiento) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [rondaId, e.jugadorA_id, e.jugadorB_id, e.monto],
      );

      console.log(
        `✅ Enfrentamiento insertado - ID: ${result.rows[0].id}, jugadorA_id: ${e.jugadorA_id}, jugadorB_id: ${e.jugadorB_id}`,
      );
    }

    await client.query("COMMIT");

    // Verificar que se insertaron correctamente
    const verify = await client.query(
      "SELECT * FROM enfrentamientos WHERE ronda_id = $1",
      [rondaId],
    );
    console.log(
      `📊 Verificación final: ${verify.rows.length} enfrentamientos en BD`,
    );
    verify.rows.forEach((v) => {
      console.log(
        `   - ID: ${v.id}, A: ${v.jugador_equipoA_id}, B: ${v.jugador_equipoB_id}, Monto: ${v.monto_enfrentamiento}`,
      );
    });

    res.json({
      mensaje: "Enfrentamientos creados exitosamente",
      count: emparejamientos.length,
      verificacion: verify.rows.length,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error creando enfrentamientos:", error);
    res.status(500).json({
      error: "Error al crear enfrentamientos",
      detalle: error.message,
    });
  } finally {
    client.release();
  }
});

// Finalizar ronda y calcular ganadores - POSTGRESQL
// Finalizar ronda y calcular ganadores - POSTGRESQL
app.post("/api/ronda/finalizar/:id", async (req, res) => {
  const { resultados } = req.body;
  const rondaId = req.params.id;

  console.log(
    `🏁 Finalizando ronda ${rondaId} con ${resultados?.length} resultados`,
  );
  console.log("📦 Resultados recibidos:", JSON.stringify(resultados, null, 2));

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Actualizar ganadores
    for (const r of resultados) {
      console.log(
        `Actualizando enfrentamiento ${r.enfrentamiento_id} con ganador ${r.ganador_id}`,
      );

      const updateResult = await client.query(
        "UPDATE enfrentamientos SET ganador_id = $1 WHERE id = $2 RETURNING *",
        [r.ganador_id, r.enfrentamiento_id],
      );

      if (updateResult.rowCount === 0) {
        console.log(`⚠️ No se encontró enfrentamiento ${r.enfrentamiento_id}`);
      } else {
        console.log(`✅ Enfrentamiento ${r.enfrentamiento_id} actualizado`);
      }
    }

    // 2. Calcular movimientos
    const movimientos = await client.query(
      `
      SELECT 
        a.jugador_id,
        a.id as apuesta_id,
        e.monto_enfrentamiento,
        e.id as enfrentamiento_id,
        CASE 
          WHEN e.ganador_id = a.id THEN 'GANADOR'
          ELSE 'PERDEDOR'
        END as resultado
      FROM enfrentamientos e
      JOIN apuestas_ronda a ON (a.id = e.jugador_equipoA_id OR a.id = e.jugador_equipoB_id)
      WHERE e.ronda_id = $1 AND e.ganador_id IS NOT NULL
      `,
      [rondaId],
    );

    console.log("📊 Movimientos calculados:", movimientos.rows);

    // 3. Actualizar saldos
    for (const m of movimientos.rows) {
      const cambio =
        m.resultado === "GANADOR"
          ? m.monto_enfrentamiento
          : -m.monto_enfrentamiento;

      console.log(
        `💰 Jugador ${m.jugador_id}: ${m.resultado} ${cambio > 0 ? "+" : ""}${cambio}`,
      );

      await client.query(
        "UPDATE jugadores SET saldo_total = saldo_total + $1 WHERE id = $2",
        [cambio, m.jugador_id],
      );
    }

    // 4. Marcar ronda como finalizada
    await client.query(
      "UPDATE rondas SET estado = 'finalizada' WHERE id = $1",
      [rondaId],
    );

    await client.query("COMMIT");

    console.log("✅ Ronda finalizada exitosamente");
    res.json({
      mensaje: "Ronda finalizada exitosamente",
      movimientos: movimientos.rows,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error finalizando ronda:", error);
    res
      .status(500)
      .json({ error: "Error al finalizar ronda", detalle: error.message });
  } finally {
    client.release();
  }
});

// Listar todas las rondas - POSTGRESQL
app.get("/api/rondas", async (req, res) => {
  console.log("📥 GET /api/rondas - Solicitado");

  try {
    const result = await db.query(`
      SELECT r.*, 
           COUNT(DISTINCT e.id) as total_enfrentamientos,
           COUNT(DISTINCT CASE WHEN e.ganador_id IS NOT NULL THEN e.id END) as enfrentamientos_resueltos
      FROM rondas r
      LEFT JOIN enfrentamientos e ON r.id = e.ronda_id
      GROUP BY r.id
      ORDER BY r.fecha DESC
    `);

    console.log(`✅ Enviadas ${result.rows.length} rondas`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en /api/rondas:", error);
    res.status(500).json({
      error: "Error al obtener rondas",
      detalle: error.message,
    });
  }
});

// ============================================
// RUTAS DE DIAGNÓSTICO
// ============================================

// Ruta de diagnóstico
app.get("/api/diagnostico", async (req, res) => {
  try {
    console.log("🔍 Diagnóstico solicitado");
    const result = await db.query("SELECT NOW() as tiempo");
    res.json({
      status: "✅ Conexión OK",
      timestamp: result.rows[0].tiempo,
      db: "PostgreSQL",
    });
  } catch (error) {
    console.error("❌ Error en diagnóstico:", error);
    res.status(500).json({
      status: "❌ Error de conexión",
      error: error.message,
    });
  }
});

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ============================================
// RUTA TEMPORAL PARA REPARAR SECUENCIAS (BORRAR DESPUÉS DE USAR)
// ============================================
app.get("/api/reparar-sequencias", async (req, res) => {
  console.log("🔧 Iniciando reparación de secuencias...");

  const client = await db.pool.connect();
  let resultados = [];

  try {
    // 1. Verificar datos actuales
    const jugadores = await client.query("SELECT COUNT(*) FROM jugadores");
    resultados.push(`Jugadores: ${jugadores.rows[0].count}`);

    const rondas = await client.query("SELECT COUNT(*) FROM rondas");
    resultados.push(`Rondas: ${rondas.rows[0].count}`);

    // 2. Reparar secuencia de jugadores
    await client.query(`
      SELECT setval('jugadores_id_seq', (SELECT COALESCE(MAX(id), 0) FROM jugadores));
    `);
    resultados.push("✅ Secuencia jugadores reparada");

    // 3. Reparar secuencia de rondas
    await client.query(`
      SELECT setval('rondas_id_seq', (SELECT COALESCE(MAX(id), 0) FROM rondas));
    `);
    resultados.push("✅ Secuencia rondas reparada");

    // 4. Reparar secuencia de equipos_ronda
    await client.query(`
      SELECT setval('equipos_ronda_id_seq', (SELECT COALESCE(MAX(id), 0) FROM equipos_ronda));
    `);
    resultados.push("✅ Secuencia equipos_ronda reparada");

    // 5. Reparar secuencia de apuestas_ronda
    await client.query(`
      SELECT setval('apuestas_ronda_id_seq', (SELECT COALESCE(MAX(id), 0) FROM apuestas_ronda));
    `);
    resultados.push("✅ Secuencia apuestas_ronda reparada");

    // 6. Reparar secuencia de enfrentamientos
    await client.query(`
      SELECT setval('enfrentamientos_id_seq', (SELECT COALESCE(MAX(id), 0) FROM enfrentamientos));
    `);
    resultados.push("✅ Secuencia enfrentamientos reparada");

    // 7. Verificar valores de secuencias
    const seqJugadores = await client.query(
      "SELECT currval('jugadores_id_seq')",
    );
    resultados.push(
      `📊 Nueva secuencia jugadores: ${seqJugadores.rows[0].currval}`,
    );

    res.json({
      success: true,
      message: "Secuencias reparadas correctamente",
      resultados: resultados,
    });
  } catch (error) {
    console.error("❌ Error reparando secuencias:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      detalles: error,
    });
  } finally {
    client.release();
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`📁 Archivos estáticos: ${path.join(__dirname, "public")}`);
  console.log(`📁 Base de datos: PostgreSQL en Render`);
});

// ============================================
// RUTA TEMPORAL PARA CORREGIR ENFRENTAMIENTOS
// ============================================
app.get("/api/corregir-enfrentamientos", async (req, res) => {
  const client = await db.pool.connect();
  let reporte = [];

  try {
    await client.query("BEGIN");

    // 1. Obtener todos los enfrentamientos con problemas
    const enfrentamientos = await client.query(`
      SELECT e.id, e.ronda_id, e.monto_enfrentamiento
      FROM enfrentamientos e
      WHERE e.jugador_equipoA_id IS NULL OR e.jugador_equipoB_id IS NULL
    `);

    reporte.push(
      `🔍 Encontrados ${enfrentamientos.rows.length} enfrentamientos con problemas`,
    );

    // 2. Para cada enfrentamiento, buscar las apuestas correctas
    for (const enf of enfrentamientos.rows) {
      // Obtener las apuestas de esta ronda
      const apuestas = await client.query(
        `
        SELECT ar.id, ar.jugador_id, ar.equipo_id, j.nombre, e.nombre_equipo
        FROM apuestas_ronda ar
        JOIN jugadores j ON ar.jugador_id = j.id
        JOIN equipos_ronda e ON ar.equipo_id = e.id
        WHERE ar.ronda_id = $1
        ORDER BY ar.id ASC
      `,
        [enf.ronda_id],
      );

      reporte.push(
        `\n📊 Ronda ${enf.ronda_id}: ${apuestas.rows.length} apuestas`,
      );

      // Si hay al menos 2 apuestas, tomar las primeras dos (por orden)
      if (apuestas.rows.length >= 2) {
        const apuestaA = apuestas.rows[0];
        const apuestaB = apuestas.rows[1];

        await client.query(
          `
          UPDATE enfrentamientos 
          SET jugador_equipoA_id = $1, jugador_equipoB_id = $2
          WHERE id = $3
        `,
          [apuestaA.id, apuestaB.id, enf.id],
        );

        reporte.push(
          `  ✅ Corregido: ${apuestaA.nombre} (ID: ${apuestaA.id}) vs ${apuestaB.nombre} (ID: ${apuestaB.id})`,
        );
      }
    }

    await client.query("COMMIT");

    // Verificar resultados
    const verificacion = await client.query(`
      SELECT e.id, e.jugador_equipoA_id, e.jugador_equipoB_id,
             a1.jugador_id as jugadorA_id, a2.jugador_id as jugadorB_id,
             j1.nombre as nombreA, j2.nombre as nombreB
      FROM enfrentamientos e
      LEFT JOIN apuestas_ronda a1 ON e.jugador_equipoA_id = a1.id
      LEFT JOIN apuestas_ronda a2 ON e.jugador_equipoB_id = a2.id
      LEFT JOIN jugadores j1 ON a1.jugador_id = j1.id
      LEFT JOIN jugadores j2 ON a2.jugador_id = j2.id
      WHERE e.ronda_id IN (SELECT DISTINCT ronda_id FROM enfrentamientos WHERE jugador_equipoA_id IS NULL OR jugador_equipoB_id IS NULL)
    `);

    reporte.push("\n📋 VERIFICACIÓN FINAL:");
    verificacion.rows.forEach((v) => {
      reporte.push(
        `Enfrentamiento ${v.id}: ${v.nombreA || "NULL"} vs ${v.nombreB || "NULL"}`,
      );
    });

    res.json({
      success: true,
      reporte: reporte,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message, stack: error.stack });
  } finally {
    client.release();
  }
});
