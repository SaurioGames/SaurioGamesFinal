// Reglas de recintos, generación de manos y cálculo de puntuación.
(function(window){
  const DINO_TYPES = [
    { id: 1, color: 'Verde' },
    { id: 2, color: 'Rojo' },  // ROJO = T-Rex
    { id: 3, color: 'Amarillo' },
    { id: 4, color: 'Violeta' },
    { id: 5, color: 'Naranja' },
    { id: 6, color: 'Azul' }
  ];

// Tablas de puntos 
  const BOSQUE_POINTS = {1:2,2:4,3:8,4:12,5:18,6:24};  // Bosque de la Semejanza
  const PRADO_POINTS  = {1:1,2:3,3:6,4:10,5:15,6:21};  // Prado de la Diferencia

  // Crear tablero vacío con los recintos nombrados en las reglas.
  function crearTableroVacioGame() {
    return {
      bosqueSemejanza: [], // varios dinos, todos misma especie
      pradoDiferencia: [], // varios dinos, todas especies distintas
      praderaAmor: [],     // parejas de misma especie
      trioFrondoso: [],    // hasta 3
      reySelva: [],        // solo 1
      islaSolitario: [],   // solo 1
      rio: []              // zona especial
    };
  }

  // Generar una mano de 6 dinos aleatorios
  function generarManoGame() {
    const mano = [];
    for (let i = 0; i < 6; i++) {
      const tipo = DINO_TYPES[Math.floor(Math.random() * DINO_TYPES.length)];
      mano.push({ id: tipo.id, color: tipo.color });
    }
    return mano;
  }

  // Repartir 6 dinos a cada jugador al inicio de una ronda
  function dealInitialHands(partida) {
    if (!partida || !partida.nombresJugadores) return partida;
    partida.nombresJugadores.forEach(j => {
      j.mano = generarManoGame();
      // Asegurar que cada jugador tenga tablero con la estructura nueva
      if (!j.tablero) j.tablero = crearTableroVacioGame();
    });
    // Guardar cambios
    localStorage.setItem('partidaActual', JSON.stringify(partida));
    return partida;
  }

  // Utilidad: cuenta por especie (id) en un array de dinos
  function countBySpecies(arr) {
    const counts = {};
    arr.forEach(d => { counts[d.id] = (counts[d.id] || 0) + 1; });
    return counts;
  }

  // Comprobar si un recinto contiene al menos un T-Rex (rojo -> id 2)
  function recintoTieneTRex(recinto) {
    return recinto.some(d => d.color === 'Rojo' || d.id === 2);
  }

  // Computa la puntuación total de un jugador, dada la lista de todos los jugadores
  function computeScoreForPlayer(jugador, todosJugadores) {
    let score = 0;
    const breakdown = {};

    const tRexBonusPerRecinto = 1; // +1 por recinto que contenga al menos un T-Rex

    // Bosque de la Semejanza: todos dinos deben ser de la misma especie
    const bosque = jugador.tablero.bosqueSemejanza || [];
    if (bosque.length > 0) {
      const species = Object.keys(countBySpecies(bosque));
      if (species.length === 1) {
        const pts = BOSQUE_POINTS[bosque.length] || 0;
        score += pts;
        breakdown.bosque = pts;
      } else {
        breakdown.bosque = 0; // incumple la condición
      }
    } else {
      breakdown.bosque = 0;
    }

    // Prado de la Diferencia: todas especies distintas
    const prado = jugador.tablero.pradoDiferencia || [];
    if (prado.length > 0) {
      const counts = countBySpecies(prado);
      const distinct = Object.keys(counts).length === prado.length;
      if (distinct) {
        const pts = PRADO_POINTS[prado.length] || 0;
        score += pts;
        breakdown.prado = pts;
      } else {
        breakdown.prado = 0;
      }
    } else {
      breakdown.prado = 0;
    }

    // Pradera del Amor: 5 puntos por cada pareja de la misma especie
    const pradera = jugador.tablero.praderaAmor || [];
    if (pradera.length > 0) {
      const counts = countBySpecies(pradera);
      let parejas = 0;
      Object.values(counts).forEach(c => { parejas += Math.floor(c / 2); });
      const pts = parejas * 5;
      score += pts;
      breakdown.praderaAmor = pts;
    } else {
      breakdown.praderaAmor = 0;
    }

    // Trío Frondoso: exactamente 3 dinos -> 7 pts
    const trio = jugador.tablero.trioFrondoso || [];
    if (trio.length === 3) {
      score += 7;
      breakdown.trioFrondoso = 7;
    } else {
      breakdown.trioFrondoso = 0;
    }

    // Rey de la Selva: solo 1 dino; 7 pts si nadie tiene más dinos de esa especie en su parque
    const rey = jugador.tablero.reySelva || [];
    if (rey.length === 1) {
      const especieId = rey[0].id;
      // contar en los parques de todos (sumando todos los recintos excepto rio)
      let maxOtros = 0;
      todosJugadores.forEach(p => {
        const total = totalSpeciesInPark(p, especieId);
        if (p.numero !== jugador.numero) maxOtros = Math.max(maxOtros, total);
      });
      const propio = totalSpeciesInPark(jugador, especieId);
      if (propio >= maxOtros) {
        score += 7;
        breakdown.reySelva = 7;
      } else {
        breakdown.reySelva = 0;
      }
    } else {
      breakdown.reySelva = 0;
    }

    // Isla Solitaria: solo 1 dino; 7 pts si es el único de su especie en TU parque
    const isla = jugador.tablero.islaSolitario || [];
    if (isla.length === 1) {
      const especieId = isla[0].id;
      const propio = totalSpeciesInPark(jugador, especieId);
      if (propio === 1) {
        score += 7;
        breakdown.islaSolitario = 7;
      } else {
        breakdown.islaSolitario = 0;
      }
    } else {
      breakdown.islaSolitario = 0;
    }

    // Río: cada dino en río vale 1 punto
    const rio = jugador.tablero.rio || [];
    const rioPts = rio.length * 1;
    score += rioPts;
    breakdown.rio = rioPts;

    // Bonus T-Rex: cada recinto (NO el río) que contenga al menos un T-Rex suma +1
    const recintos = ['bosqueSemejanza','pradoDiferencia','praderaAmor','trioFrondoso','reySelva','islaSolitario'];
    let tRexBonuses = 0;
    recintos.forEach(r => {
      const recinto = jugador.tablero[r] || [];
      if (recintoTieneTRex(recinto)) tRexBonuses += tRexBonusPerRecinto;
    });
    score += tRexBonuses;
    breakdown.tRexBonus = tRexBonuses;

    return { score, breakdown };
  }

  // Cuenta cuántos dinos de una especie hay en el parque del jugador (excluye río si se desea)
  function totalSpeciesInPark(jugador, especieId) {
    let total = 0;
    const keys = ['bosqueSemejanza','pradoDiferencia','praderaAmor','trioFrondoso','reySelva','islaSolitario'];
    keys.forEach(k => {
      const arr = jugador.tablero[k] || [];
      arr.forEach(d => { if (d.id === especieId) total++; });
    });
    return total;
  }

  // Calcular puntuaciones para todos los jugadores en la partida
  function computeScoresForPartida(partida) {
    if (!partida || !partida.nombresJugadores) return [];
    const results = partida.nombresJugadores.map(j => {
      const res = computeScoreForPlayer(j, partida.nombresJugadores);
      return {
        numero: j.numero,
        nombre: j.nombre,
        score: res.score,
        breakdown: res.breakdown
      };
    });
    return results;
  }

  // Exponer API global
  window.ParkRules = {
    DINO_TYPES,
    crearTableroVacioGame,
    generarManoGame,
    dealInitialHands,
    computeScoresForPartida,
    computeScoreForPlayer
  };

})(window);
