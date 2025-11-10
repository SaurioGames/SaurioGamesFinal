const API_BASE = "http://localhost/sauriogames/api/index.php?entity=usuarios";

// Obtener usuarios
async function getUsuarios() {
  try {
    const res = await fetch(API_BASE);
    const data = await res.json();
    const list = document.getElementById("usuarios-list");
    list.innerHTML = "";
    data.forEach((user) => {
      const li = document.createElement("li");
      li.textContent = `${user.id_usuario} - ${user.nombre_usuario} (${user.correo})`;
      list.appendChild(li);
    });
  } catch (error) {
    console.error(error);
  }
}

// Crear usuario
async function createUsuario() {
  const correo = document.getElementById("correo").value;
  const nombre_usuario = document.getElementById("nombre").value;
  const contrasena = document.getElementById("contrasena").value;

  try {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, nombre_usuario, contrasena }),
    });
    const data = await res.json();
    alert(data.message);
    getUsuarios(); // Refresca la lista
  } catch (error) {
    console.error(error);
  }
}
