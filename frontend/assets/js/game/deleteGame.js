// Función para eliminar la partida y sus relaciones
async function deleteGame(gameId) {
  try {
    const response = await fetch(`http://localhost/sauriogames/api/index.php?entity=partidas&action=eliminar&id=${gameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_partida: gameId })
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: 'Respuesta no es JSON', raw: text };
    }

    if (response.ok) {
      console.log('Partida eliminada:', data);
      window.location.href = '../index.html'; // Redirigir al inicio
    } else {
      console.error('Error al eliminar partida:', data.error || data.message || data);
      alert('Error al eliminar la partida. Por favor intenta de nuevo.');
    }
  } catch (err) {
    console.error('Fallo de red al eliminar partida:', err);
    alert('Error de conexión al eliminar la partida. Por favor intenta de nuevo.');
  }
}

export { deleteGame };