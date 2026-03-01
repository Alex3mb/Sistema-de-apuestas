window.onload = function () {
  console.log("🚀 App iniciada");
  cargarJugadores();
  agregarBotones();
};

// ============================================
// FUNCIONES DE JUGADORES
// ============================================

function registrar() {
  const nombre = document.getElementById("nombreJugador").value.trim();
  if (!nombre) return alert("Ingresa un nombre");

  fetch("/jugador", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  })
    .then(async (res) => {
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      alert(text);
      document.getElementById("nombreJugador").value = "";
      cargarJugadores();
    })
    .catch((err) => alert("Error: " + err.message));
}

// ============================================
// FUNCIÓN MODIFICADA - AGREGAR COLUMNA NIVEL
// ============================================
function cargarJugadores() {
  console.log("Cargando jugadores...");

  fetch("/jugadores")
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      console.log("Datos recibidos:", data);

      if (!Array.isArray(data)) {
        console.error("Error: data no es un array", data);
        document.getElementById("listaJugadores").innerHTML =
          "<p style='color:red'>Error: Datos inválidos del servidor</p>";
        return;
      }

      const saldoActivos = data
        .filter((j) => j.activo === 1)
        .reduce((sum, j) => sum + (parseFloat(j.saldo_total) || 0), 0);

      const saldoInactivos = data
        .filter((j) => j.activo === 0)
        .reduce((sum, j) => sum + (parseFloat(j.saldo_total) || 0), 0);

      const totalJugadores = data.length;
      const activosCount = data.filter((j) => j.activo === 1).length;
      const inactivosCount = data.filter((j) => j.activo === 0).length;

      let resumenHtml = `
        <div style="display: flex; gap: 20px; margin: 20px 0; padding: 15px; background: #2d2d2d; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border: 1px solid #404040;">
          <div style="flex: 1; text-align: center; padding: 15px; background: linear-gradient(135deg, #2e7d32 0%, #4CAF50 100%); color: white; border-radius: 5px;">
            <div style="font-size: 14px; opacity: 0.9;">🟢 JUGADORES ACTIVOS</div>
            <div style="font-size: 24px; font-weight: bold;">$${saldoActivos.toFixed(2)}</div>
            <div style="font-size: 12px; opacity: 0.9;">${activosCount} jugadores</div>
          </div>
          <div style="flex: 1; text-align: center; padding: 15px; background: linear-gradient(135deg, #c62828 0%, #f44336 100%); color: white; border-radius: 5px;">
            <div style="font-size: 14px; opacity: 0.9;">🔴 JUGADORES INACTIVOS</div>
            <div style="font-size: 24px; font-weight: bold;">$${saldoInactivos.toFixed(2)}</div>
            <div style="font-size: 12px; opacity: 0.9;">${inactivosCount} jugadores</div>
          </div>
          <div style="flex: 1; text-align: center; padding: 15px; background: linear-gradient(135deg, #1565C0 0%, #2196F3 100%); color: white; border-radius: 5px;">
            <div style="font-size: 14px; opacity: 0.9;">💰 SALDO TOTAL</div>
            <div style="font-size: 24px; font-weight: bold;">$${(saldoActivos + saldoInactivos).toFixed(2)}</div>
            <div style="font-size: 12px; opacity: 0.9;">${totalJugadores} jugadores</div>
          </div>
        </div>
      `;

      const activos = data.filter((j) => j.activo === 1);
      const promedioActivos =
        activos.length > 0
          ? (saldoActivos / activos.length).toFixed(2)
          : "0.00";

      const jugadorTop =
        activos.length > 0
          ? activos.reduce(
              (max, j) => (j.saldo_total > max.saldo_total ? j : max),
              activos[0],
            )
          : null;

      let statsHtml = `
        <div style="margin: 10px 0 20px 0; padding: 15px; background: #2d2d2d; border-radius: 8px; border: 1px solid #404040; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
          <div style="display: flex; gap: 20px; justify-content: space-around; flex-wrap: wrap;">
            <div style="padding: 8px 15px; background: #333; border-radius: 20px; border: 1px solid #4CAF50; color: #e0e0e0;">
              <strong style="color: #4CAF50;">📊 Promedio activos:</strong> $${promedioActivos}
            </div>
            <div style="padding: 8px 15px; background: #333; border-radius: 20px; border: 1px solid #4CAF50; color: #e0e0e0;">
              <strong style="color: #4CAF50;">🏆 Mejor jugador:</strong> ${jugadorTop ? jugadorTop.nombre + " ($" + jugadorTop.saldo_total + ")" : "Ninguno"}
            </div>
            <div style="padding: 8px 15px; background: #333; border-radius: 20px; border: 1px solid #4CAF50; color: #e0e0e0;">
              <strong style="color: #4CAF50;">📈 Total:</strong> ${totalJugadores} (${activosCount} act, ${inactivosCount} ina)
            </div>
          </div>
        </div>
      `;

      let tablaHtml =
        "<table border='1' cellpadding='8' style='width:100%; border-collapse: collapse;'>";
      tablaHtml +=
        "<tr style='background: #4CAF50; color: white;'><th>Nombre</th><th>Saldo</th><th>Estado</th><th>Nivel</th><th>Acciones</th></tr>";

      data.forEach((j) => {
        const estado = j.activo ? "🟢 Activo" : "🔴 Inactivo";

        tablaHtml += `
          <tr ${!j.activo ? 'style="opacity: 0.6;"' : ""}>
            <td>${j.nombre || "Sin nombre"}</td>
            <td>$${parseFloat(j.saldo_total || 0).toFixed(2)}</td>
            <td>${estado}</td>
            <td>
              <select id="nivel_${j.id}" onchange="guardarNivel(${j.id})" style="padding: 5px; border-radius: 3px; background: #333; color: #e0e0e0; border: 1px solid #404040;">
                <option value="Tier 1">Tier 1</option>
                <option value="Tier 2">Tier 2</option>
                <option value="Tier 3">Tier 3</option>
                <option value="Tier 4">Tier 4</option>
                <option value="Tier 5">Tier 5</option>
                <option value="Tier 6">Tier 6</option>
                <option value="Tier 7">Tier 7</option>
                <option value="Tier 8">Tier 8</option>
                <option value="Tier 9">Tier 9</option>
                <option value="Tier 10">Tier 10</option>
              </select>
            </td>
            <td>
              <button onclick="abrirModalEditar(${j.id}, '${j.nombre}', ${j.saldo_total}, ${j.activo})" style="background: #2196F3; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">✏️ Editar</button>
              <button onclick="eliminarJugador(${j.id})" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">🗑️ Eliminar</button>
              <button onclick="toggleEstado(${j.id}, ${j.activo})" style="background: ${j.activo ? "#ffaa00" : "#00aa00"}; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                ${j.activo ? "🔴 Desactivar" : "🟢 Activar"}
              </button>
            </td>
          </tr>
        `;
      });

      tablaHtml += "</table>";

      document.getElementById("listaJugadores").innerHTML =
        resumenHtml + statsHtml + tablaHtml;

      if (typeof restaurarNiveles === "function") {
        restaurarNiveles();
      }
    })
    .catch((err) => {
      console.error("Error completo:", err);
      document.getElementById("listaJugadores").innerHTML =
        "<p style='color:red'>Error al cargar jugadores: " +
        err.message +
        "</p>";
    });
}

// ============================================
// NUEVAS FUNCIONES PARA NIVELES
// ============================================

function guardarNivel(jugadorId) {
  const select = document.getElementById(`nivel_${jugadorId}`);
  const nivel = select.value;

  const niveles = JSON.parse(localStorage.getItem("niveles") || "{}");
  niveles[jugadorId] = nivel;
  localStorage.setItem("niveles", JSON.stringify(niveles));

  console.log(`✅ Nivel ${nivel} guardado para jugador ID ${jugadorId}`);
}

function restaurarNiveles() {
  const niveles = JSON.parse(localStorage.getItem("niveles") || "{}");

  Object.keys(niveles).forEach((jugadorId) => {
    const select = document.getElementById(`nivel_${jugadorId}`);
    if (select) {
      select.value = niveles[jugadorId];
      console.log(
        `🔄 Nivel restaurado: Jugador ${jugadorId} = ${niveles[jugadorId]}`,
      );
    }
  });
}

function resetearNiveles() {
  if (confirm("¿Resetear todos los niveles a Tier 1?")) {
    localStorage.removeItem("niveles");
    cargarJugadores();
    alert("✅ Niveles reseteados");
  }
}

// ============================================
// FUNCIONES DE EDICIÓN DE JUGADORES
// ============================================

function abrirModalEditar(id, nombre, saldo, activo) {
  document.getElementById("editarId").value = id;
  document.getElementById("editarNombre").value = nombre;
  document.getElementById("editarSaldo").value = saldo;
  document.getElementById("editarEstado").value = activo;
  document.getElementById("modalEditar").style.display = "block";
  document.getElementById("fondoModal").style.display = "block";
}

function cerrarModal() {
  document.getElementById("modalEditar").style.display = "none";
  document.getElementById("fondoModal").style.display = "none";
}

function guardarCambios() {
  const id = document.getElementById("editarId").value;
  const nombre = document.getElementById("editarNombre").value.trim();
  const saldo = parseFloat(document.getElementById("editarSaldo").value);
  const activo = parseInt(document.getElementById("editarEstado").value);

  if (!nombre) {
    alert("El nombre no puede estar vacío");
    return;
  }

  fetch("/jugador/modificar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, nombre, saldo, activo }),
  })
    .then(async (res) => {
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      alert(text);
      cerrarModal();
      cargarJugadores();
    })
    .catch((err) => alert("Error: " + err.message));
}

function toggleEstado(id, estadoActual) {
  fetch("/jugador/modificar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, activo: estadoActual ? 0 : 1 }),
  })
    .then(async (res) => {
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      cargarJugadores();
    })
    .catch((err) => alert("Error: " + err.message));
}

function eliminarJugador(id) {
  if (!confirm("¿Eliminar jugador?")) return;

  fetch(`/jugador/eliminar/${id}`, { method: "DELETE" })
    .then(async (res) => {
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      alert(text);
      cargarJugadores();
    })
    .catch((err) => alert("Error: " + err.message));
}

function ganador() {
  fetch("/jugadores")
    .then((res) => res.json())
    .then((jugadores) => {
      const activos = jugadores.filter((j) => j.activo);
      if (activos.length === 0) {
        alert("No hay jugadores activos");
        return;
      }

      let totalApuestas = jugadores.reduce(
        (acc, j) =>
          acc + (Number(document.getElementById("apuesta_" + j.id).value) || 0),
        0,
      );

      if (totalApuestas === 0) {
        alert("No hay apuestas");
        return;
      }

      jugadores.forEach((j) => {
        let apuesta =
          Number(document.getElementById("apuesta_" + j.id).value) || 0;
        let cambio = totalApuestas - apuesta;

        fetch("/resultado", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jugador_id: j.id, cambio }),
        });
      });

      alert("¡Ronda calculada!");
      setTimeout(cargarJugadores, 500);
    });
}

// ============================================
// FUNCIONES PARA EL SISTEMA 5 VS 5
// ============================================

let jugadoresDisponibles = [];
let equipoA = [];
let equipoB = [];

function mostrarCrearRonda() {
  console.log("🎲 Mostrar crear ronda");

  fetch("/jugadores")
    .then((res) => res.json())
    .then((jugadores) => {
      jugadoresDisponibles = jugadores.filter((j) => j.activo);
      console.log("Jugadores activos:", jugadoresDisponibles);

      equipoA = [];
      equipoB = [];

      let html = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 2px solid #333; border-radius: 10px; z-index: 1000; max-width: 800px; max-height: 80vh; overflow-y: auto;">
          <h3>⚔️ Crear Nueva Ronda 5 vs 5</h3>
          <div style="display: flex; gap: 20px;">
            <div style="flex: 1;">
              <h4>Equipo A</h4>
              <div id="equipoA-container"></div>
              <button onclick="agregarJugadorA()" style="margin-top: 10px;">➕ Agregar Jugador</button>
            </div>
            <div style="flex: 1;">
              <h4>Equipo B</h4>
              <div id="equipoB-container"></div>
              <button onclick="agregarJugadorB()" style="margin-top: 10px;">➕ Agregar Jugador</button>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center;">
            <button onclick="guardarRonda()" style="background: #4CAF50; color: white; padding: 10px 30px; font-size: 16px;">Crear Ronda</button>
            <button onclick="cerrarModalRonda()" style="background: #f44336; color: white; padding: 10px 30px; font-size: 16px; margin-left: 10px;">Cancelar</button>
          </div>
        </div>
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999;" onclick="cerrarModalRonda()"></div>
      `;

      const modal = document.createElement("div");
      modal.id = "modalRonda";
      modal.innerHTML = html;
      document.body.appendChild(modal);

      actualizarEquiposUI();
    });
}

function actualizarEquiposUI() {
  const idsSeleccionadosA = equipoA.map((j) => j.id).filter((id) => id);
  const idsSeleccionadosB = equipoB.map((j) => j.id).filter((id) => id);
  const idsSeleccionados = [...idsSeleccionadosA, ...idsSeleccionadosB];

  let htmlA = "";
  equipoA.forEach((j, index) => {
    const jugadoresFiltrados = jugadoresDisponibles.filter(
      (jd) => !idsSeleccionados.includes(jd.id) || jd.id === j.id,
    );

    htmlA += `
      <div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
        <select id="selectA_${index}" onchange="cambiarJugadorA(${index})" style="width: 100%; padding: 5px; margin-bottom: 5px;">
          <option value="">Seleccionar jugador</option>
          ${jugadoresFiltrados
            .map(
              (jd) =>
                `<option value="${jd.id}" ${jd.id === j.id ? "selected" : ""}>${jd.nombre} (Saldo: $${jd.saldo_total})</option>`,
            )
            .join("")}
        </select>
        <div style="display: flex; gap: 5px;">
          <input type="number" id="apuestaA_${index}" value="${j.apuesta || 0}" placeholder="Apuesta $" style="flex: 1; padding: 5px;">
          <button onclick="eliminarJugadorA(${index})" style="background: #ff4444; color: white; border: none; border-radius: 3px; cursor: pointer;">❌</button>
        </div>
      </div>
    `;
  });

  let htmlB = "";
  equipoB.forEach((j, index) => {
    const idsActualizadosA = equipoA.map((j) => j.id).filter((id) => id);
    const idsActualizadosB = equipoB.map((j) => j.id).filter((id) => id);
    const todosSeleccionados = [...idsActualizadosA, ...idsActualizadosB];

    const jugadoresFiltrados = jugadoresDisponibles.filter(
      (jd) => !todosSeleccionados.includes(jd.id) || jd.id === j.id,
    );

    htmlB += `
      <div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
        <select id="selectB_${index}" onchange="cambiarJugadorB(${index})" style="width: 100%; padding: 5px; margin-bottom: 5px;">
          <option value="">Seleccionar jugador</option>
          ${jugadoresFiltrados
            .map(
              (jd) =>
                `<option value="${jd.id}" ${jd.id === j.id ? "selected" : ""}>${jd.nombre} (Saldo: $${jd.saldo_total})</option>`,
            )
            .join("")}
        </select>
        <div style="display: flex; gap: 5px;">
          <input type="number" id="apuestaB_${index}" value="${j.apuesta || 0}" placeholder="Apuesta $" style="flex: 1; padding: 5px;">
          <button onclick="eliminarJugadorB(${index})" style="background: #ff4444; color: white; border: none; border-radius: 3px; cursor: pointer;">❌</button>
        </div>
      </div>
    `;
  });

  if (document.getElementById("equipoA-container")) {
    document.getElementById("equipoA-container").innerHTML =
      htmlA ||
      "<p style='color: #999; text-align: center;'>No hay jugadores en Equipo A</p>";
    document.getElementById("equipoB-container").innerHTML =
      htmlB ||
      "<p style='color: #999; text-align: center;'>No hay jugadores en Equipo B</p>";
  }
}

function agregarJugadorA() {
  equipoA.push({ id: null, apuesta: 0 });
  actualizarEquiposUI();
}

function agregarJugadorB() {
  equipoB.push({ id: null, apuesta: 0 });
  actualizarEquiposUI();
}

function cambiarJugadorA(index) {
  const select = document.getElementById(`selectA_${index}`);
  const id = parseInt(select.value);
  equipoA[index].id = id;
  actualizarEquiposUI();
}

function cambiarJugadorB(index) {
  const select = document.getElementById(`selectB_${index}`);
  const id = parseInt(select.value);
  equipoB[index].id = id;
  actualizarEquiposUI();
}

function eliminarJugadorA(index) {
  equipoA.splice(index, 1);
  actualizarEquiposUI();
}

function eliminarJugadorB(index) {
  equipoB.splice(index, 1);
  actualizarEquiposUI();
}

// ============================================
// FUNCIÓN GUARDAR RONDA CON LOGS MEJORADOS
// ============================================
function guardarRonda() {
  console.log("🎲 INICIO guardarRonda");

  const equipoAConApuestas = [];
  const equipoBConApuestas = [];
  const jugadoresSinSaldo = [];

  // Procesar equipo A
  for (let i = 0; i < equipoA.length; i++) {
    const select = document.getElementById(`selectA_${i}`);
    const input = document.getElementById(`apuestaA_${i}`);

    if (select && select.value) {
      const jugadorId = parseInt(select.value);

      // 🔍 LOG IMPORTANTE - Ver valor del input
      console.log(`🔍 Input A${i} value:`, input?.value);
      const apuesta = parseFloat(input?.value) || 0;
      console.log(`💰 Apuesta A${i} parseada:`, apuesta);

      const jugador = jugadoresDisponibles.find((j) => j.id === jugadorId);

      if (jugador && jugador.saldo_total < apuesta) {
        jugadoresSinSaldo.push(
          `${jugador.nombre} (saldo: $${jugador.saldo_total}, apuesta: $${apuesta})`,
        );
      }

      equipoAConApuestas.push({
        jugador_id: jugadorId,
        apuesta: apuesta,
        orden: i,
      });
    }
  }

  // Procesar equipo B
  for (let i = 0; i < equipoB.length; i++) {
    const select = document.getElementById(`selectB_${i}`);
    const input = document.getElementById(`apuestaB_${i}`);

    if (select && select.value) {
      const jugadorId = parseInt(select.value);

      // 🔍 LOG IMPORTANTE - Ver valor del input
      console.log(`🔍 Input B${i} value:`, input?.value);
      const apuesta = parseFloat(input?.value) || 0;
      console.log(`💰 Apuesta B${i} parseada:`, apuesta);

      const jugador = jugadoresDisponibles.find((j) => j.id === jugadorId);

      if (jugador && jugador.saldo_total < apuesta) {
        jugadoresSinSaldo.push(
          `${jugador.nombre} (saldo: $${jugador.saldo_total}, apuesta: $${apuesta})`,
        );
      }

      equipoBConApuestas.push({
        jugador_id: jugadorId,
        apuesta: apuesta,
        orden: i,
      });
    }
  }

  console.log("📦 Datos a enviar - Equipo A:", equipoAConApuestas);
  console.log("📦 Datos a enviar - Equipo B:", equipoBConApuestas);

  if (equipoAConApuestas.length === 0 || equipoBConApuestas.length === 0) {
    alert("Ambos equipos deben tener al menos 1 jugador");
    return;
  }

  if (jugadoresSinSaldo.length > 0) {
    alert(
      `Los siguientes jugadores no tienen saldo suficiente:\n${jugadoresSinSaldo.join("\n")}`,
    );
    return;
  }

  const tieneApuestaA = equipoAConApuestas.some((j) => j.apuesta > 0);
  const tieneApuestaB = equipoBConApuestas.some((j) => j.apuesta > 0);

  if (!tieneApuestaA || !tieneApuestaB) {
    alert("Cada equipo debe tener al menos una apuesta positiva");
    return;
  }

  mostrarCargando();

  fetch("/api/ronda/nueva", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      equipoA: equipoAConApuestas.map((j) => ({
        jugador_id: j.jugador_id,
        apuesta: j.apuesta,
      })),
      equipoB: equipoBConApuestas.map((j) => ({
        jugador_id: j.jugador_id,
        apuesta: j.apuesta,
      })),
    }),
  })
    .then(async (res) => {
      const data = await res.json();
      console.log("📥 Respuesta de crear ronda:", data);
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));

      return crearEnfrentamientosPorOrden(
        data.rondaId,
        equipoAConApuestas,
        equipoBConApuestas,
      );
    })
    .then((resultado) => {
      ocultarCargando();
      console.log("✅ Resultado final:", resultado);

      if (resultado.error) {
        alert(`⚠️ ${resultado.error}`);
        return;
      }

      alert(
        `✅ Ronda #${resultado.rondaId} creada con ${resultado.totalEnfrentamientos} enfrentamientos`,
      );
      cerrarModalRonda();

      setTimeout(() => {
        mostrarResultadosRonda(resultado.rondaId);
      }, 500);
    })
    .catch((err) => {
      ocultarCargando();
      console.error("❌ Error completo:", err);
      alert("❌ Error: " + err.message);
    });
}

// ============================================
// FUNCIÓN CREAR ENFRENTAMIENTOS CON LOGS
// ============================================
function crearEnfrentamientosPorOrden(
  rondaId,
  equipoAOriginal,
  equipoBOriginal,
) {
  console.log("🎲 Creando enfrentamientos para ronda:", rondaId);
  console.log("📊 equipoAOriginal (con órdenes):", equipoAOriginal);
  console.log("📊 equipoBOriginal (con órdenes):", equipoBOriginal);

  return fetch(`/api/ronda/${rondaId}`)
    .then((res) => res.json())
    .then((data) => {
      console.log("📥 Datos completos de la ronda desde API:", data);

      // Verificar que hay apuestas
      if (!data.apuestas || data.apuestas.length === 0) {
        console.error("❌ No hay apuestas en esta ronda");
        return {
          rondaId,
          totalEnfrentamientos: 0,
          error: "No hay apuestas en la ronda",
        };
      }

      // Crear mapa de apuestas por jugador_id
      const apuestasPorJugador = {};
      const apuestasPorOrden = { A: [], B: [] };

      data.apuestas.forEach((a) => {
        apuestasPorJugador[a.jugador_id] = a;
        if (a.nombre_equipo === "A") {
          apuestasPorOrden.A.push(a);
        } else {
          apuestasPorOrden.B.push(a);
        }
        console.log(`📌 Apuesta encontrada en BD:`, {
          id_apuesta: a.id,
          jugador_id: a.jugador_id,
          jugador: a.jugador_nombre,
          equipo: a.nombre_equipo,
          monto: a.monto_apuesta,
        });
      });

      // Ordenar por ID (mantiene orden de creación)
      apuestasPorOrden.A.sort((a, b) => a.id - b.id);
      apuestasPorOrden.B.sort((a, b) => a.id - b.id);

      console.log("📊 Apuestas ordenadas - Equipo A:", apuestasPorOrden.A);
      console.log("📊 Apuestas ordenadas - Equipo B:", apuestasPorOrden.B);

      const emparejamientos = [];

      // Crear enfrentamientos en el mismo orden
      for (
        let i = 0;
        i < Math.min(apuestasPorOrden.A.length, apuestasPorOrden.B.length);
        i++
      ) {
        const apuestaA = apuestasPorOrden.A[i];
        const apuestaB = apuestasPorOrden.B[i];

        if (apuestaA && apuestaB) {
          const montoA = parseFloat(apuestaA.monto_apuesta) || 0;
          const montoB = parseFloat(apuestaB.monto_apuesta) || 0;
          const montoEnfrentamiento = (montoA + montoB) / 2;

          console.log(`💰 Creando enfrentamiento ${i + 1}:`, {
            id_apuestaA: apuestaA.id,
            jugadorA: apuestaA.jugador_nombre,
            id_jugadorA: apuestaA.jugador_id,
            montoA: montoA,
            id_apuestaB: apuestaB.id,
            jugadorB: apuestaB.jugador_nombre,
            id_jugadorB: apuestaB.jugador_id,
            montoB: montoB,
            montoEnfrentamiento: montoEnfrentamiento,
          });

          emparejamientos.push({
            jugadorA_id: apuestaA.id,
            jugadorB_id: apuestaB.id,
            monto: montoEnfrentamiento,
          });
        } else {
          console.error(`❌ No se encontraron apuestas para índice ${i}`);
        }
      }

      console.log("📦 Emparejamientos a enviar al servidor:", emparejamientos);

      if (emparejamientos.length === 0) {
        return {
          rondaId,
          totalEnfrentamientos: 0,
          error: "No hay enfrentamientos válidos",
        };
      }

      return fetch("/api/ronda/enfrentar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rondaId, emparejamientos }),
      })
        .then(async (res) => {
          const responseText = await res.text();
          console.log("📨 Respuesta del servidor (texto):", responseText);

          if (!res.ok) {
            throw new Error(responseText);
          }

          // Intentar parsear JSON
          try {
            const jsonResponse = JSON.parse(responseText);
            console.log("✅ Respuesta JSON:", jsonResponse);
          } catch (e) {
            console.log("📝 Respuesta en texto plano");
          }

          return { rondaId, totalEnfrentamientos: emparejamientos.length };
        })
        .catch((err) => {
          console.error("❌ Error en fetch a /api/ronda/enfrentar:", err);
          throw err;
        });
    })
    .catch((err) => {
      console.error("❌ Error en crearEnfrentamientosPorOrden:", err);
      return { rondaId, totalEnfrentamientos: 0, error: err.message };
    });
}

function mostrarCargando() {
  const div = document.createElement("div");
  div.id = "cargando";
  div.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 20px black;
    z-index: 2000; font-size: 18px;
  `;
  div.innerHTML = "⏳ Procesando...";
  document.body.appendChild(div);
}

function ocultarCargando() {
  const div = document.getElementById("cargando");
  if (div) div.remove();
}

function cerrarModalRonda() {
  const modal = document.getElementById("modalRonda");
  if (modal) modal.remove();
}

function verRondas() {
  fetch("/api/rondas")
    .then((res) => res.json())
    .then((rondas) => {
      let html = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 2px solid #333; border-radius: 10px; z-index: 1000; max-width: 800px; max-height: 80vh; overflow-y: auto;">
          <h3>📋 Historial de Rondas</h3>
          <table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f0f0f0;">
              <th>ID</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Enfrentamientos</th>
              <th>Acciones</th>
            </tr>
      `;

      rondas.forEach((r) => {
        const fecha = new Date(r.fecha).toLocaleString();
        const estadoColor =
          r.estado === "activa"
            ? "orange"
            : r.estado === "finalizada"
              ? "green"
              : "red";
        const estadoIcon =
          r.estado === "activa"
            ? "🟡"
            : r.estado === "finalizada"
              ? "✅"
              : "❌";

        html += `
          <tr>
            <td><strong>#${r.id}</strong></td>
            <td>${fecha}</td>
            <td style="color: ${estadoColor}; font-weight: bold;">${estadoIcon} ${r.estado}</td>
            <td>${r.total_enfrentamientos || 0}</td>
            <td>
              <button onclick="verDetalleRonda(${r.id})" style="background: #2196F3; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">👁️ Ver</button>
              ${r.estado === "activa" ? `<button onclick="mostrarResultadosRonda(${r.id})" style="background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">⚔️ Resultados</button>` : ""}
            </td>
          </tr>
        `;
      });

      html += `
          </table>
          <div style="margin-top: 20px; text-align: center;">
            <button onclick="cerrarModalRondas()" style="background: #f44336; color: white; padding: 10px 30px; border: none; border-radius: 5px; cursor: pointer;">Cerrar</button>
          </div>
        </div>
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999;" onclick="cerrarModalRondas()"></div>
      `;

      const modal = document.createElement("div");
      modal.id = "modalRondas";
      modal.innerHTML = html;
      document.body.appendChild(modal);
    })
    .catch((err) => alert("Error al cargar rondas: " + err.message));
}

function cerrarModalRondas() {
  const modal = document.getElementById("modalRondas");
  if (modal) modal.remove();
}

function verDetalleRonda(rondaId) {
  fetch(`/api/ronda/${rondaId}`)
    .then((res) => res.json())
    .then((data) => {
      let html = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 2px solid #333; border-radius: 10px; z-index: 1000; max-width: 900px; max-height: 80vh; overflow-y: auto;">
          <h3>📊 Detalle de Ronda #${rondaId}</h3>
          <p><strong>Fecha:</strong> ${new Date(data.ronda.fecha).toLocaleString()}</p>
          <p><strong>Estado:</strong> <span style="color: ${data.ronda.estado === "activa" ? "orange" : "green"};">${data.ronda.estado}</span></p>
          
          <h4>Equipos y Apuestas</h4>
          <table border="1" cellpadding="8" style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
            <tr style="background: #f0f0f0;">
              <th>Equipo</th>
              <th>Jugador</th>
              <th>Apuesta</th>
            </tr>
      `;

      data.apuestas.forEach((a) => {
        html += `
          <tr>
            <td style="font-weight: bold; color: ${a.nombre_equipo === "A" ? "#2196F3" : "#f44336"};">Equipo ${a.nombre_equipo}</td>
            <td>${a.jugador_nombre}</td>
            <td>$${a.monto_apuesta}</td>
          </tr>
        `;
      });

      html += `</table>`;

      if (data.enfrentamientos && data.enfrentamientos.length > 0) {
        html += `
          <h4>Enfrentamientos</h4>
          <table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f0f0f0;">
              <th>Jugador A</th>
              <th>Jugador B</th>
              <th>Monto</th>
              <th>Ganador</th>
            </tr>
        `;

        data.enfrentamientos.forEach((e) => {
          const ganador = e.ganador_id ? e.nombre_ganador : "Pendiente";
          const ganadorColor = e.ganador_id ? "green" : "orange";
          html += `
            <tr>
              <td style="color: #2196F3;">${e.nombre_jugadorA} ($${e.monto_jugadorA})</td>
              <td style="color: #f44336;">${e.nombre_jugadorB} ($${e.monto_jugadorB})</td>
              <td><strong>$${e.monto_enfrentamiento}</strong></td>
              <td style="color: ${ganadorColor}; font-weight: bold;">${ganador}</td>
            </tr>
          `;
        });

        html += `</table>`;
      }

      html += `
          <div style="margin-top: 20px; text-align: center;">
            <button onclick="cerrarModalDetalle()" style="background: #f44336; color: white; padding: 10px 30px; border: none; border-radius: 5px; cursor: pointer;">Cerrar</button>
          </div>
        </div>
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999;" onclick="cerrarModalDetalle()"></div>
      `;

      const modal = document.createElement("div");
      modal.id = "modalDetalle";
      modal.innerHTML = html;
      document.body.appendChild(modal);
    })
    .catch((err) => alert("Error al cargar detalle: " + err.message));
}

function cerrarModalDetalle() {
  const modal = document.getElementById("modalDetalle");
  if (modal) modal.remove();
}

function mostrarResultadosRonda(rondaId) {
  fetch(`/api/ronda/${rondaId}`)
    .then((res) => res.json())
    .then((data) => {
      if (!data.enfrentamientos || data.enfrentamientos.length === 0) {
        alert("Esta ronda no tiene enfrentamientos creados");
        return;
      }

      const totalEquipoA = data.apuestas
        .filter((a) => a.nombre_equipo === "A")
        .reduce((sum, a) => sum + a.monto_apuesta, 0);

      const totalEquipoB = data.apuestas
        .filter((a) => a.nombre_equipo === "B")
        .reduce((sum, a) => sum + a.monto_apuesta, 0);

      const totalEnfrentamientosA = data.enfrentamientos.reduce(
        (sum, e) => sum + (e.monto_enfrentamiento || 0),
        0,
      );

      let html = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 2px solid #333; border-radius: 10px; z-index: 1000; max-width: 700px; max-height: 80vh; overflow-y: auto;">
          <h3>⚔️ Resultados de la Ronda #${rondaId}</h3>
          
          <div style="display: flex; justify-content: space-between; margin: 20px 0; padding: 10px; background: #f0f0f0; border-radius: 5px;">
            <div><strong style="color: #2196F3;">Equipo A:</strong> $${totalEquipoA} (en juego: $${totalEnfrentamientosA})</div>
            <div><strong>VS</strong></div>
            <div><strong style="color: #f44336;">Equipo B:</strong> $${totalEquipoB} (en juego: $${totalEnfrentamientosA})</div>
          </div>
          
          <p><strong>Selecciona el equipo ganador de la ronda:</strong></p>
          
          <div style="margin: 20px 0; text-align: center;">
            <button onclick="seleccionarGanadorEquipo('A', ${rondaId})" style="background: #2196F3; color: white; padding: 15px 40px; border: none; border-radius: 5px; font-size: 18px; margin-right: 20px; cursor: pointer;">
              🏆 GANA EQUIPO A
            </button>
            <button onclick="seleccionarGanadorEquipo('B', ${rondaId})" style="background: #f44336; color: white; padding: 15px 40px; border: none; border-radius: 5px; font-size: 18px; cursor: pointer;">
              🏆 GANA EQUIPO B
            </button>
          </div>
          
          <div style="margin-top: 20px; text-align: center;">
            <button onclick="cerrarModalResultados()" style="background: #f44336; color: white; padding: 10px 30px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer;">
              ❌ Cancelar
            </button>
          </div>
        </div>
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999;" onclick="cerrarModalResultados()"></div>
      `;

      const modal = document.createElement("div");
      modal.id = "modalResultados";
      modal.innerHTML = html;
      document.body.appendChild(modal);
    })
    .catch((err) => alert("Error al cargar resultados: " + err.message));
}

function seleccionarGanadorEquipo(equipoGanador, rondaId) {
  if (
    !confirm(
      `¿Confirmar que el Equipo ${equipoGanador} es el ganador de la ronda?`,
    )
  ) {
    return;
  }

  mostrarCargando();

  fetch(`/api/ronda/${rondaId}`)
    .then((res) => res.json())
    .then((data) => {
      const enfrentamientos = data.enfrentamientos;
      const resultados = [];

      enfrentamientos.forEach((e) => {
        if (equipoGanador === "A") {
          resultados.push({
            enfrentamiento_id: e.id,
            ganador_id: e.jugador_equipoA_id,
          });
        } else {
          resultados.push({
            enfrentamiento_id: e.id,
            ganador_id: e.jugador_equipoB_id,
          });
        }
      });

      return fetch(`/api/ronda/finalizar/${rondaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultados }),
      });
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      ocultarCargando();
      alert(
        `✅ Ronda #${rondaId} finalizada. Equipo ${equipoGanador} ganador. Saldos actualizados.`,
      );
      cerrarModalResultados();
      cargarJugadores();
    })
    .catch((err) => {
      ocultarCargando();
      alert("❌ Error: " + err.message);
    });
}

function cerrarModalResultados() {
  const modal = document.getElementById("modalResultados");
  if (modal) modal.remove();
}

function agregarBotones() {
  const h1 = document.querySelector("h1");

  const botonesExistentes = h1.querySelectorAll("button");
  botonesExistentes.forEach((btn) => btn.remove());

  const btnRonda = document.createElement("button");
  btnRonda.textContent = "⚔️ Nueva Ronda 5 vs 5";
  btnRonda.style.marginLeft = "20px";
  btnRonda.style.padding = "8px 15px";
  btnRonda.style.background = "#4CAF50";
  btnRonda.style.color = "white";
  btnRonda.style.border = "none";
  btnRonda.style.borderRadius = "5px";
  btnRonda.style.cursor = "pointer";
  btnRonda.onclick = mostrarCrearRonda;
  h1.appendChild(btnRonda);

  const btnVerRondas = document.createElement("button");
  btnVerRondas.textContent = "📋 Ver Rondas";
  btnVerRondas.style.marginLeft = "10px";
  btnVerRondas.style.padding = "8px 15px";
  btnVerRondas.style.background = "#2196F3";
  btnVerRondas.style.color = "white";
  btnVerRondas.style.border = "none";
  btnVerRondas.style.borderRadius = "5px";
  btnVerRondas.style.cursor = "pointer";
  btnVerRondas.onclick = verRondas;
  h1.appendChild(btnVerRondas);

  const btnReset = document.createElement("button");
  btnReset.textContent = "🔄 Reset Niveles";
  btnReset.style.marginLeft = "10px";
  btnReset.style.padding = "8px 15px";
  btnReset.style.background = "#ff9800";
  btnReset.style.color = "white";
  btnReset.style.border = "none";
  btnReset.style.borderRadius = "5px";
  btnReset.style.cursor = "pointer";
  btnReset.onclick = resetearNiveles;
  h1.appendChild(btnReset);
}
