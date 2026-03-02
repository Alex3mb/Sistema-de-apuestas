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
app.post("/api/ronda/enfrentar", async (req, res) => {
  const { rondaId, emparejamientos } = req.body;
  console.log(
    `📥 POST /api/ronda/enfrentar - Ronda ${rondaId}, ${emparejamientos?.length} enfrentamientos`,
  );
  console.log(
    "📦 Datos recibidos (IDs de jugadores):",
    JSON.stringify(emparejamientos, null, 2),
  );

  if (!rondaId || !emparejamientos || emparejamientos.length === 0) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    for (const e of emparejamientos) {
      // Buscar el ID de la apuesta para el jugador A en esta ronda
      const resA = await client.query(
        "SELECT id FROM apuestas_ronda WHERE ronda_id = $1 AND jugador_id = $2",
        [rondaId, e.jugadorA_id],
      );
      if (resA.rows.length === 0) {
        throw new Error(
          `No se encontró apuesta para jugador ${e.jugadorA_id} en ronda ${rondaId}`,
        );
      }
      const apuestaAId = resA.rows[0].id;

      // Buscar el ID de la apuesta para el jugador B
      const resB = await client.query(
        "SELECT id FROM apuestas_ronda WHERE ronda_id = $1 AND jugador_id = $2",
        [rondaId, e.jugadorB_id],
      );
      if (resB.rows.length === 0) {
        throw new Error(
          `No se encontró apuesta para jugador ${e.jugadorB_id} en ronda ${rondaId}`,
        );
      }
      const apuestaBId = resB.rows[0].id;

      // Insertar enfrentamiento con los IDs de apuestas correctos
      await client.query(
        `INSERT INTO enfrentamientos 
         (ronda_id, jugador_equipoA_id, jugador_equipoB_id, monto_enfrentamiento) 
         VALUES ($1, $2, $3, $4)`,
        [rondaId, apuestaAId, apuestaBId, e.monto],
      );

      console.log(
        `✅ Enfrentamiento insertado: jugadorA_id=${e.jugadorA_id} (apuestaId=${apuestaAId}), jugadorB_id=${e.jugadorB_id} (apuestaId=${apuestaBId})`,
      );
    }

    await client.query("COMMIT");
    console.log("✅ Todos los enfrentamientos guardados");
    res.json({ mensaje: "Enfrentamientos creados exitosamente" });
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

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`📁 Archivos estáticos: ${path.join(__dirname, "public")}`);
  console.log(`📁 Base de datos: PostgreSQL en Render`);
});
