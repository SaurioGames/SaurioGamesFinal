document.addEventListener("DOMContentLoaded", () => {
  // Obtener datos del usuario y partida
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const partidaActual = JSON.parse(localStorage.getItem("partidaActual"));

  // Verificar que exista una partida en configuración
  if (!partidaActual || partidaActual.estado !== "configurando") {
    alert("No hay una partida en configuración. Redirigiendo al lobby.");
    window.location.href = "../index.html";
    return;
  }

  // Verificar que el usuario esté logueado
  if (!usuario || !usuario.nombre_usuario) {
    alert("Debes iniciar sesión para continuar.");
    window.location.href = "../index.html";
    return;
  }

  // Mostrar el nombre del admin (usuario logueado)
  const adminNameElement = document.getElementById("adminName");
  adminNameElement.textContent = usuario.nombre_usuario;

  // Generar campos de entrada para cada jugador
  const playersGrid = document.getElementById("playersGrid");
  const cantJugadores = partidaActual.jugadores;

  // Crear campos para los jugadores (el admin ya está arriba)
  for (let i = 2; i <= cantJugadores; i++) {
    const playerCard = document.createElement("div");
    playerCard.className = "player_card";
    
    const playerLabel = document.createElement("label");
    playerLabel.className = "player_label";
    playerLabel.setAttribute("for", `player${i}`);
    
    // SVG del ícono de editar
    const editIcon = `
      <svg class="edit_icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    `;
    
    playerLabel.innerHTML = `${editIcon} Jugador ${i}`;
    
    const playerInput = document.createElement("input");
    playerInput.type = "text";
    playerInput.id = `player${i}`;
    playerInput.name = `player${i}`;
    playerInput.className = "player_input";
    playerInput.placeholder = `Nombre del Jugadozr ${i}`;
    playerInput.maxLength = 20;
    playerInput.required = true;

    // Agregar evento para marcar como completado
    playerInput.addEventListener("input", () => {
      if (playerInput.value.trim() !== "") {
        playerCard.classList.add("filled");
      } else {
        playerCard.classList.remove("filled");
      }
    });

    playerCard.appendChild(playerLabel);
    playerCard.appendChild(playerInput);
    playersGrid.appendChild(playerCard);
  }

  // Manejar el botón de volver
  const backBtn = document.getElementById("backBtn");
  backBtn.addEventListener("click", () => {
    // Limpiar la partida actual
    localStorage.removeItem("partidaActual");
    window.location.href = "../index.html";
  });

  // Manejar el envío del formulario
  const playersForm = document.getElementById("playersForm");
  playersForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Recopilar los nombres de todos los jugadores
    const nombresJugadores = [];
    
    // Agregar primero al admin (Jugador 1)
    nombresJugadores.push({
      numero: 1,
      nombre: usuario.nombre_usuario,
      esAdmin: true
    });
    
    // Agregar los demás jugadores
    for (let i = 2; i <= cantJugadores; i++) {
      const input = document.getElementById(`player${i}`);
      const nombre = input.value.trim();
      
      if (!nombre) {
        alert(`Por favor, ingresa un nombre para el Jugador ${i}`);
        input.focus();
        return;
      }
      
      nombresJugadores.push({
        numero: i,
        nombre: nombre,
        esAdmin: false
      });
    }
    
    //Crear un tablero vacío para cada jugador
    function crearTableroVacio() {
      return {
        bosqueSemejanza: [],
        pradoDiferencia: [],
        praderaAmor: [],
        trioFrondoso: [],
        reySelva: [],
        islaSolitario: [],
        rio: []
      };
    }

    // Inicializar jugadores con tablero vacío y sin mano
    nombresJugadores.forEach((j) => {
      j.tablero = crearTableroVacio();
      j.mano = [];
      j.haSeleccionado = false;
    });

    // Actualizar la partida con los nombres de los jugadores y estado de partida
    partidaActual.nombresJugadores = nombresJugadores;
    partidaActual.ronda = 0; // Empieza en 0, se incrementa al iniciar ronda
    partidaActual.turnoActual = 1;
    partidaActual.estado = "iniciada";

    // Crear la partida en la base de datos
    try {
      console.log('Creando partida en BD...');
      const response = await fetch('http://localhost/sauriogames/api/index.php?action=crear_partida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cant_jugadores: cantJugadores,
          jugadores: nombresJugadores
        })
      });

      const result = await response.json();
      console.log('Respuesta del servidor:', result);

      if (result.success) {
        partidaActual.id_partida = result.id_partida;
        console.log('✅ Partida creada en BD con ID:', result.id_partida);
      } else {
        console.error('❌ Error al crear partida:', result.error);
        alert('Error al crear partida en BD: ' + result.error);
        return;
      }
    } catch (error) {
      console.error('❌ Error de red:', error);
      alert('Error de conexión. La partida se jugará sin guardar en BD.');
    }

    // Guardar la partida actualizada en localStorage
    localStorage.setItem("partidaActual", JSON.stringify(partidaActual));

    console.log("Partida iniciada con jugadores:", partidaActual);

    // Redirigir a la página del juego
    window.location.href = "game.html";
  });
});
