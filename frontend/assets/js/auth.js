async function login(nombre_usuario, contrasena) {
  try {
    // Query params:
    // - entity=usuarios: indica que la acción se refiere al recurso "usuarios" en el backend
    // - action=login: solicita la acción de inicio de sesión (POST con nombre_usuario y contrasena)
const response = await fetch('http://localhost/sauriogames/api/index.php?entity=usuarios&action=login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nombre_usuario, contrasena })
});

    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: 'Respuesta no es JSON', raw: text }; }

    if (response.ok) {
      // Guardar usuario y actualizar UI
      localStorage.setItem('usuario', JSON.stringify(data));
      updateProfileNameFromData(data);
      const dialog = document.getElementById('loginWindow');
      if (dialog && typeof dialog.close === 'function') dialog.close();
      console.log('Usuario logueado:', data);
    } else {
      console.error('Error:', data.error || data.message || data);
    }
  } catch (err) {
    console.error('Fallo de red:', err);
  }
}

async function signUp(correo, nombre_usuario, contrasena) {
  try {
    const response = await fetch("http://localhost/sauriogames/api/index.php?entity=usuarios", {

      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, nombre_usuario, contrasena })
    });

    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: 'Respuesta no es JSON', raw: text }; }
    if (response.ok) {
      const dialog = document.getElementById('signUpWindow');
      if (dialog && typeof dialog.close === 'function') dialog.close();
      console.log('Usuario creado:', data);
    } else {
      console.error('Error:', data.error || data.message || data);
    }
  } catch (err) {
    console.error('Fallo de red:', err);

  }
}

function updateProfileNameFromData(data) {
  const nombre = data && data.nombre_usuario ? data.nombre_usuario : null;
  if (!nombre) return;
  // Actualiza todos los lugares donde se muestra el nombre
  document.querySelectorAll('.profile_name').forEach(el => {
    el.textContent = nombre;
  });
}

// Inicializar nombre desde localStorage al cargar
(function initUserFromStorage() {
  try {
    const stored = localStorage.getItem('usuario');
    if (!stored) return;
    const usuario = JSON.parse(stored);
    updateProfileNameFromData(usuario);
  } catch { }
})();

// Esperar a que el DOM esté listo antes de vincular eventos
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const signUpForm = document.getElementById("signUpForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nombre_usuario = document.getElementById("login_username").value.trim();
      const contrasena = document.getElementById("login_password").value.trim();
      if (!nombre_usuario || !contrasena) {
        alert("Por favor completa todos los campos");
        return;
      }
      await login(nombre_usuario, contrasena);
    });
  }

  if (signUpForm) {
    signUpForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const correo = document.getElementById("signup_correo").value.trim();
      const nombre_usuario = document.getElementById("signup_username").value.trim();
      const contrasena = document.getElementById("signup_password").value.trim();
      if (!correo || !nombre_usuario || !contrasena) {
        alert("Por favor completa todos los campos");
        return;
      }
      await signUp(correo, nombre_usuario, contrasena);
    });
  }
});

