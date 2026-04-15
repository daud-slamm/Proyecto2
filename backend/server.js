const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ── CONEXIÓN ──────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error:', err));

// ── MODELO USUARIO ────────────────────────────────
const User = mongoose.model('User', new mongoose.Schema({
  nombre:   { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fecha:    { type: Date, default: Date.now }
}));

// ── MODELO EJERCICIO ──────────────────────────────
const Exercise = mongoose.model('Exercise', new mongoose.Schema({
  nombre:      String,
  musculo:     String,
  descripcion: String,
  dificultad:  String
}));

// ── RUTAS USUARIOS ────────────────────────────────

// REGISTRO
app.post('/api/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ ok: false, msg: 'Email ya registrado' });

    await new User({ nombre, email, password }).save();
    res.status(201).json({ ok: true, msg: 'Usuario creado correctamente' });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user)
      return res.status(401).json({ ok: false, msg: 'Email o contraseña incorrectos' });

    res.json({ ok: true, msg: 'Login correcto', user: { nombre: user.nombre, email: user.email } });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── ARRANCAR SERVIDOR ─────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
