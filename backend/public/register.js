// Registro de usuario
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);

  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      // Registro exitoso
      document.getElementById('registerMessage').className = 'mt-4 p-3 rounded-lg bg-green-100 text-green-800 border border-green-200';
      document.getElementById('registerMessage').textContent = 'Usuario registrado exitosamente. Redirigiendo...';
      document.getElementById('registerMessage').classList.remove('hidden');

      // Redirigir a login después de 2 segundos
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);
    } else {
      // Error en registro
      document.getElementById('registerMessage').className = 'mt-4 p-3 rounded-lg bg-red-100 text-red-800 border border-red-200';
      document.getElementById('registerMessage').textContent = result.message || 'Error al registrar usuario';
      document.getElementById('registerMessage').classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('registerMessage').className = 'mt-4 p-3 rounded-lg bg-red-100 text-red-800 border border-red-200';
    document.getElementById('registerMessage').textContent = 'Error de conexión';
    document.getElementById('registerMessage').classList.remove('hidden');
  }
});