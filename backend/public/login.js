// Inicio de sesión
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);

  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      // Login exitoso
      sessionStorage.setItem('jwt_token', response.headers.get('token'));
      sessionStorage.setItem('user', JSON.stringify(result.user));

      document.getElementById('loginMessage').className = 'mt-4 p-3 rounded-lg bg-green-100 text-green-800 border border-green-200';
      document.getElementById('loginMessage').textContent = 'Inicio de sesión exitoso. Redirigiendo...';
      document.getElementById('loginMessage').classList.remove('hidden');

      // Redirigir a dashboard después de 1 segundo
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1000);
    } else {
      // Error en login
      document.getElementById('loginMessage').className = 'mt-4 p-3 rounded-lg bg-red-100 text-red-800 border border-red-200';
      document.getElementById('loginMessage').textContent = result.message || 'Error al iniciar sesión';
      document.getElementById('loginMessage').classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('loginMessage').className = 'mt-4 p-3 rounded-lg bg-red-100 text-red-800 border border-red-200';
    document.getElementById('loginMessage').textContent = 'Error de conexión';
    document.getElementById('loginMessage').classList.remove('hidden');
  }
});