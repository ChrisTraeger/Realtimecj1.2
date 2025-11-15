const baseURL = window.location.origin;
const token = sessionStorage.getItem("jwt_token");

if (!token) {
  window.location.href = "login.html";
}

// Decodificar token para obtener username
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const userData = parseJwt(token);
if (userData) {
  document.getElementById("username").innerText = userData.username;
}

// Cargar salas activas
async function loadRooms() {
  console.log("Iniciando carga de salas...");
  console.log("Token disponible:", !!token);
  console.log("UserData:", userData);

  if (!token) {
    console.error("No hay token, redirigiendo a login");
    window.location.href = "login.html";
    return;
  }

  try {
    console.log("Haciendo fetch a:", `${baseURL}/rooms`);
    const resp = await fetch(`${baseURL}/rooms`, {
      headers: { token }
    });
    console.log("Respuesta HTTP:", resp.status, resp.statusText);

    if (!resp.ok) {
      throw new Error(`Error HTTP: ${resp.status} - ${resp.statusText}`);
    }

    const rooms = await resp.json();
    console.log("Salas recibidas:", rooms);

    const container = document.getElementById("roomsList");
    container.innerHTML = "";

    if (rooms.length === 0) {
      console.log("No hay salas, mostrando mensaje vacío");
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="text-6xl mb-4">🏠</div>
          <h3 class="text-xl font-semibold text-gray-700 mb-2">No has creado salas aún</h3>
          <p class="text-gray-500 mb-4">¡Crea tu primera sala para comenzar a organizar reuniones!</p>
          <button onclick="showCreateRoomModal()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
            Crear Mi Primera Sala
          </button>
          <button onclick="loadAllRooms()" class="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold mt-4">
            Ver Todas las Salas
          </button>
        </div>
      `;
      return;
// Nueva función para ver todas las salas activas
async function loadAllRooms() {
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  const container = document.getElementById("roomsList");
  container.innerHTML = `<div class='flex justify-center items-center py-8'><div class='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div><span class='ml-3 text-gray-600'>Cargando todas las salas...</span></div>`;
  try {
    const resp = await fetch(`${baseURL}/rooms/all`, {
      headers: { token }
    });
    if (!resp.ok) throw new Error("Error al cargar todas las salas");
    const rooms = await resp.json();
    container.innerHTML = "";
    if (rooms.length === 0) {
      container.innerHTML = `<div class='text-center py-12'><div class='text-6xl mb-4'>🌐</div><h3 class='text-xl font-semibold text-gray-700 mb-2'>No hay salas activas</h3></div>`;
      return;
    }
    rooms.forEach(room => {
      const div = document.createElement("div");
      div.className = "bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100";
      div.innerHTML = `
        <div class='cursor-pointer' onclick="enterRoom('${room.code}')">
          <div class='flex justify-between items-start mb-3'>
            <span class='bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold'>${room.code}</span>
            <span class='text-sm text-gray-500'>${new Date(room.createdAt).toLocaleDateString()}</span>
          </div>
          <h4 class='text-xl font-bold text-gray-800 mb-2'>${room.name}</h4>
          <p class='text-gray-600 mb-3'>${room.description || 'Sin descripción'}</p>
          <div class='flex justify-between items-center text-sm text-gray-500'>
            <span>Creada por: <b class='text-blue-600'>${room.creator.username}</b></span>
            <span>Encuestas: ${room._count.polls}</span>
          </div>
        </div>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    container.innerHTML = `<div class='text-center py-12 text-red-600'>Error al cargar todas las salas</div>`;
  }
}
    }

    console.log("Mostrando", rooms.length, "salas");
    rooms.forEach(room => {
      console.log("Procesando sala:", room.name, room.code);
      const div = document.createElement("div");
      div.className = "bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100";

      // Como ahora solo se muestran salas del usuario, siempre mostrar botones de editar/eliminar
      const actionButtons = `
        <div class="flex space-x-2 mt-4">
          <button onclick="editRoom(${room.id}, '${room.name.replace(/'/g, "\\'")}', '${(room.description || '').replace(/'/g, "\\'")}')"
                  class="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center">
            ✏️ Editar
          </button>
          <button onclick="deleteRoom(${room.id}, '${room.name.replace(/'/g, "\\'")}')"
                  class="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center">
            🗑️ Eliminar
          </button>
        </div>
      `;

      div.innerHTML = `
        <div class="cursor-pointer" onclick="enterRoom('${room.code}')">
          <div class="flex justify-between items-start mb-3">
            <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">${room.code}</span>
            <span class="text-sm text-gray-500">${new Date(room.createdAt).toLocaleDateString()}</span>
          </div>
          <h4 class="text-xl font-bold text-gray-800 mb-2">${room.name}</h4>
          <p class="text-gray-600 mb-3">${room.description || 'Sin descripción'}</p>
          <div class="flex justify-between items-center text-sm text-gray-500">
            <span>Creada por: <b class="text-blue-600">${room.creator.username}</b></span>
            <span>Votaciones: <b class="text-green-600">${room._count.polls}</b></span>
          </div>
        </div>
        ${actionButtons}
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error al cargar salas:", err);
    const container = document.getElementById("roomsList");
    container.innerHTML = `
      <div class="text-center py-12">
        <div class="text-red-500 mb-4">⚠️</div>
        <h3 class="text-xl font-semibold text-gray-700 mb-2">Error al cargar salas</h3>
        <p class="text-gray-500 mb-4">Error: ${err.message}</p>
        <button onclick="loadRooms()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
          Reintentar
        </button>
      </div>
    `;
  }
}// Crear sala
async function createRoom() {
  const name = document.getElementById("roomName").value;
  const description = document.getElementById("roomDescription").value;
  const msg = document.getElementById("createMsg");
  
  if (!name) {
    msg.innerText = "El nombre es requerido";
    msg.className = "msg msg-error";
    return;
  }
  
  try {
    const resp = await fetch(`${baseURL}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token
      },
      body: JSON.stringify({ name, description })
    });
    
    const data = await resp.json();
    
    if (resp.ok) {
      msg.innerText = `¡Sala creada! Código: ${data.code}`;
      msg.className = "msg msg-success";
      setTimeout(() => {
        hideCreateRoomModal();
        enterRoom(data.code);
      }, 1500);
    } else {
      msg.innerText = data.message || "Error al crear sala";
      msg.className = "msg msg-error";
    }
  } catch (err) {
    msg.innerText = "Error de conexión";
    msg.className = "msg msg-error";
  }
}

// Unirse con código
async function joinRoom() {
  const code = document.getElementById("roomCode").value.toUpperCase();
  const msg = document.getElementById("joinMsg");
  
  if (!code) {
    msg.innerText = "Ingresa un código";
    msg.className = "msg msg-error";
    return;
  }
  
  try {
    const resp = await fetch(`${baseURL}/rooms/${code}`, {
      headers: { token }
    });
    
    if (resp.ok) {
      enterRoom(code);
    } else {
      msg.innerText = "Sala no encontrada";
      msg.className = "msg msg-error";
    }
  } catch (err) {
    msg.innerText = "Error de conexión";
    msg.className = "msg msg-error";
  }
}

function enterRoom(code) {
  window.location.href = `room.html?code=${code}`;
}

function logout() {
  sessionStorage.removeItem("jwt_token");
  window.location.href = "login.html";
}

// Editar sala
async function editRoom(roomId, currentName, currentDescription) {
  // Mostrar modal de edición
  document.getElementById("editRoomId").value = roomId;
  document.getElementById("editRoomName").value = currentName;
  document.getElementById("editRoomDescription").value = currentDescription;
  showEditRoomModal();
}

// Actualizar sala (desde el modal)
async function updateRoom() {
  const roomId = document.getElementById("editRoomId").value;
  const name = document.getElementById("editRoomName").value;
  const description = document.getElementById("editRoomDescription").value;
  const msg = document.getElementById("editMsg");
  
  if (!name.trim()) {
    msg.innerText = "El nombre es requerido";
    msg.className = "msg msg-error";
    return;
  }
  
  try {
    const resp = await fetch(`${baseURL}/rooms/${roomId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        token
      },
      body: JSON.stringify({ 
        name: name.trim(), 
        description: description.trim() 
      })
    });
    
    const data = await resp.json();
    
    if (resp.ok) {
      msg.innerText = "Sala actualizada correctamente";
      msg.className = "msg msg-success";
      setTimeout(() => {
        hideEditRoomModal();
        loadRooms(); // Recargar la lista
      }, 1500);
    } else {
      msg.innerText = data.message || "Error al actualizar la sala";
      msg.className = "msg msg-error";
    }
  } catch (err) {
    msg.innerText = "Error de conexión";
    msg.className = "msg msg-error";
  }
}

// Eliminar sala
async function deleteRoom(roomId, roomName) {
  if (!confirm(`¿Estás seguro de que quieres eliminar la sala "${roomName}"? Esta acción no se puede deshacer.`)) {
    return;
  }
  
  try {
    const resp = await fetch(`${baseURL}/rooms/${roomId}`, {
      method: "DELETE",
      headers: { token }
    });
    
    if (resp.ok) {
      alert("Sala eliminada correctamente");
      loadRooms(); // Recargar la lista
    } else {
      const data = await resp.json();
      alert(data.message || "Error al eliminar la sala");
    }
  } catch (err) {
    alert("Error de conexión");
    console.error(err);
  }
}


function showCreateRoomModal() {
  document.getElementById("createRoomModal").style.display = "flex";
}

function hideCreateRoomModal() {
  document.getElementById("createRoomModal").style.display = "none";
  document.getElementById("roomName").value = "";
  document.getElementById("roomDescription").value = "";
  document.getElementById("createMsg").textContent = "";
  document.getElementById("createMsg").className = "alert";
}

function showJoinRoomModal() {
  document.getElementById("joinRoomModal").style.display = "flex";
}

function hideJoinRoomModal() {
  document.getElementById("joinRoomModal").style.display = "none";
  document.getElementById("roomCode").value = "";
  document.getElementById("joinMsg").textContent = "";
  document.getElementById("joinMsg").className = "alert";
}

function showEditRoomModal() {
  document.getElementById("editRoomModal").style.display = "flex";
}

function hideEditRoomModal() {
  document.getElementById("editRoomModal").style.display = "none";
  document.getElementById("editRoomId").value = "";
  document.getElementById("editRoomName").value = "";
  document.getElementById("editRoomDescription").value = "";
  document.getElementById("editMsg").textContent = "";
  document.getElementById("editMsg").className = "alert";
}

// Cargar al inicio
loadRooms();

// Actualizar cada 5 segundos
setInterval(loadRooms, 5000);

// Vincular formularios cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const createForm = document.getElementById('createRoomForm');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await createRoom();
      // Intentamos refrescar la lista por si el usuario permanece en el dashboard
      try { loadRooms(); } catch (err) { /* no bloqueamos */ }
    });
  }

  const joinForm = document.getElementById('joinRoomForm');
  if (joinForm) {
    joinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await joinRoom();
    });
  }

  const editForm = document.getElementById('editRoomForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await updateRoom();
    });
  }
});