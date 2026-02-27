const express = require("express");
const path = require("path");
const db = require("./database/db");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde public/
app.use(express.static(path.join(__dirname, "public")));

// ============================================
// RUTAS DE JUGADORES
// ============================================

// Registrar jugador
app.post("/jugador", (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).send("Faltan datos");

  db.run(
    "INSERT INTO jugadores (nombre, saldo_total, activo) VALUES (?, 0, 1)",
    [nombre],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE"))
          return res.status(400).send("El jugador ya existe");
        return res.status(400).send("Error al registrar jugador");
      }
      res.send("Jugador registrado correctamente");
    },
  );
});

// Ver jugadores (SIN nivel)
app.get("/jugadores", (req, res) => {
  db.all(
    "SELECT id, nombre, saldo_total, activo FROM jugadores ORDER BY activo DESC, nombre",
    (err, rows) => {
      if (err) return res.status(500).send("Error al obtener jugadores");
      res.json(rows);
    },
  );
});

// Modificar jugador (SIN nivel)
app.post("/jugador/modificar", (req, res) => {
  const { id, nombre, saldo, activo } = req.body;

  if (!id) return res.status(400).send("ID requerido");

  let sql = "UPDATE jugadores SET ";
  let params = [];
  let updates = [];

  if (nombre !== undefined) {
    updates.push("nombre = ?");
    params.push(nombre);
  }
  if (saldo !== undefined) {
    updates.push("saldo_total = ?");
    params.push(saldo);
  }
  if (activo !== undefined) {
    updates.push("activo = ?");
    params.push(activo);
  }

  if (updates.length === 0) {
    return res.status(400).send("No hay datos para modificar");
  }

  sql += updates.join(", ");
  sql += " WHERE id = ?";
  params.push(id);

  db.run(sql, params, function (err) {
    if (err) {
      if (err.message.includes("UNIQUE"))
        return res.status(400).send("Ese nombre ya está en uso");
      return res.status(400).send("Error al modificar jugador");
    }
    if (this.changes === 0)
      return res.status(404).send("Jugador no encontrado");
    res.send("Jugador modificado correctamente");
  });
});

// Eliminar jugador
app.delete("/jugador/eliminar/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).send("ID inválido");

  db.run("DELETE FROM jugadores WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).send("Error al eliminar jugador");
    }
    if (this.changes === 0)
      return res.status(404).send("Jugador no encontrado");
    res.send("Jugador eliminado correctamente");
  });
});

// Actualizar saldo (sistema anterior)
app.post("/resultado", (req, res) => {
  const { jugador_id, cambio } = req.body;
  if (!jugador_id || cambio === undefined)
    return res.status(400).send("Faltan datos");

  db.run(
    "UPDATE jugadores SET saldo_total = saldo_total + ? WHERE id = ?",
    [cambio, jugador_id],
    function (err) {
      if (err) return res.status(500).send("Error al actualizar saldo");
      res.send("Saldo actualizado correctamente");
    },
  );
});

// ============================================
// RUTAS PARA EL SISTEMA 5 VS 5
// ============================================

// Crear una nueva ronda con equipos
app.post("/api/ronda/nueva", (req, res) => {
  const { equipoA, equipoB } = req.body;

  if (!equipoA || !equipoB || equipoA.length === 0 || equipoB.length === 0) {
    return res
      .status(400)
      .json({ error: "Se requieren ambos equipos con jugadores" });
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    db.run("INSERT INTO rondas (estado) VALUES ('activa')", function (err) {
      if (err) {
        db.run("ROLLBACK");
        return res.status(500).json({ error: "Error al crear ronda" });
      }

      const rondaId = this.lastID;

      db.run(
        "INSERT INTO equipos_ronda (ronda_id, nombre_equipo) VALUES (?, 'A')",
        [rondaId],
        function (err) {
          if (err) {
            db.run("ROLLBACK");
            return res.status(500).json({ error: "Error al crear equipo A" });
          }
          const equipoAId = this.lastID;

          db.run(
            "INSERT INTO equipos_ronda (ronda_id, nombre_equipo) VALUES (?, 'B')",
            [rondaId],
            function (err) {
              if (err) {
                db.run("ROLLBACK");
                return res
                  .status(500)
                  .json({ error: "Error al crear equipo B" });
              }
              const equipoBId = this.lastID;

              let apuestasPendientes = equipoA.length + equipoB.length;
              let errorEnApuestas = false;

              const verificarCompletado = () => {
                apuestasPendientes--;
                if (apuestasPendientes === 0 && !errorEnApuestas) {
                  db.run("COMMIT");
                  res.json({
                    rondaId,
                    equipoAId,
                    equipoBId,
                    mensaje: "Ronda creada exitosamente",
                  });
                }
              };

              equipoA.forEach((j) => {
                db.run(
                  "INSERT INTO apuestas_ronda (ronda_id, equipo_id, jugador_id, monto_apuesta) VALUES (?, ?, ?, ?)",
                  [rondaId, equipoAId, j.jugador_id, j.apuesta || 0],
                  function (err) {
                    if (err) {
                      if (!errorEnApuestas) {
                        errorEnApuestas = true;
                        db.run("ROLLBACK");
                        return res.status(500).json({
                          error: "Error al registrar apuesta del equipo A",
                        });
                      }
                    }
                    verificarCompletado();
                  },
                );
              });

              equipoB.forEach((j) => {
                db.run(
                  "INSERT INTO apuestas_ronda (ronda_id, equipo_id, jugador_id, monto_apuesta) VALUES (?, ?, ?, ?)",
                  [rondaId, equipoBId, j.jugador_id, j.apuesta || 0],
                  function (err) {
                    if (err) {
                      if (!errorEnApuestas) {
                        errorEnApuestas = true;
                        db.run("ROLLBACK");
                        return res.status(500).json({
                          error: "Error al registrar apuesta del equipo B",
                        });
                      }
                    }
                    verificarCompletado();
                  },
                );
              });
            },
          );
        },
      );
    });
  });
});

// Obtener detalles de una ronda
app.get("/api/ronda/:id", (req, res) => {
  const rondaId = req.params.id;

  db.get("SELECT * FROM rondas WHERE id = ?", [rondaId], (err, ronda) => {
    if (err) return res.status(500).json({ error: "Error al obtener ronda" });
    if (!ronda) return res.status(404).json({ error: "Ronda no encontrada" });

    db.all(
      "SELECT * FROM equipos_ronda WHERE ronda_id = ?",
      [rondaId],
      (err, equipos) => {
        if (err)
          return res.status(500).json({ error: "Error al obtener equipos" });

        db.all(
          `
          SELECT ar.*, j.nombre as jugador_nombre, e.nombre_equipo
          FROM apuestas_ronda ar
          JOIN jugadores j ON ar.jugador_id = j.id
          JOIN equipos_ronda e ON ar.equipo_id = e.id
          WHERE ar.ronda_id = ?
          `,
          [rondaId],
          (err, apuestas) => {
            if (err)
              return res
                .status(500)
                .json({ error: "Error al obtener apuestas" });

            db.all(
              `
              SELECT e.*, 
                     a1.monto_apuesta as monto_jugadorA,
                     a2.monto_apuesta as monto_jugadorB,
                     j1.nombre as nombre_jugadorA,
                     j2.nombre as nombre_jugadorB,
                     jg.nombre as nombre_ganador
              FROM enfrentamientos e
              LEFT JOIN apuestas_ronda a1 ON e.jugador_equipoA_id = a1.id
              LEFT JOIN apuestas_ronda a2 ON e.jugador_equipoB_id = a2.id
              LEFT JOIN jugadores j1 ON a1.jugador_id = j1.id
              LEFT JOIN jugadores j2 ON a2.jugador_id = j2.id
              LEFT JOIN apuestas_ronda ag ON e.ganador_id = ag.id
              LEFT JOIN jugadores jg ON ag.jugador_id = jg.id
              WHERE e.ronda_id = ?
              `,
              [rondaId],
              (err, enfrentamientos) => {
                if (err)
                  return res
                    .status(500)
                    .json({ error: "Error al obtener enfrentamientos" });

                res.json({
                  ronda,
                  equipos,
                  apuestas,
                  enfrentamientos,
                });
              },
            );
          },
        );
      },
    );
  });
});

// Crear enfrentamientos
app.post("/api/ronda/enfrentar", (req, res) => {
  const { rondaId, emparejamientos } = req.body;

  if (!rondaId || !emparejamientos || emparejamientos.length === 0) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    let pendientes = emparejamientos.length;
    let error = false;

    emparejamientos.forEach((e) => {
      db.run(
        `INSERT INTO enfrentamientos 
         (ronda_id, jugador_equipoA_id, jugador_equipoB_id, monto_enfrentamiento) 
         VALUES (?, ?, ?, ?)`,
        [rondaId, e.jugadorA_id, e.jugadorB_id, e.monto || 0],
        function (err) {
          if (err) {
            error = true;
            db.run("ROLLBACK");
            return res
              .status(500)
              .json({ error: "Error al crear enfrentamiento" });
          }

          pendientes--;
          if (pendientes === 0 && !error) {
            db.run("COMMIT");
            res.json({ mensaje: "Enfrentamientos creados exitosamente" });
          }
        },
      );
    });
  });
});

// Finalizar ronda y calcular ganadores
app.post("/api/ronda/finalizar/:id", (req, res) => {
  const { resultados } = req.body;
  const rondaId = req.params.id;

  console.log("🏁 Finalizando ronda:", rondaId);
  console.log("Resultados recibidos:", resultados);

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    let pendientes = resultados.length;
    let error = false;

    resultados.forEach((r) => {
      db.run(
        "UPDATE enfrentamientos SET ganador_id = ? WHERE id = ?",
        [r.ganador_id, r.enfrentamiento_id],
        function (err) {
          if (err) {
            error = true;
            console.error("Error actualizando ganador:", err);
            db.run("ROLLBACK");
            return res
              .status(500)
              .json({ error: "Error al actualizar ganadores" });
          }

          pendientes--;
          if (pendientes === 0 && !error) {
            db.all(
              `
              SELECT 
                a.jugador_id,
                a.id as apuesta_id,
                e.monto_enfrentamiento,
                CASE 
                  WHEN e.ganador_id = a.id THEN 'GANADOR'
                  ELSE 'PERDEDOR'
                END as resultado
              FROM enfrentamientos e
              JOIN apuestas_ronda a ON (a.id = e.jugador_equipoA_id OR a.id = e.jugador_equipoB_id)
              WHERE e.ronda_id = ? AND e.ganador_id IS NOT NULL
              `,
              [rondaId],
              (err, movimientos) => {
                if (err) {
                  console.error("Error calculando movimientos:", err);
                  db.run("ROLLBACK");
                  return res
                    .status(500)
                    .json({ error: "Error al calcular movimientos" });
                }

                console.log("Movimientos calculados:", movimientos);

                let actualizaciones = movimientos.length;
                let errorActualizacion = false;

                if (actualizaciones === 0) {
                  db.run(
                    "UPDATE rondas SET estado = 'finalizada' WHERE id = ?",
                    [rondaId],
                  );
                  db.run("COMMIT");
                  return res.json({
                    mensaje: "Ronda finalizada sin movimientos",
                  });
                }

                movimientos.forEach((m) => {
                  let cambio =
                    m.resultado === "GANADOR"
                      ? m.monto_enfrentamiento
                      : -m.monto_enfrentamiento;

                  console.log(
                    `Jugador ${m.jugador_id}: ${m.resultado} $${cambio}`,
                  );

                  db.run(
                    "UPDATE jugadores SET saldo_total = saldo_total + ? WHERE id = ?",
                    [cambio, m.jugador_id],
                    function (err) {
                      if (err) {
                        errorActualizacion = true;
                        console.error("Error actualizando saldo:", err);
                        db.run("ROLLBACK");
                        return res
                          .status(500)
                          .json({ error: "Error al actualizar saldo" });
                      }

                      actualizaciones--;
                      if (actualizaciones === 0 && !errorActualizacion) {
                        db.run(
                          "UPDATE rondas SET estado = 'finalizada' WHERE id = ?",
                          [rondaId],
                          (err) => {
                            if (err) {
                              db.run("ROLLBACK");
                              return res
                                .status(500)
                                .json({ error: "Error al finalizar ronda" });
                            }

                            db.run("COMMIT");
                            console.log("✅ Ronda finalizada exitosamente");
                            res.json({
                              mensaje: "Ronda finalizada exitosamente",
                              movimientos,
                            });
                          },
                        );
                      }
                    },
                  );
                });
              },
            );
          }
        },
      );
    });
  });
});

// Listar todas las rondas
app.get("/api/rondas", (req, res) => {
  db.all(
    `
    SELECT r.*, 
           COUNT(DISTINCT e.id) as total_enfrentamientos,
           COUNT(DISTINCT CASE WHEN e.ganador_id IS NOT NULL THEN e.id END) as enfrentamientos_resueltos
    FROM rondas r
    LEFT JOIN enfrentamientos e ON r.id = e.ronda_id
    GROUP BY r.id
    ORDER BY r.fecha DESC
    `,
    (err, rondas) => {
      if (err)
        return res.status(500).json({ error: "Error al obtener rondas" });
      res.json(rondas);
    },
  );
});

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Al final de server.js, reemplaza la línea del puerto por esto:
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});

// ============================================
// RUTA TEMPORAL PARA RESTAURAR DATOS (BORRAR DESPUÉS DE USAR)
// ============================================
app.get("/api/restaurar", (req, res) => {
  const fs = require("fs");
  const path = require("path");

  try {
    const backupPath = path.join(__dirname, "backup.sql");
    console.log("🔍 Buscando backup en:", backupPath);

    const backup = fs.readFileSync(backupPath, "utf8");
    console.log("✅ Backup encontrado, tamaño:", backup.length, "bytes");

    db.exec(backup, (err) => {
      if (err) {
        console.error("❌ Error restaurando:", err);
        res.status(500).send("Error al restaurar: " + err.message);
      } else {
        console.log("🎉 Datos restaurados correctamente");
        res.send(`
          <h1>✅ Restauración exitosa</h1>
          <p>Los datos han sido restaurados correctamente.</p>
          <p><a href="/">Volver a la aplicación</a></p>
        `);
      }
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).send("Error: " + error.message);
  }
});
