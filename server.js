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

// ============================================
// RUTA DE DIAGNÓSTICO - LISTAR ARCHIVOS (NUEVA)
// ============================================
app.get("/api/listar", (req, res) => {
  const fs = require("fs");
  const path = require("path");

  let resultado = "<h1>📁 Listado de Archivos</h1>";

  // Listar directorio raíz
  const raiz = __dirname;
  resultado += `<h2>Directorio raíz: ${raiz}</h2>`;

  try {
    const archivos = fs.readdirSync(raiz);
    resultado += "<ul>";
    archivos.forEach((archivo) => {
      const stats = fs.statSync(path.join(raiz, archivo));
      resultado += `<li>${archivo} (${stats.isDirectory() ? "📁" : "📄"}) - ${stats.size} bytes</li>`;
    });
    resultado += "</ul>";

    // Buscar específicamente datos.json
    const jsonPath = path.join(raiz, "datos.json");
    if (fs.existsSync(jsonPath)) {
      resultado += '<p style="color:green">✅ datos.json EXISTE</p>';
      const stats = fs.statSync(jsonPath);
      resultado += `<p>Tamaño: ${stats.size} bytes</p>`;

      // Leer primeras líneas
      const contenido = fs.readFileSync(jsonPath, "utf8").substring(0, 500);
      resultado += `<p>Primeros caracteres: <pre>${contenido}</pre></p>`;
    } else {
      resultado += '<p style="color:red">❌ datos.json NO EXISTE</p>';
    }
  } catch (error) {
    resultado += `<p style="color:red">Error: ${error.message}</p>`;
  }

  res.send(resultado);
});

// ============================================
// RUTA PARA RESTAURAR DATOS DESDE JSON (LA QUE YA TENÍAS)
// ============================================
app.get("/api/restaurar-json", (req, res) => {
  // ... tu código existente ...
});

// Al final de server.js, reemplaza la línea del puerto por esto:
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});

// ============================================
// RUTA TEMPORAL PARA RESTAURAR DATOS (BORRAR DESPUÉS DE USAR)
// ============================================
// ============================================
// RUTA PARA RESTAURAR DATOS DESDE JSON
// ============================================
// ============================================
// RUTA PARA RESTAURAR DATOS DESDE JSON (VERSIÓN CON DIAGNÓSTICO)
// ============================================
app.get("/api/restaurar-json", (req, res) => {
  const fs = require("fs");
  const path = require("path");

  let html = "<h1>🔍 Diagnóstico de Restauración</h1>";

  try {
    // 1. Verificar directorio actual
    html += "<h3>📁 Directorio actual:</h3>";
    html += "<p>" + __dirname + "</p>";

    // 2. Listar archivos en el directorio
    const archivos = fs.readdirSync(__dirname);
    html += "<h3>📄 Archivos encontrados:</h3>";
    html += "<ul>";
    archivos.forEach((file) => {
      html += "<li>" + file + "</li>";
    });
    html += "</ul>";

    // 3. Buscar datos.json
    const jsonPath = path.join(__dirname, "datos.json");
    html += "<h3>🔍 Buscando datos.json:</h3>";
    html += "<p>" + jsonPath + "</p>";

    if (!fs.existsSync(jsonPath)) {
      html += '<p style="color:red">❌ No se encontró datos.json</p>';
      return res.send(html);
    }

    html += '<p style="color:green">✅ datos.json ENCONTRADO</p>';

    // 4. Leer y mostrar contenido del JSON
    const stats = fs.statSync(jsonPath);
    html += "<p>Tamaño: " + stats.size + " bytes</p>";

    const datos = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    html += "<h3>📊 Estructura del JSON:</h3>";
    html += "<ul>";
    Object.keys(datos).forEach((key) => {
      html +=
        "<li>" + key + ": " + (datos[key]?.length || 0) + " registros</li>";
    });
    html += "</ul>";

    // 5. Intentar restaurar (opcional - puedes comentar esto si quieres)
    html += "<h3>🔄 Intentando restaurar...</h3>";

    db.serialize(() => {
      // Limpiar tablas existentes
      db.run("DELETE FROM enfrentamientos");
      db.run("DELETE FROM apuestas_ronda");
      db.run("DELETE FROM equipos_ronda");
      db.run("DELETE FROM rondas");
      db.run("DELETE FROM jugadores");

      // Restaurar jugadores
      if (datos.jugadores && datos.jugadores.length > 0) {
        const stmt = db.prepare(
          "INSERT INTO jugadores (id, nombre, saldo_total, activo) VALUES (?, ?, ?, ?)",
        );
        datos.jugadores.forEach((j) => {
          stmt.run(j.id, j.nombre, j.saldo_total, j.activo);
        });
        stmt.finalize();
        html +=
          "<p>✅ Jugadores restaurados: " + datos.jugadores.length + "</p>";
      }

      // Restaurar rondas
      if (datos.rondas && datos.rondas.length > 0) {
        const stmt = db.prepare(
          "INSERT INTO rondas (id, fecha, estado, total_apuestas) VALUES (?, ?, ?, ?)",
        );
        datos.rondas.forEach((r) => {
          stmt.run(r.id, r.fecha, r.estado, r.total_apuestas || 0);
        });
        stmt.finalize();
        html += "<p>✅ Rondas restauradas: " + datos.rondas.length + "</p>";
      }

      // Restaurar equipos_ronda
      if (datos.equipos_ronda && datos.equipos_ronda.length > 0) {
        const stmt = db.prepare(
          "INSERT INTO equipos_ronda (id, ronda_id, nombre_equipo) VALUES (?, ?, ?)",
        );
        datos.equipos_ronda.forEach((e) => {
          stmt.run(e.id, e.ronda_id, e.nombre_equipo);
        });
        stmt.finalize();
        html +=
          "<p>✅ Equipos restaurados: " + datos.equipos_ronda.length + "</p>";
      }

      // Restaurar apuestas_ronda
      if (datos.apuestas_ronda && datos.apuestas_ronda.length > 0) {
        const stmt = db.prepare(
          "INSERT INTO apuestas_ronda (id, ronda_id, equipo_id, jugador_id, monto_apuesta) VALUES (?, ?, ?, ?, ?)",
        );
        datos.apuestas_ronda.forEach((a) => {
          stmt.run(
            a.id,
            a.ronda_id,
            a.equipo_id,
            a.jugador_id,
            a.monto_apuesta,
          );
        });
        stmt.finalize();
        html +=
          "<p>✅ Apuestas restauradas: " + datos.apuestas_ronda.length + "</p>";
      }

      // Restaurar enfrentamientos
      if (datos.enfrentamientos && datos.enfrentamientos.length > 0) {
        const stmt = db.prepare(
          "INSERT INTO enfrentamientos (id, ronda_id, jugador_equipoA_id, jugador_equipoB_id, monto_enfrentamiento, ganador_id) VALUES (?, ?, ?, ?, ?, ?)",
        );
        datos.enfrentamientos.forEach((e) => {
          stmt.run(
            e.id,
            e.ronda_id,
            e.jugador_equipoA_id,
            e.jugador_equipoB_id,
            e.monto_enfrentamiento,
            e.ganador_id,
          );
        });
        stmt.finalize();
        html +=
          "<p>✅ Enfrentamientos restaurados: " +
          datos.enfrentamientos.length +
          "</p>";
      }

      html += '<h2 style="color:green">✅ Restauración completada</h2>';
      html += '<p><a href="/">Volver a la aplicación</a></p>';
      res.send(html);
    });
  } catch (error) {
    html += '<h3 style="color:red">❌ Error:</h3>';
    html += "<p>" + error.message + "</p>";
    res.send(html);
  }
});

// ============================================
// RUTA DE PRUEBA - VER PRIMEROS REGISTROS
// ============================================
app.get("/api/prueba", (req, res) => {
  const fs = require("fs");
  const path = require("path");

  try {
    const jsonPath = path.join(__dirname, "datos.json");
    const datos = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

    let html = "<h1>🔍 PRUEBA - Primeros registros</h1>";

    // Mostrar primeros jugadores
    html += "<h2>Primeros 3 jugadores:</h2>";
    html +=
      "<pre>" + JSON.stringify(datos.jugadores.slice(0, 3), null, 2) + "</pre>";

    // Intentar una inserción simple
    html += "<h2>Intentando insertar un jugador de prueba...</h2>";

    db.run(
      "INSERT INTO jugadores (nombre, saldo_total, activo) VALUES ('JUGADOR PRUEBA', 100, 1)",
      function (err) {
        if (err) {
          html +=
            '<p style="color:red">❌ Error al insertar: ' +
            err.message +
            "</p>";
        } else {
          html +=
            '<p style="color:green">✅ Jugador de prueba insertado con ID: ' +
            this.lastID +
            "</p>";
        }

        // Mostrar todos los jugadores actuales
        db.all("SELECT * FROM jugadores", (err, jugadores) => {
          html += "<h2>Jugadores actuales en BD:</h2>";
          html += "<pre>" + JSON.stringify(jugadores, null, 2) + "</pre>";
          res.send(html);
        });
      },
    );
  } catch (error) {
    res.send('<p style="color:red">Error: ' + error.message + "</p>");
  }
});
