const baseURL = window.location.origin;
const token = sessionStorage.getItem("jwt_token");

if (!token) {
  window.location.href = "login.html";
}

// Obtener código de la sala de la URL
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get("code");

if (!roomCode) {
  alert("Código de sala no válido");
  window.location.href = "dashboard.html";
}

// Variables globales
let roomData = null;
let socket = null;
let currentUserId = null;
let connectedUsers = new Set();
let userVotes = {}; // Guardar votos del usuario actual
let currentChart = null; // Instancia de Chart.js

// Decodificar token
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const userData = parseJwt(token);
if (userData) {
  currentUserId = userData.id;
  connectedUsers.add(userData.username);
}

// Cargar información de la sala
async function loadRoomInfo() {
  try {
    const resp = await fetch(`${baseURL}/rooms/${roomCode}`, {
      headers: { token }
    });

    if (!resp.ok) {
      alert("Sala no encontrada");
      window.location.href = "dashboard.html";
      return;
    }

    roomData = await resp.json();
    document.getElementById("roomName").innerText = roomData.name;
    document.getElementById("roomCode").innerText = roomData.code;
    document.getElementById("roomDescription").innerText = roomData.description || "";

    // Mostrar botón de crear votación solo si es el creador
    if (roomData.creatorId === currentUserId) {
      document.getElementById("btnCreatePoll").style.display = "inline-block";
    }

    // Cargar votaciones activas
    loadPolls();
    
  } catch (err) {
    console.error("Error al cargar sala:", err);
  }
}

// Cargar mensajes previos del chat
async function loadMessages() {
  try {
    const resp = await fetch(`${baseURL}/chat?roomId=${roomData.id}`, {
      headers: { token }
    });
    const messages = await resp.json();
    
    const container = document.getElementById("messages");
    container.innerHTML = "";
    
    messages.forEach(msg => {
      addMessageToDOM(msg);
    });
  } catch (err) {
    console.error("Error al cargar mensajes:", err);
  }
}

// Conectar Socket.io
function connectSocket() {
  socket = io({
    auth: { token }
  });

  socket.on("connect", () => {
    console.log("Conectado al servidor");
    socket.emit("joinRoom", roomCode);
  });

  // Recibir lista completa de usuarios conectados
  socket.on("roomUsers", (users) => {
    connectedUsers.clear();
    users.forEach(user => {
      connectedUsers.add(user.username);
    });
    updateUsersList();
  });

  socket.on("userJoined", (data) => {
    connectedUsers.add(data.username);
    updateUsersList();
    addSystemMessage(`${data.username} se unió a la sala`);
  });

  socket.on("userLeft", (data) => {
    connectedUsers.delete(data.username);
    updateUsersList();
    addSystemMessage(`${data.username} salió de la sala`);
  });

  socket.on("newRoomMessage", (msg) => {
    addMessageToDOM(msg);
  });

  socket.on("newPoll", (poll) => {
    addPollToDOM(poll);
    addSystemMessage("Nueva votación creada: " + poll.question);
  });

  socket.on("pollResults", (results) => {
    updatePollResults(results);
  });

  socket.on("pollClosed", (data) => {
    markPollAsClosed(data.pollId);
    addSystemMessage("La votación ha sido cerrada");
  });

  socket.on("voteError", (data) => {
    alert("Error al votar: " + data.message);
  });

  socket.on("disconnect", () => {
    console.log("Desconectado del servidor");
  });
}

// Enviar mensaje
function sendMessage() {
  const input = document.getElementById("messageInput");
  const content = input.value.trim();
  
  if (!content) return;
  
  socket.emit("roomMessage", {
    roomCode,
    roomId: roomData.id,
    content
  });
  
  input.value = "";
}

// Permitir enviar con Enter
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("messageInput");
  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendMessage();
      }
    });
  }
});

// Agregar mensaje al DOM
function addMessageToDOM(msg) {
  const container = document.getElementById("messages");
  const div = document.createElement("div");

  // Determinar si el mensaje es del usuario actual
  const isOwnMessage = msg.userId === currentUserId;
  div.className = `message ${isOwnMessage ? 'own' : 'other'}`;

  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  div.innerHTML = `
    <div class="message-author">${msg.username}</div>
    <div>${msg.content}</div>
    <div class="message-time">${time}</div>
  `;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// Mensaje del sistema
function addSystemMessage(text) {
  const container = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "message text-center my-2";

  div.innerHTML = `<em class="text-blue-600 text-sm bg-blue-50 px-3 py-2 rounded-full inline-block">ℹ️ ${text}</em>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// Actualizar lista de usuarios
function updateUsersList() {
  const container = document.getElementById("usersList");
  container.innerHTML = "";

  if (connectedUsers.size === 0) {
    container.innerHTML = '<div class="text-center py-4"><span class="text-gray-500 text-sm">No hay usuarios conectados</span></div>';
    return;
  }

  // Convertir Set a Array y ordenar alfabéticamente
  const sortedUsers = Array.from(connectedUsers).sort();
  
  sortedUsers.forEach(username => {
    const userDiv = document.createElement("div");
    userDiv.className = "flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-200 mb-2";
    
    const isCurrentUser = username === userData.username;
    
    userDiv.innerHTML = `
      <div class="flex items-center">
        <span class="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse"></span>
        <span class="font-medium text-gray-800 ${isCurrentUser ? 'text-blue-600' : ''}">${username}</span>
        ${isCurrentUser ? '<span class="text-xs text-blue-500 ml-2">(Tú)</span>' : ''}
      </div>
      <div class="text-xs text-gray-500">
        En línea
      </div>
    `;
    
    container.appendChild(userDiv);
  });

  // Agregar contador total
  const counterDiv = document.createElement("div");
  counterDiv.className = "text-center mt-3 pt-2 border-t border-gray-200";
  counterDiv.innerHTML = `<span class="text-sm text-gray-600">Total: ${connectedUsers.size} usuario${connectedUsers.size !== 1 ? 's' : ''}</span>`;
  container.appendChild(counterDiv);
}

// Cargar votaciones
function loadPolls() {
  const container = document.getElementById("pollsContainer");
  container.innerHTML = "";

  if (!roomData.polls || roomData.polls.length === 0) {
    container.innerHTML = "<div class='text-center py-8 text-gray-500'><div class='text-4xl mb-4'>📊</div><p class='text-lg'>No hay votaciones activas</p><p class='text-sm'>¡Crea una nueva votación para comenzar!</p></div>";
    return;
  }

  roomData.polls.forEach(poll => {
    addPollToDOM(poll);
  });
}

// Agregar votación al DOM
function addPollToDOM(poll) {
  const container = document.getElementById("pollsContainer");

  // Remover mensaje de "no hay votaciones"
  if (container.innerHTML.includes("No hay votaciones")) {
    container.innerHTML = "";
  }

  const div = document.createElement("div");
  div.className = "bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-4";
  div.id = `poll-${poll.id}`;

  let statusBadge = poll.isOpen
    ? '<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"><span class="w-2 h-2 bg-green-400 rounded-full mr-2"></span>ABIERTA</span>'
    : '<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"><span class="w-2 h-2 bg-red-400 rounded-full mr-2"></span>CERRADA</span>';

  let optionsHTML = "";
  const hasVoted = userVotes[poll.id];

  if (poll.isOpen) {
    // Mostrar opciones para votar
    poll.options.forEach(opt => {
      const isVoted = hasVoted === opt.id;
      const votedClass = isVoted ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-300 hover:border-blue-400';
      const votedIndicator = isVoted ? '<span class="ml-2 text-blue-600 font-medium">✓ Tu voto</span>' : '';

      optionsHTML += `
        <button class="vote-button w-full text-left p-4 border-2 rounded-lg transition-all ${votedClass}" onclick="vote(${poll.id}, ${opt.id})" ${isVoted ? 'disabled' : ''}>
          <span class="font-medium">${opt.text}</span>
          ${votedIndicator}
        </button>
      `;
    });
  }

  // Botones de acción
  let actionButtons = "";
  if (roomData.creatorId === currentUserId) {
    if (poll.isOpen) {
      actionButtons += `<button class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium mr-2 flex items-center justify-center" onclick="closePoll(${poll.id})">🔒 Cerrar Votación</button>`;
    }
    actionButtons += `<button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center" onclick="showChart(${poll.id})">📊 Ver Gráfico</button>`;
  } else {
    // Usuarios normales también pueden ver el gráfico
    actionButtons += `<button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center" onclick="showChart(${poll.id})">📊 Ver Resultados</button>`;
  }

  div.innerHTML = `
    <div class="flex justify-between items-start mb-4">
      <h4 class="text-lg font-bold text-gray-800 flex-1 mr-4">${poll.question}</h4>
      ${statusBadge}
    </div>
    <div id="poll-options-${poll.id}" class="space-y-3 mb-4">
      ${optionsHTML}
    </div>
    <div id="poll-results-${poll.id}" class="poll-results mb-4"></div>
    <div class="flex justify-end space-x-2">
      ${actionButtons}
    </div>
  `;

  container.appendChild(div);

  // Cargar resultados
  loadPollResults(poll.id);
}

// Votar
async function vote(pollId, optionId) {
  // Verificar si ya votó
  if (userVotes[pollId]) {
    alert("Ya has votado en esta encuesta");
    return;
  }

  socket.emit("submitVote", {
    roomCode,
    pollId,
    optionId
  });

  // Guardar voto localmente
  userVotes[pollId] = optionId;
  
  // Actualizar UI inmediatamente
  const buttons = document.querySelectorAll(`#poll-options-${pollId} .vote-button`);
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.onclick.toString().includes(`${optionId}`)) {
      btn.classList.remove('bg-white', 'border-gray-300', 'hover:border-blue-400');
      btn.classList.add('bg-blue-100', 'border-blue-300');
      if (!btn.innerHTML.includes('✓ Tu voto')) {
        btn.innerHTML = btn.innerHTML.replace('</span>', '</span><span class="ml-2 text-blue-600 font-medium">✓ Tu voto</span>');
      }
    }
  });

  addSystemMessage("Tu voto ha sido registrado");
}

// Cargar resultados de votación
async function loadPollResults(pollId) {
  try {
    const resp = await fetch(`${baseURL}/polls/${pollId}/results`, {
      headers: { token }
    });
    const results = await resp.json();
    updatePollResults(results);
  } catch (err) {
    console.error("Error al cargar resultados:", err);
  }
}

// Actualizar resultados en el DOM
function updatePollResults(results) {
  const pollId = results.pollId || results.id;
  const container = document.getElementById(`poll-results-${pollId}`);
  if (!container) return;

  container.innerHTML = "<h5 class='text-lg font-semibold text-gray-800 mb-4 flex items-center'><span class='mr-2'>📊</span>Resultados en tiempo real:</h5>";

  const totalVotes = results.totalVotes || 0;

  results.options.forEach(opt => {
    const percentage = totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : 0;

    const resultDiv = document.createElement("div");
    resultDiv.className = "mb-3";
    resultDiv.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <span class="font-medium text-gray-700">${opt.text}</span>
        <span class="text-sm text-gray-600">${opt.votes} votos (${percentage}%)</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-3">
        <div class="bg-blue-600 h-3 rounded-full transition-all duration-300" style="width: ${percentage}%"></div>
      </div>
    `;

    container.appendChild(resultDiv);
  });
}

// Cerrar votación
function closePoll(pollId) {
  if (!confirm("¿Cerrar esta votación? Los usuarios ya no podrán votar.")) return;
  
  socket.emit("closePoll", {
    roomCode,
    pollId
  });
}

// Marcar votación como cerrada
function markPollAsClosed(pollId) {
  const pollDiv = document.getElementById(`poll-${pollId}`);
  if (pollDiv) {
    pollDiv.classList.add("opacity-75");
    const statusBadge = pollDiv.querySelector("span");
    if (statusBadge && statusBadge.innerHTML.includes("ABIERTA")) {
      statusBadge.className = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800";
      statusBadge.innerHTML = '<span class="w-2 h-2 bg-red-400 rounded-full mr-2"></span>CERRADA';
    }
    const optionsDiv = document.getElementById(`poll-options-${pollId}`);
    if (optionsDiv) {
      optionsDiv.innerHTML = "<p class='text-gray-500 text-center italic py-4'>La votación ha sido cerrada</p>";
    }
  }
}

// Mostrar gráfico con Chart.js
async function showChart(pollId) {
  try {
    const resp = await fetch(`${baseURL}/polls/${pollId}/results`, {
      headers: { token }
    });
    const results = await resp.json();

    const modal = document.getElementById("chartModal");
    modal.classList.remove("hidden");

    // Destruir gráfico anterior si existe
    if (currentChart) {
      currentChart.destroy();
    }

    const ctx = document.getElementById("resultsChart").getContext("2d");

    const labels = results.options.map(opt => opt.text);
    const data = results.options.map(opt => opt.votes);
    const totalVotes = results.totalVotes || 0;

    currentChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Número de Votos',
          data: data,
          backgroundColor: [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(40, 167, 69, 0.8)',
            'rgba(255, 193, 7, 0.8)',
            'rgba(220, 53, 69, 0.8)',
            'rgba(23, 162, 184, 0.8)'
          ],
          borderColor: [
            'rgba(102, 126, 234, 1)',
            'rgba(118, 75, 162, 1)',
            'rgba(40, 167, 69, 1)',
            'rgba(255, 193, 7, 1)',
            'rgba(220, 53, 69, 1)',
            'rgba(23, 162, 184, 1)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          title: {
            display: true,
            text: `${results.question} (Total: ${totalVotes} votos)`,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.parsed.y;
                const percentage = totalVotes > 0 ? ((value / totalVotes) * 100).toFixed(1) : 0;
                return ` ${value} votos (${percentage}%)`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });

  } catch (err) {
    console.error("Error al mostrar gráfico:", err);
    alert("Error al cargar los resultados");
  }
}

// Cerrar modal de gráfico
function hideChartModal() {
  document.getElementById("chartModal").classList.add("hidden");
  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }
}

// Descargar gráfico como imagen
function downloadChart() {
  if (!currentChart) return;
  
  const url = currentChart.toBase64Image();
  const link = document.createElement('a');
  link.download = `resultados-votacion-${Date.now()}.png`;
  link.href = url;
  link.click();
}

// Modal crear votación
function showCreatePollModal() {
  document.getElementById("createPollModal").classList.remove("hidden");
}

function hideCreatePollModal() {
  document.getElementById("createPollModal").classList.add("hidden");
  document.getElementById("pollQuestion").value = "";
  document.getElementById("optionsContainer").innerHTML = `
    <input type="text" class="poll-option-input w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Opción 1" />
    <input type="text" class="poll-option-input w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Opción 2" />
  `;
  document.getElementById("pollMsg").textContent = "";
  document.getElementById("pollMsg").className = "";
}

function addPollOption() {
  const container = document.getElementById("optionsContainer");
  const count = container.querySelectorAll(".poll-option-input").length + 1;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "poll-option-input w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  input.placeholder = `Opción ${count}`;
  container.appendChild(input);
}

function addPollOption() {
  const container = document.getElementById("optionsContainer");
  const count = container.querySelectorAll(".poll-option-input").length + 1;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "poll-option-input w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  input.placeholder = `Opción ${count}`;
  container.appendChild(input);
}

// Crear votación
function createPoll() {
  const question = document.getElementById("pollQuestion").value.trim();
  const optionInputs = document.querySelectorAll(".poll-option-input");
  const options = Array.from(optionInputs)
    .map(input => input.value.trim())
    .filter(val => val !== "");
  
  const msg = document.getElementById("pollMsg");
  
  if (!question) {
    msg.innerText = "La pregunta es requerida";
    msg.className = "msg msg-error";
    return;
  }
  
  if (options.length < 2) {
    msg.innerText = "Debes tener al menos 2 opciones";
    msg.className = "msg msg-error";
    return;
  }
  
  socket.emit("createPoll", {
    roomCode,
    roomId: roomData.id,
    question,
    options
  });
  
  hideCreatePollModal();
}

// Copiar código de la sala
function copyRoomCode() {
  const code = roomCode;
  navigator.clipboard.writeText(code).then(() => {
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "✅ Copiado!";
  // ...existing code...
    
    setTimeout(() => {
      btn.innerText = originalText;
  // ...existing code...
    }, 2000);
  }).catch(err => {
    console.error("Error al copiar:", err);
    alert("Código: " + code);
  });
}

// Navegación
function goToDashboard() {
  leaveRoom();
  window.location.href = "dashboard.html";
}

function leaveRoom() {
  if (socket) {
    socket.emit("leaveRoom", roomCode);
    socket.disconnect();
  }
}

// Función para cambiar entre pestañas
function switchTab(tabName) {
  // Ocultar todos los contenidos de pestañas
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    content.classList.remove('active');
  });

  // Remover clase active de todos los botones
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.classList.remove('active');
  });

  // Mostrar el contenido de la pestaña seleccionada
  const selectedTab = document.getElementById(tabName + 'Tab');
  if (selectedTab) {
    selectedTab.classList.add('active');
  }

  // Agregar clase active al botón seleccionado
  const selectedButton = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
  if (selectedButton) {
    selectedButton.classList.add('active');
  }
}

// Event listeners para los botones de pestañas
document.addEventListener('DOMContentLoaded', function() {
  // Agregar event listeners a los botones de pestañas
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // Mostrar la primera pestaña por defecto (votaciones)
  switchTab('votaciones');
});

// Inicializar
loadRoomInfo();
connectSocket();

// Al cerrar la ventana
window.addEventListener("beforeunload", () => {
  leaveRoom();
});