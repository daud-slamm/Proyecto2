// auth.js SIMPLE - FUNCIONA SIEMPRE
let users = JSON.parse(localStorage.getItem('users')) || [];

function register(nombre, email, pass) {
  // Email duplicado?
  if (users.find(u => u.email === email)) return alert('Email ya existe');
  
  users.push({nombre, email, pass});
  localStorage.setItem('users', JSON.stringify(users));
  localStorage.setItem('logged', 'true');
  localStorage.setItem('user', JSON.stringify({nombre, email}));
  alert('¡Registrado! Redirigiendo...');
  window.location.href = 'dashboard.html';
}

function login(email, pass) {
  const user = users.find(u => u.email === email && u.pass === pass);
  if (!user) return alert('Error: email/contraseña');
  
  localStorage.setItem('logged', 'true');
  localStorage.setItem('user', JSON.stringify(user));
  alert('¡Login OK!');
  window.location.href = 'dashboard.html';
}

function logout() {
  localStorage.removeItem('logged');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

function isLogged() {
  return localStorage.getItem('logged') === 'true';
}
