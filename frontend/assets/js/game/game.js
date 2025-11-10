// ============================================
// CONSTANTES
// ============================================

const BOARD_STRUCTURE = {
  bosqueSemejanza: [],
  pradoDiferencia: [],
  praderaAmor: [],
  trioFrondoso: [],
  reySelva: [],
  islaSolitario: [],
  rio: []
};

const DINO_TYPES = [
  { id: 1, color: "verde" },
  { id: 2, color: "rojo" },
  { id: 3, color: "amarillo" },
  { id: 4, color: "violeta" },
  { id: 5, color: "naranja" },
  { id: 6, color: "azul" }
];

const RECINTO_NAMES = {
  bosqueSemejanza: "",
  pradoDiferencia: "",
  praderaAmor: "",
  trioFrondoso: "",
  reySelva: "",
  islaSolitario: "",
  rio: ""
};

const MAX_DINOS_PER_HAND = 6;
const MAX_ROUNDS = 2;
const DINO_SELECTION_TEMPLATE_URL = "http://localhost/sauriogames/frontend/templates/selectDino.html";

// ============================================
// OBJETO PRINCIPAL DEL JUEGO
// En el código se verán metodos con "_" esto indica que son metodos privados se usan internamente dentro del objeto
// ============================================

const Game = {
  partida: null,
  currentPlayer: null,
  draggedDino: null,
  elements: {}, // Cache de elementos del DOM

  // Cachear elementos del DOM
  _cacheElements() {
    this.elements = {
      playerHand: document.getElementById("playerHand"),
      startRoundBtn: document.getElementById("startRoundBtn"),
      endTurnBtn: document.getElementById("endTurnBtn"),
      showScoresBtn: document.getElementById("showScoresBtn"),
      exitGame: document.getElementById("exitGame"),
      scoresModal: document.getElementById("scoresModal"),
      scoresContent: document.getElementById("scoresContent"),
      currentRound: document.getElementById("currentRound"),
      currentTurn: document.getElementById("currentTurn"),
      totalPlayers: document.getElementById("totalPlayers"),
      currentPlayerName: document.getElementById("currentPlayerName"),
      playerList: document.getElementById("playerList"),
      modalClose: document.querySelector(".modal-close")
    };
  },

  // Helpers para localStorage
  _getPartida() {
    return JSON.parse(localStorage.getItem("partidaActual"));
  },

  _savePartida() {
    localStorage.setItem("partidaActual", JSON.stringify(this.partida));
  },

  // Crear estructura de tablero vacía
  _createEmptyBoard() {
    return JSON.parse(JSON.stringify(BOARD_STRUCTURE));
  },

  // Función auxiliar para obtener el usuario actual
  getCurrentUser() {
    return JSON.parse(localStorage.getItem("usuario"));
  },

  // Inicializar el juego
  init() {
    // Cachear elementos del DOM
    this._cacheElements();

    this.partida = JSON.parse(localStorage.getItem("partidaActual"));
    if (!this.partida || this.partida.estado !== "iniciada") {
        alert("No hay una partida activa");
        window.location.href = "../index.html";
        return;
    }
    
    // Inicializar manos y estados de los jugadores
    this.partida.nombresJugadores = this.partida.nombresJugadores.map(jugador => ({
        ...jugador,
        mano: jugador.mano || [],
        haSeleccionado: typeof jugador.haSeleccionado === "boolean" ? jugador.haSeleccionado : false
    }));

    // Guardar estado inicial
    this._savePartida();

    // Inicializar UI
    this.initUI();
    this.setupEventListeners();

    // Verificar si el jugador actual necesita seleccionar dinosaurios
    const jugadorActual = this.partida.nombresJugadores.find(
        j => j.numero === this.partida.turnoActual
    );

    if (jugadorActual && !jugadorActual.haSeleccionado && this.partida.ronda > 0) {
        // Usar Promise para manejar la carga asíncrona
        Promise.resolve().then(() => {
            this.showDinoSelectionDialog();
        });
    }

    // Actualizar estado del juego
    this.updateGameState();
    // Mostrar mano del jugador actual si es su turno
    this.updatePlayerHand();
  },

  // Inicializar elementos de la UI
  initUI() {
    this.updateRoundTurn();
    this.updatePlayerList();
    this.setupDragAndDrop();
  },

  // Configurar event listeners
  setupEventListeners() {
    // Botones de control
    if (this.elements.startRoundBtn) {
      this.elements.startRoundBtn.addEventListener("click", () => this.startNewRound());
    }
    if (this.elements.endTurnBtn) {
      this.elements.endTurnBtn.addEventListener("click", () => this.endTurn());
    }
    if (this.elements.showScoresBtn) {
      this.elements.showScoresBtn.addEventListener("click", () => this.showScores());
    }
    if (this.elements.exitGame) {
      this.elements.exitGame.addEventListener("click", () => this.exitGame());
    }

    // Modal de puntuaciones
    if (this.elements.modalClose && this.elements.scoresModal) {
      this.elements.modalClose.addEventListener("click", () => this.elements.scoresModal.close());
    }
  },

  // Actualizar estado del juego
  updateGameState() {
    const partidaActual = this._getPartida();
    const usuarioLogueado = this.getCurrentUser();

    if (!partidaActual || !usuarioLogueado) {
      console.error("No hay partida o usuario activo");
      return;
    }

    // Actualizar la referencia local
    this.partida = partidaActual;

    // Encontrar al jugador actual del turno usando la misma lógica
    this.currentPlayer = this.partida.nombresJugadores.find(
      (j) => j.numero === this.partida.turnoActual
    );

    document.querySelectorAll(".dinos-area").forEach(area => {
      area.innerHTML = "";
    })

    // Actualizar UI
    this.updateRoundTurn();
    this.updatePlayerList();

    // Solo mostrar el tablero y la mano si es el turno del jugador
    if (this.isCurrentPlayersTurn()) {
      this.updatePlayerHand();
      this.updateRecintos();
    } else {
      if (this.elements.playerHand) {
        this.elements.playerHand.innerHTML = "";
      }
      document.querySelectorAll(".dinos-area").forEach((area) => {
        area.innerHTML = "";
      });
    }
  },

  // Verificar si es el turno del jugador actual
  isCurrentPlayersTurn() {
    const partidaActual = this._getPartida();
    
    const jugadorTurnoActual = partidaActual.nombresJugadores.find(
        j => j.numero === partidaActual.turnoActual
    );

    console.log("Verificando turno actual:", {
        jugadorTurnoActual,
        partidaActual
    });

    return (
      jugadorTurnoActual &&
      jugadorTurnoActual.numero === partidaActual.turnoActual
    );
  },

  // Verificar si la ronda actual terminó
  isRoundFinished() {
    return this.partida.turnoActual > this.partida.jugadores;
  },

  // Iniciar nueva ronda
  async startNewRound() {
    if (!window.ParkRules) {
      console.error("ParkRules no disponible");
      return;
    }

    // Verificar que es el admin
    const usuarioVerificacion = this.getCurrentUser();
    const adminPlayer = this.partida.nombresJugadores.find((j) => j.esAdmin);

    if (
      !adminPlayer ||
      !usuarioVerificacion ||
      usuarioVerificacion.nombre_usuario !== adminPlayer.nombre
    ) {
      alert("Solo el anfitrión puede iniciar la ronda");
      return;
    }

    // La partida ya debería estar creada en BD desde assignPlayers.js
    if (this.partida.id_partida) {
      console.log('✅ Partida ya existe en BD con ID:', this.partida.id_partida);
    } else {
      console.warn('⚠️ Partida sin ID de BD. No se guardará al finalizar.');
    }

    // Inicializar o reiniciar tableros para todos los jugadores
    this.partida.nombresJugadores = this.partida.nombresJugadores.map(
      (jugador) => ({
        ...jugador,
        tablero: this._createEmptyBoard(),
        mano: [],
        haSeleccionado: false
      })
    );

    this.partida.ronda = (this.partida.ronda || 0) + 1;
    this.partida.turnoActual = 1;

    // Guardar estado inicial
    this._savePartida();
    this.updateGameState();

    // Esperar un momento para que la UI se actualice y luego mostrar el diálogo
    setTimeout(() => {
      const firstPlayer = this.partida.nombresJugadores.find(
        (j) => j.numero === 1
      );
      if (firstPlayer && !firstPlayer.haSeleccionado) {
        this.showDinoSelectionDialog();
      }
    }, 100);
  },

  // Terminar turno actual
  endTurn() {
    if (!this.isCurrentPlayersTurn()) return;

    const totalJugadores = this.partida.nombresJugadores.length;
    const esUltimoJugador = this.partida.turnoActual === totalJugadores;
    
    // Verificar si el jugador actual terminó de colocar todos sus dinosaurios
    const jugadorActual = this.partida.nombresJugadores.find(
      j => j.numero === this.partida.turnoActual
    );
    const haTerminadoTurno = !jugadorActual.mano || jugadorActual.mano.length === 0;

    // No permitir terminar turno si aún hay dinosaurios en la mano
    if (!haTerminadoTurno) {
      alert("¡Debes colocar todos tus dinosaurios antes de terminar el turno!");
      return;
    }

    // Si es el último jugador Y ya terminó su turno
    if (esUltimoJugador && haTerminadoTurno) {
      // Si ya estamos en la ronda 2, finalizar la partida
      if (this.partida.ronda >= MAX_ROUNDS) {
        this.finishGameUI();
        return;
      }

      // Si no, mostrar confirmación de fin de ronda
      this.showRoundEndConfirmation(() => {
        // Después de confirmar, continuar con la siguiente ronda
        this.partida.ronda++;
        this.partida.turnoActual = 1;

        // Reset de selección
        this.partida.nombresJugadores = this.partida.nombresJugadores.map(j => ({
          ...j,
          haSeleccionado: false,
          mano: [],
          tablero: {
            bosqueSemejanza: [],
            pradoDiferencia: [],
            praderaAmor: [],
            trioFrondoso: [],
            reySelva: [],
            islaSolitario: [],
            rio: [],
          }
        }));

        localStorage.setItem("partidaActual", JSON.stringify(this.partida));
        this.updateGameState();

        // Forzar selección para el primer jugador
        setTimeout(() => this.showDinoSelectionDialog(), 80);
      });
    } else {
      // Si no es el último jugador, flujo normal con resumen
      this.showTurnSummary(() => {
        this.partida.turnoActual++;

        // Siguiente jugador debe seleccionar si no tiene mano
        const nextPlayer = this.partida.nombresJugadores.find(
          j => j.numero === this.partida.turnoActual
        );

        if (nextPlayer && !nextPlayer.haSeleccionado) {
          setTimeout(() => this.showDinoSelectionDialog(), 80);
        }

        localStorage.setItem("partidaActual", JSON.stringify(this.partida));
        this.updateGameState();
      });
    }
  },

  // Mostrar confirmación de fin de ronda
  showRoundEndConfirmation(callback) {
    const modal = document.createElement("dialog");
    modal.className = "modal round-end-modal";

    const roundaActual = this.partida.ronda;
    const roundaTexto = roundaActual === 1 ? "Primera" : "Segunda";
    const siguienteRonda = roundaActual === 1 ? "segunda" : "tercera";

    modal.innerHTML = `
      <div class="modal-content">
        <h2> ${roundaTexto} ronda terminada</h2>
        <p><strong>¿Pasar a la ${siguienteRonda} ronda?</strong></p>
        <div class="modal-buttons" style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
          <button class="modal-button primary" id="confirmNextRound" style="padding: 10px 20px;">Sí, continuar</button>
          <button class="modal-button secondary" id="viewScoresBtn" style="padding: 10px 20px;">Ver puntuaciones</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.showModal();

    modal.querySelector("#confirmNextRound").addEventListener("click", () => {
      modal.close();
      modal.remove();
      callback();
    });

    modal.querySelector("#viewScoresBtn").addEventListener("click", () => {
      this.showScores();
      // No cerrar el modal, dejar que el usuario vea las puntuaciones y luego decida
    });

    // Prevenir cerrar el modal haciendo click fuera
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        e.preventDefault();
      }
    });
  },

  // Mostrar resumen del turno y esperar al siguiente jugador
  showTurnSummary(callback) {
    const modal = document.createElement("dialog");
    modal.className = "modal turn-summary-modal";

    const currentPlayerData = this.currentPlayer;
    const nextPlayer = this.partida.nombresJugadores.find(
      (j) =>
      j.numero === (this.partida.turnoActual % this.partida.jugadores) + 1
    );

    modal.innerHTML = `
            <div class="modal-content">
                <h2>Turno completado</h2>
                <div class="turn-info">
                    <p>Jugador actual: ${currentPlayerData.nombre}</p>
                    <p>Siguiente jugador: ${nextPlayer.nombre}</p>
                </div>
                <div class="player-board">
                    <h3>Tu tablero actual:</h3>
                    <!-- Mostrar mini-versión del tablero -->
                    <div class="board-summary">
                        ${Object.entries(currentPlayerData.tablero)
                          .map(
                            ([recinto, dinos]) => `
                            <div class="recinto-summary">
                                <h4>${this.getRecintoName(recinto)}</h4>
                                <div class="dinos-summary">
                                    ${dinos
                                      .map(
                                        (dino) =>
                                          `<div class="dino mini ${dino.color.toLowerCase()}"></div>`
                                      )
                                      .join("")}
                                </div>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
                <button class="modal-button" id="nextTurnBtn">
                    Pasar a ${nextPlayer.nombre}
                </button>
            </div>
        `;

    document.body.appendChild(modal);
    modal.showModal();

    modal.querySelector("#nextTurnBtn").addEventListener("click", () => {
      modal.close();
      modal.remove();
      callback();
    });
  },

  // Obtener nombre amigable del recinto
  getRecintoName(recintoId) {
    return RECINTO_NAMES[recintoId] || recintoId;
  },

  // Mostrar puntuaciones actuales
  showScores() {
    if (!window.ParkRules) return;
    if (!this.elements.scoresModal || !this.elements.scoresContent) return;

    const results = window.ParkRules.computeScoresForPartida(this.partida);

    this.elements.scoresContent.innerHTML = `
      <table class="scores-table">
        <thead>
          <tr>
            <th>Jugador</th>
            <th>Puntos</th>
            <th>Desglose</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(r => `
            <tr>
              <td>${r.nombre}</td>
              <td>${r.score}</td>
              <td>
                <details>
                  <summary>Ver desglose</summary>
                  <ul>
                    <li>Bosque: ${r.breakdown.bosque}</li>
                    <li>Prado: ${r.breakdown.prado}</li>
                    <li>Pradera: ${r.breakdown.praderaAmor}</li>
                    <li>Trío: ${r.breakdown.trioFrondoso}</li>
                    <li>Rey: ${r.breakdown.reySelva}</li>
                    <li>Isla: ${r.breakdown.islaSolitario}</li>
                    <li>Río: ${r.breakdown.rio}</li>
                    <li>T-Rex: ${r.breakdown.tRexBonus}</li>
                  </ul>
                </details>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    this.elements.scoresModal.showModal();
  },

  // Actualizar ronda y turno en la UI
  updateRoundTurn() {
    if (this.elements.currentRound) {
      this.elements.currentRound.textContent = this.partida.ronda || 0;
    }
    if (this.elements.currentTurn) {
      this.elements.currentTurn.textContent = this.partida.turnoActual || 0;
    }

    const totalJugadores = this.partida.nombresJugadores.length;

    // Habilitar/deshabilitar botón según si el jugador tiene dinosaurios en la mano
    if (this.elements.endTurnBtn && this.currentPlayer) {
      const tieneDinosEnMano = this.currentPlayer.mano && this.currentPlayer.mano.length > 0;
      
      if (tieneDinosEnMano && this.isCurrentPlayersTurn()) {
        this.elements.endTurnBtn.disabled = true;
        this.elements.endTurnBtn.classList.add("disabled");
        this.elements.endTurnBtn.title = "Debes colocar todos tus dinosaurios antes de terminar el turno";
      } else {
        this.elements.endTurnBtn.disabled = false;
        this.elements.endTurnBtn.classList.remove("disabled");
        this.elements.endTurnBtn.title = "";
      }
    }

    if (this.elements.totalPlayers) {
      this.elements.totalPlayers.textContent = totalJugadores;
    }

    // Actualizar nombre del jugador actual en el HUD
    if (this.elements.currentPlayerName) {
      if (this.currentPlayer) {
        this.elements.currentPlayerName.textContent = this.currentPlayer.nombre;
        this.elements.currentPlayerName.className = this.isCurrentPlayersTurn()
          ? "active-player"
          : "";
      } else {
        this.elements.currentPlayerName.textContent = "-";
      }
    }
  },

  // Actualizar lista de jugadores
  updatePlayerList() {
    if (!this.elements.playerList) return;
    
    this.elements.playerList.innerHTML = "";

    this.partida.nombresJugadores.forEach((jugador) => {
      const li = document.createElement("li");
      li.className =
        "player-item" +
        (jugador.numero === this.partida.turnoActual ? " current" : "");

      // Iconos según el estado del jugador
      const statusIcon = jugador.numero === this.partida.turnoActual
          ? "🎮"
          : jugador.esAdmin
          ? "👑"
          : "👤";
      li.innerHTML = `
                <span class="badge">${statusIcon}</span>
                <div class="player-info">
                    <span class="player-name">${jugador.nombre}</span>
                    ${
                      jugador.esAdmin
                        ? '<span class="player-role">(Anfitrión)</span>'
                        : ""
                    }
                </div>
            `;
      this.elements.playerList.appendChild(li);
    });
  },

  // Configurar drag & drop de dinosaurios
  setupDragAndDrop() {
    document.querySelectorAll(".dinos-area").forEach((area) => {
      area.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });

      area.addEventListener("drop", (e) => {
        e.preventDefault();
        if (!this.draggedDino || !this.isCurrentPlayersTurn()) return;

        const recinto = area.dataset.recinto;
        if (this.isValidMove(this.draggedDino, recinto)) {
          this.moveDino(this.draggedDino, recinto);
        }
      });
    });
  },

  // Validar si un movimiento es legal según las reglas del recinto
  isValidMove(dino, recintoId) {
    if (!this.currentPlayer || !this.currentPlayer.tablero) return false;

    const recinto = this.currentPlayer.tablero[recintoId] || [];

    switch (recintoId) {
      case "bosqueSemejanza":
        return recinto.length === 0 || recinto.every((d) => d.id === dino.id);

      case "pradoDiferencia":
        return !recinto.some((d) => d.id === dino.id);

      case "trioFrondoso":
        return recinto.length < 3;

      case "reySelva":
      case "islaSolitario":
        return recinto.length === 0;

      case "praderaAmor":
      case "rio":
        return true; // Sin restricciones

      default:
        return false;
    }
  },

  // Mover un dinosaurio a un recinto
  moveDino(dino, recintoId) {
    // Validar que existe el jugador y su tablero
    if (!this.currentPlayer) return;

    // Asegurarse de que el tablero existe y tiene la estructura correcta
    if (!this.currentPlayer.tablero) {
      this.currentPlayer.tablero = this._createEmptyBoard();
    }

    // Asegurarse de que el recinto existe en el tablero
    if (!this.currentPlayer.tablero[recintoId]) {
      this.currentPlayer.tablero[recintoId] = [];
    }

    // Remover de la mano
    const manoIndex = this.currentPlayer.mano.findIndex(
      (d) => d.id === dino.id && d.color === dino.color
    );
    if (manoIndex === -1) return;

    // Mover el dinosaurio de la mano al recinto
    this.currentPlayer.mano.splice(manoIndex, 1);
    this.currentPlayer.tablero[recintoId].push(dino);

    // Buscar y actualizar el jugador en la lista de jugadores de la partida
    const playerIndex = this.partida.nombresJugadores.findIndex(
      (j) => j.numero === this.currentPlayer.numero
    );
    if (playerIndex !== -1) {
      this.partida.nombresJugadores[playerIndex] = this.currentPlayer;
    }

    // Actualizar localStorage y UI
    this._savePartida();
    this.updateGameState();
  },

  // Actualizar la mano del jugador en la UI
  updatePlayerHand() {
    if (!this.elements.playerHand) return;

    this.elements.playerHand.innerHTML = "";

    const partidaActual = this._getPartida();
    if (!partidaActual) return;

    // Obtener jugador del turno actual
    const jugadorTurnoActual = partidaActual.nombresJugadores.find(
        j => j.numero === partidaActual.turnoActual
    );

    // Solo renderizar si es el turno del jugador y tiene cartas
    if (jugadorTurnoActual?.mano?.length > 0 && this.isCurrentPlayersTurn()) {
        jugadorTurnoActual.mano.forEach(dino => {
            const dinoEl = document.createElement("div");
            dinoEl.className = `dino ${dino.color.toLowerCase()}`;
            dinoEl.draggable = true;
            dinoEl.dataset.id = dino.id;
            dinoEl.dataset.color = dino.color;

            // Estilos visuales
            dinoEl.style.width = "60px";
            dinoEl.style.height = "60px";
            dinoEl.style.border = "2px solid #333";
            dinoEl.style.margin = "5px";
            dinoEl.style.display = "inline-block";
            dinoEl.style.backgroundColor = dino.color.toLowerCase();

            dinoEl.addEventListener("dragstart", (e) => {
                this.draggedDino = dino;
                e.dataTransfer.setData("text/plain", "");
            });

            this.elements.playerHand.appendChild(dinoEl);
        });
    }
  },

  // Actualizar estado de los recintos en la UI
  updateRecintos() {
    if (!this.currentPlayer || !this.currentPlayer.tablero) return;

    // Object.entries() convierte el objeto tablero en array de [clave, valor]
    // Luego iteramos con forEach y desestructuramos cada entrada en [recintoId, dinos]
    // Ejemplo: ["bosqueSemejanza", [dino1, dino2]] → recintoId="bosqueSemejanza", dinos=[dino1, dino2]
    Object.entries(this.currentPlayer.tablero).forEach(([recintoId, dinos]) => {
      const area = document.querySelector(`[data-recinto="${recintoId}"]`);
      if (!area) return;

      area.innerHTML = "";
      dinos.forEach((dino) => {
        const dinoEl = document.createElement("div");
        dinoEl.className = `dino ${dino.color.toLowerCase()}`;
        area.appendChild(dinoEl);
      });
    });
  },

  finishGameUI() {
    const startBtn = document.getElementById("startRoundBtn");
    if (startBtn) {
      const finalizeBtn = startBtn.cloneNode(true);
      finalizeBtn.textContent = "Finalizar partida";
      finalizeBtn.classList.add("end-game");
      finalizeBtn.addEventListener("click", () => this.finishGame());

      startBtn.replaceWith(finalizeBtn);
      this.elements.startRoundBtn = finalizeBtn;
    }
  },

  // Finalizar la partida
  async finishGame() {
    const scores = window.ParkRules.computeScoresForPartida(this.partida);
    this.showScores();

    // Guardar en la base de datos
    if (this.partida.id_partida) {
      try {
        const response = await fetch('http://localhost/sauriogames/api/index.php?action=finalizar_partida', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_partida: this.partida.id_partida,
            scores: scores,
            jugadores: this.partida.nombresJugadores
          })
        });

        const result = await response.json();
        
        if (result.success) {
          alert("¡Partida finalizada y guardada en la base de datos!");
          localStorage.removeItem("partidaActual");
          // Opcional: redirigir a página de resultados
          // window.location.href = "/sauriogames/frontend/pages/resultados.html?id=" + this.partida.id_partida;
        } else {
          alert("Error al guardar la partida: " + result.error);
        }
      } catch (error) {
        console.error('Error al guardar partida:', error);
        alert("Error de conexión al guardar la partida");
      }
    } else {
      alert("¡Partida finalizada! (No se guardó en BD porque no se inició desde el botón)");
    }

    this.partida.estado = "finalizada";
    this._savePartida();
  },

  // Salir de la partida
  async exitGame() {
    if (confirm("¿Seguro que quieres abandonar la partida? Se eliminará completamente")) {
      if (this.partida && this.partida.id_partida) {
        try {
          const { deleteGame } = await import("./deleteGame.js");
          await deleteGame(this.partida.id_partida);
          localStorage.removeItem("partidaActual");
          window.location.href = "../index.html";
        } catch (err) {
          console.error('Error al eliminar partida:', err);
          alert("Error al intentar eliminar la partida: " + err.message);
        }
      } else {
        localStorage.removeItem("partidaActual");
        window.location.href = "../index.html";
      }
    }
  },

  // Mostrar diálogo de selección de dinosaurios
  async showDinoSelectionDialog() {
    // Cargar template si no existe aún
    if (!document.getElementById("dinoSidebar")) {
      const res = await fetch(DINO_SELECTION_TEMPLATE_URL, { cache: "no-store" });
      const html = await res.text();
      document.body.insertAdjacentHTML("beforeend", html);
      // Esperar al DOM
      await new Promise((r) => requestAnimationFrame(r));
    }

    // Tomar referencias (ya existen)
    const sidebar = document.getElementById("dinoSidebar");
    const overlay = document.getElementById("overlay");
    const dinosContainer = document.getElementById("sidebarDinos");
    const confirmBtn = document.getElementById("confirmDinoSelection");
    const playerNameEl = document.getElementById("nombreJugador");
    const dinoCountEl = document.getElementById("dinoCount");

    // Datos de jugador actual
    const currentPlayer =
      this.currentPlayer ||
      this.partida.nombresJugadores.find(
        (j) => j.numero === this.partida.turnoActual
      );
    if (!currentPlayer) {
      console.error("[Sidebar] No encontré currentPlayer");
      return;
    }
    playerNameEl.textContent = currentPlayer.nombre;

    // Render de dinos
    dinosContainer.innerHTML = DINO_TYPES
    .map(
      (t) => `
      <div class="dino-card" data-id="${t.id}" data-color="${t.color}">
          <div class="dinobtn ${t.color.toLowerCase()}" style="width: 80px; height: 80px; margin: 0 auto;"></div>
          <div class="counter-controls">
              <button class="minus" disabled>-</button>
              <span class="count">0</span>
              <button class="plus">+</button>
          </div>
      </div>
    `
      )
      .join("");

    // Mostrar sidebar + overlay
    sidebar.classList.add("open");
    overlay.classList.add("show");

    // Lógica de selección
    const selectedDinos = [];
    const updateUI = () => {
      const total = selectedDinos.length;

      // Actualizar contador en el header
      dinoCountEl.textContent = `${total}/${MAX_DINOS_PER_HAND}`;

      // Actualizar contadores individuales
      dinosContainer.querySelectorAll(".dino-card").forEach((card) => {
        const id = parseInt(card.dataset.id);
        const color = card.dataset.color;
        const count = selectedDinos.filter(
          (d) => d.id === id && d.color === color
        ).length;

        const countSpan = card.querySelector(".count");
        const minusBtn = card.querySelector(".minus");
        const plusBtn = card.querySelector(".plus");

        countSpan.textContent = count;
        minusBtn.disabled = count === 0;
        plusBtn.disabled = total >= MAX_DINOS_PER_HAND;
        card.classList.toggle("selected", count > 0);
      });
    };

    // Evitar listeners duplicados si abrís varias veces
    const confirmBtnClone = confirmBtn.cloneNode(true);
    confirmBtn.replaceWith(confirmBtnClone);

    dinosContainer.querySelectorAll(".dino-card").forEach((card) => {
      const minusBtn = card.querySelector(".minus");
      const plusBtn = card.querySelector(".plus");
      const countSpan = card.querySelector(".count");
      let count = 0;

      const updateCount = () => {
        countSpan.textContent = count;
        minusBtn.disabled = count === 0;
        plusBtn.disabled = selectedDinos.length >= MAX_DINOS_PER_HAND;
        card.classList.toggle("selected", count > 0);
      };

      minusBtn.addEventListener("click", () => {
        if (count > 0) {
          count--;
          const index = selectedDinos.findLastIndex(
            (d) =>
              d.id === parseInt(card.dataset.id, 10) &&
              d.color === card.dataset.color
          );
          if (index !== -1) {
            selectedDinos.splice(index, 1);
          }
          updateCount();
          updateUI();
        }
      });

      plusBtn.addEventListener("click", () => {
        if (selectedDinos.length < MAX_DINOS_PER_HAND) {
          count++;
          selectedDinos.push({
            id: parseInt(card.dataset.id, 10),
            color: card.dataset.color,
          });
          updateCount();
          updateUI();
        }
      });

      updateCount();
    });

    confirmBtnClone.addEventListener("click", () => {
      if (selectedDinos.length !== MAX_DINOS_PER_HAND) {
        alert(`¡Debes seleccionar exactamente ${MAX_DINOS_PER_HAND} dinosaurios!`);
        return;
      }

      const playerIndex = this.partida.nombresJugadores.findIndex(
        (j) => j.numero === currentPlayer.numero
      );

      if (playerIndex !== -1) {
        const dinosCopy = selectedDinos.map((dino) => ({ ...dino }));
        const partidaActual = this._getPartida();

        const jugadorActualizado = {
          ...partidaActual.nombresJugadores[playerIndex],
          mano: dinosCopy,
          haSeleccionado: true,
        };

        partidaActual.nombresJugadores[playerIndex] = jugadorActualizado;
        this.partida = partidaActual;
        this.currentPlayer = jugadorActualizado;

        console.log("Guardando dinosaurios para", this.currentPlayer.nombre, ":", {
          dinosaurios: dinosCopy,
          jugador: partidaActual.nombresJugadores[playerIndex],
        });

        this._savePartida();
        this.updateGameState();
        this.updatePlayerHand();

        sidebar.classList.remove("open");
        overlay.classList.remove("show");
      } else {
        console.error("No se encontró el jugador actual en la lista de jugadores");
        return;
      }
    });

    requestAnimationFrame(() => {
      const closeBtn = document.querySelector(".close-btn");
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          if (selectedDinos.length !== MAX_DINOS_PER_HAND) {
            alert(`¡Debes seleccionar exactamente ${MAX_DINOS_PER_HAND} dinosaurios!`);
          }
        });
      }
      if (overlay) {
        overlay.addEventListener("click", (e) => {
          e.preventDefault();
          if (selectedDinos.length !== MAX_DINOS_PER_HAND) {
            alert(`¡Debes seleccionar exactamente ${MAX_DINOS_PER_HAND} dinosaurios!`);
          }
        });
      }
    });

    updateUI();
  }
};

// Manejo de salida de la partida
window.addEventListener('beforeunload', (event) => {
  const partidaActual = JSON.parse(localStorage.getItem('partidaActual'));
  if (partidaActual && partidaActual.id_partida) {
    event.preventDefault();
    event.returnValue = '¿Estás seguro? Si salis, la partida se eliminará.';
  }
});

// Manejar clic en el botón de salir si existe
document.addEventListener('DOMContentLoaded', () => {
  Game.init();
});