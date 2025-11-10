document.addEventListener("DOMContentLoaded", () => {
  // Verificamos si ya hay una partida activa
  const partidaActiva = JSON.parse(localStorage.getItem("partidaActual"));
  if (partidaActiva) {
    if (partidaActiva.estado === "iniciada") {
      alert("Ya hay una partida en curso. Continuá desde donde estabas.");
      window.location.href = "pages/game.html";
      return;
    } else if (partidaActiva.estado === "configurando") {
      alert("Tenés una partida en configuración pendiente.");
      window.location.href = "pages/players.html";
      return;
    }
  }

  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (usuario) {
    const profileNameEl = document.querySelector(".profile_name");
    const profileInfoH3 = document.querySelector(".profile_info h3");
    if (profileNameEl) profileNameEl.textContent = usuario.nombre_usuario;
    if (profileInfoH3) profileInfoH3.textContent = "Conectado";
  }

  let userLoggedIn = usuario !== null;

  const playBtn = document.getElementById("playBtn");
  const playWindow = document.getElementById("playWindow");
  const gameForm = document.getElementById("gameForm");

  if (playBtn) {
    // Abrir el diálogo al hacer click en Jugar
    playBtn.addEventListener("click", () => {
      if (!userLoggedIn) {
        toggleWindow("loginWindow"); // abrís tu modal de login
        return;
      }
      if (playWindow && typeof playWindow.showModal === "function") {
        playWindow.showModal();
      }
    });
  }

  if (gameForm) {
    // Cerrar el diálogo al enviar el formulario y crear la partida
    gameForm.addEventListener("submit", (e) => {
      e.preventDefault();

      if (!userLoggedIn) {
        toggleWindow("loginWindow");
        return;
      }

      const cantJugadores = parseInt(
        document.getElementById("cantJugadores").value,
        10
      );

      // Validación de cantidad de jugadores (ajusta min/max según reglas)
      if (!Number.isInteger(cantJugadores) || cantJugadores < 2 || cantJugadores > 6) {
        alert("Seleccioná una cantidad válida de jugadores (2-6).");
        return;
      }

      const partida = {
        id: Date.now(),
        jugadores: cantJugadores,
        estado: "configurando",
        // ronda/turno se inicializan cuando la partida pasa a 'iniciada'
        ronda: 0,
        turnoActual: 0,
        fecha: new Date().toISOString(),
        nombresJugadores: [],
      };

      console.log("Partida creada:", partida);

      // Guardamos la partida para la siguiente página
      localStorage.setItem("partidaActual", JSON.stringify(partida));

      // Cerramos el diálogo
      if (playWindow && typeof playWindow.close === "function") {
        playWindow.close();
      }

      // Redireccionamos a players.html
      window.location.href = "pages/players.html";
    });
  }
});