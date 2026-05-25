const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto     = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET    = process.env.JWT_SECRET    || 'empieza_gym_secret_2025';
const FRONTEND_URL  = process.env.FRONTEND_URL  || 'http://localhost:5500';

// ── EMAIL ─────────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false }
});

async function sendMail(to, subject, html) {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'tucorreo@gmail.com') {
    console.warn('⚠️  EMAIL_USER no configurado — email simulado para:', to, '|', subject);
    return;
  }
  console.log(`📧 Enviando email a ${to}...`);
  const info = await transporter.sendMail({
    from: `"Empieza en el Gym" <${process.env.EMAIL_USER}>`,
    to, subject, html
  });
  console.log(`✅ Email enviado correctamente. ID: ${info.messageId}`);
}

// ── CONEXIÓN + AUTO-SEED ──────────────────────────────────────────────────────
const U = id => `https://images.unsplash.com/photo-${id}?w=500&h=320&fit=crop&auto=format&q=75`;
const EXERCISES_SEED = [
  { nombre:'Press de banca',              musculo:'Pecho',      descripcion:'Tumbado en banco, baja la barra al esternón y empuja. Codos a 45°.',                       dificultad:'Intermedio',   equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','espalda'],          color:'#3b82f6', muscleColor:'#eff6ff', muscleText:'#2563eb', icon:'bi-bar-chart-line', imagen:U('1690731033723-ad718c6e585a') },
  { nombre:'Press con mancuernas',        musculo:'Pecho',      descripcion:'Banco plano, mancuernas a los lados, baja controlado hasta el pecho.',                      dificultad:'Principiante', equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla'],                    color:'#3b82f6', muscleColor:'#eff6ff', muscleText:'#2563eb', icon:'bi-bar-chart-line', imagen:U('1630065612476-294f637f0248') },
  { nombre:'Press en máquina',            musculo:'Pecho',      descripcion:'Ajusta el asiento al nivel del pecho. Empuja hacia adelante de forma controlada.',          dificultad:'Principiante', equipo:['maquinas','completo'],                     restricciones:['ninguna','rodilla','espalda','hombro'], color:'#3b82f6', muscleColor:'#eff6ff', muscleText:'#2563eb', icon:'bi-building',        imagen:U('1517836357463-d25dfeac3438') },
  { nombre:'Flexiones',                   musculo:'Pecho',      descripcion:'Cuerpo recto, codos a 45°. Baja el pecho casi al suelo y sube explosivo.',                  dificultad:'Principiante', equipo:['sin_equipo','pesas','completo','maquinas'], restricciones:['ninguna','rodilla'],                    color:'#3b82f6', muscleColor:'#eff6ff', muscleText:'#2563eb', icon:'bi-person-arms-up',  imagen:U('1598971457999-ca4ef48a9a71') },
  { nombre:'Press inclinado con barra',   musculo:'Pecho',      descripcion:'Banco inclinado 30-45°, baja la barra al pecho superior. Trabaja el pecho alto.',           dificultad:'Intermedio',   equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','hombro'],           color:'#3b82f6', muscleColor:'#eff6ff', muscleText:'#2563eb', icon:'bi-bar-chart-line', imagen:U('1692372372344-41aed374b848') },
  { nombre:'Press inclinado mancuernas',  musculo:'Pecho',      descripcion:'Banco inclinado, mancuernas a los lados. Baja hasta la línea del pecho y empuja.',          dificultad:'Intermedio',   equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','hombro'],           color:'#3b82f6', muscleColor:'#eff6ff', muscleText:'#2563eb', icon:'bi-bar-chart-line', imagen:U('1639673529903-bb8be2cc8bb1') },
  { nombre:'Press inclinado máquina',     musculo:'Pecho',      descripcion:'Máquina de press inclinado. Ajusta asiento y empuja hacia arriba de forma controlada.',     dificultad:'Principiante', equipo:['maquinas','completo'],                     restricciones:['ninguna','rodilla','hombro'],           color:'#3b82f6', muscleColor:'#eff6ff', muscleText:'#2563eb', icon:'bi-building',        imagen:U('1517836357463-d25dfeac3438') },
  { nombre:'Jalón al pecho',              musculo:'Espalda',    descripcion:'Agarra la barra ancha, lleva los codos hacia el suelo apretando la espalda.',               dificultad:'Principiante', equipo:['maquinas','completo'],                     restricciones:['ninguna','rodilla','hombro'],           color:'#8b5cf6', muscleColor:'#f5f3ff', muscleText:'#7c3aed', icon:'bi-arrow-down-circle', imagen:U('1646072508097-0c8b3cbe44bc') },
  { nombre:'Remo en máquina',             musculo:'Espalda',    descripcion:'Pecho apoyado, tira del agarre hacia ti apretando los omóplatos.',                          dificultad:'Principiante', equipo:['maquinas','completo'],                     restricciones:['ninguna','rodilla','hombro'],           color:'#8b5cf6', muscleColor:'#f5f3ff', muscleText:'#7c3aed', icon:'bi-arrows-move',      imagen:U('1534258936925-c58bed479fcb') },
  { nombre:'Remo con barra',              musculo:'Espalda',    descripcion:'Espalda recta 45°, tira la barra hacia el ombligo apretando la espalda.',                   dificultad:'Avanzado',     equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','hombro'],           color:'#8b5cf6', muscleColor:'#f5f3ff', muscleText:'#7c3aed', icon:'bi-arrows-move',      imagen:U('1604480132736-44c188fe4d20') },
  { nombre:'Dominadas',                   musculo:'Espalda',    descripcion:'Agarre prono ancho, sube hasta que el pecho toque la barra.',                               dificultad:'Avanzado',     equipo:['sin_equipo','pesas','completo'],            restricciones:['ninguna','rodilla'],                    color:'#8b5cf6', muscleColor:'#f5f3ff', muscleText:'#7c3aed', icon:'bi-arrow-up-circle',  imagen:U('1605296867424-35fc25c9212a') },
  { nombre:'Press militar',               musculo:'Hombros',    descripcion:'De pie, empuja la barra desde los hombros hasta arriba. No arquees la espalda.',            dificultad:'Intermedio',   equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla'],                    color:'#f59e0b', muscleColor:'#fffbeb', muscleText:'#d97706', icon:'bi-arrow-up-square',  imagen:U('1541534741688-6078c6bfb5c5') },
  { nombre:'Elevaciones laterales',       musculo:'Hombros',    descripcion:'Mancuernas a los lados, eleva hasta la altura del hombro. Control total.',                  dificultad:'Principiante', equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','espalda'],          color:'#f59e0b', muscleColor:'#fffbeb', muscleText:'#d97706', icon:'bi-arrows-expand',    imagen:U('1606889462784-c033891d5a3e') },
  { nombre:'Sentadilla con barra',        musculo:'Piernas',    descripcion:'Pies al ancho de hombros, baja hasta paralelo. Rodillas alineadas con pies.',               dificultad:'Avanzado',     equipo:['completo','pesas'],                        restricciones:['ninguna','espalda','hombro'],           color:'#10b981', muscleColor:'#ecfdf5', muscleText:'#059669', icon:'bi-person-standing',  imagen:U('1666121363683-1f03bf2e0cc1') },
  { nombre:'Prensa de piernas',           musculo:'Piernas',    descripcion:'Pies al ancho de caderas, baja hasta 90°. No bloquees las rodillas al subir.',              dificultad:'Principiante', equipo:['maquinas','completo'],                     restricciones:['ninguna','espalda','hombro'],           color:'#10b981', muscleColor:'#ecfdf5', muscleText:'#059669', icon:'bi-building',         imagen:U('1434682772747-f16d3ea162c3') },
  { nombre:'Extensión de piernas',        musculo:'Cuádriceps', descripcion:'En máquina, extiende la pierna completamente y baja despacio.',                             dificultad:'Principiante', equipo:['maquinas','completo'],                     restricciones:['ninguna','espalda','hombro'],           color:'#10b981', muscleColor:'#ecfdf5', muscleText:'#059669', icon:'bi-person-standing',  imagen:U('1738524107966-23c49aa65ba3') },
  { nombre:'Curl femoral',                musculo:'Isquios',    descripcion:'Tumbado o sentado, flexiona la rodilla hasta 90°. Control en la bajada.',                   dificultad:'Principiante', equipo:['maquinas','completo'],                     restricciones:['ninguna','espalda','hombro'],           color:'#10b981', muscleColor:'#ecfdf5', muscleText:'#059669', icon:'bi-person-standing',  imagen:U('1574680178050-55c6a6a96e0a') },
  { nombre:'Zancadas',                    musculo:'Piernas',    descripcion:'Da un paso al frente y baja la rodilla trasera casi al suelo.',                             dificultad:'Principiante', equipo:['sin_equipo','pesas','completo'],            restricciones:['ninguna','espalda','hombro'],           color:'#10b981', muscleColor:'#ecfdf5', muscleText:'#059669', icon:'bi-person-walking',   imagen:U('1650116385006-2a82a7b9941b') },
  { nombre:'Curl con barra',              musculo:'Bíceps',     descripcion:'Codos pegados al cuerpo, sube la barra y baja controlado. Sin balanceo.',                   dificultad:'Principiante', equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','espalda'],          color:'#14b8a6', muscleColor:'#f0fdfa', muscleText:'#0d9488', icon:'bi-bar-chart-steps',  imagen:U('1597452573811-85e7383195a6') },
  { nombre:'Curl alterno',                musculo:'Bíceps',     descripcion:'De pie, curla una mancuerna, supina la muñeca al subir. Alterna lados.',                    dificultad:'Principiante', equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','espalda'],          color:'#14b8a6', muscleColor:'#f0fdfa', muscleText:'#0d9488', icon:'bi-bar-chart-steps',  imagen:U('1598268030450-7a476f602bf6') },
  { nombre:'Curl martillo',               musculo:'Bíceps',     descripcion:'Agarre neutro (como un martillo), curla la mancuerna sin rotar la muñeca.',                 dificultad:'Principiante', equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','espalda'],          color:'#14b8a6', muscleColor:'#f0fdfa', muscleText:'#0d9488', icon:'bi-bar-chart-steps',  imagen:U('1581009146145-b5ef050c2e1e') },
  { nombre:'Curl en polea',               musculo:'Bíceps',     descripcion:'Polea baja, agarra la barra o cuerda y curla hacia los hombros. Tensión constante.',        dificultad:'Principiante', equipo:['maquinas','completo'],                     restricciones:['ninguna','rodilla','espalda'],          color:'#14b8a6', muscleColor:'#f0fdfa', muscleText:'#0d9488', icon:'bi-arrow-up-circle',  imagen:U('1534438327276-14e5300c3a48') },
  { nombre:'Curl predicador',             musculo:'Bíceps',     descripcion:'Apoya los tríceps en el banco predicador. Curla sin levantar los codos.',                   dificultad:'Intermedio',   equipo:['maquinas','completo','pesas'],              restricciones:['ninguna','rodilla','espalda'],          color:'#14b8a6', muscleColor:'#f0fdfa', muscleText:'#0d9488', icon:'bi-building',         imagen:U('1583454110551-21f2fa2afe61') },
  { nombre:'Extensión en polea',          musculo:'Tríceps',    descripcion:'Codos fijos, empuja la cuerda hacia abajo hasta extender el brazo.',                        dificultad:'Principiante', equipo:['maquinas','completo'],                     restricciones:['ninguna','rodilla','espalda'],          color:'#f97066', muscleColor:'#fef2f2', muscleText:'#dc2626', icon:'bi-arrow-down',        imagen:U('1581009146145-b5ef050c2e1e') },
  { nombre:'Fondos en paralelas',         musculo:'Tríceps',    descripcion:'Baja hasta 90° de flexión en el codo. Cuerpo ligeramente inclinado.',                       dificultad:'Intermedio',   equipo:['sin_equipo','pesas','completo'],            restricciones:['ninguna','rodilla'],                    color:'#f97066', muscleColor:'#fef2f2', muscleText:'#dc2626', icon:'bi-person-arms-up',  imagen:U('1634225251578-d5f6ffced78a') },
  { nombre:'Press francés',               musculo:'Tríceps',    descripcion:'Tumbado, baja la barra hacia la frente doblando solo los codos. Sube explosivo.',            dificultad:'Intermedio',   equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','hombro'],           color:'#f97066', muscleColor:'#fef2f2', muscleText:'#dc2626', icon:'bi-bar-chart-line',  imagen:U('1690731033723-ad718c6e585a') },
  { nombre:'Patada de tríceps',           musculo:'Tríceps',    descripcion:'Inclinado hacia adelante, codo fijo arriba, extiende el brazo hacia atrás.',                dificultad:'Principiante', equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','espalda'],          color:'#f97066', muscleColor:'#fef2f2', muscleText:'#dc2626', icon:'bi-arrow-right',      imagen:U('1598268030450-7a476f602bf6') },
  { nombre:'Plancha',                     musculo:'Core',       descripcion:'Cuerpo recto apoyado en codos. Contrae el abdomen. Sin caer la cadera.',                    dificultad:'Principiante', equipo:['sin_equipo','pesas','completo','maquinas'], restricciones:['ninguna','rodilla','hombro'],           color:'#6366f1', muscleColor:'#eef2ff', muscleText:'#4f46e5', icon:'bi-align-middle',     imagen:U('1544216717-3bbf52512659') },
  { nombre:'Crunch abdominal',            musculo:'Core',       descripcion:'Tumbado, curva la columna llevando las costillas hacia la pelvis.',                          dificultad:'Principiante', equipo:['sin_equipo','pesas','completo','maquinas'], restricciones:['ninguna','rodilla','hombro'],           color:'#6366f1', muscleColor:'#eef2ff', muscleText:'#4f46e5', icon:'bi-arrow-repeat',     imagen:U('1616803824305-a07cfbc8ea60') },
  { nombre:'Bicicleta estática',          musculo:'Cardio',     descripcion:'Resistencia moderada, mantén un ritmo constante durante toda la sesión.',                   dificultad:'Principiante', equipo:['maquinas','completo'],                     restricciones:['ninguna','espalda','hombro'],           color:'#06b6d4', muscleColor:'#ecfeff', muscleText:'#0891b2', icon:'bi-bicycle',          imagen:U('1571902943202-507ec2618e8f') },
  { nombre:'Caminata inclinada',          musculo:'Cardio',     descripcion:'Cinta a 6-8% inclinación, ritmo moderado. Quema grasa sin perder músculo.',                 dificultad:'Principiante', equipo:['maquinas','completo'],                     restricciones:['ninguna','espalda','hombro'],           color:'#06b6d4', muscleColor:'#ecfeff', muscleText:'#0891b2', icon:'bi-person-walking',   imagen:U('1637713871652-4c9f1e601209') },
  { nombre:'Jumping Jacks',               musculo:'Cardio',     descripcion:'Saltos con brazos arriba y piernas abiertas. Ritmo constante 30-60s.',                      dificultad:'Principiante', equipo:['sin_equipo','pesas','completo','maquinas'], restricciones:['ninguna','espalda','hombro'],           color:'#06b6d4', muscleColor:'#ecfeff', muscleText:'#0891b2', icon:'bi-stars',            imagen:U('1587433093163-49f2914e17e7') }
];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Conectado a MongoDB Atlas');
    // Auto-seed: si no hay ejercicios, los inserta automáticamente
    const count = await Exercise.countDocuments();
    if (count === 0) {
      await Exercise.insertMany(EXERCISES_SEED);
      console.log(`🌱 Auto-seed: ${EXERCISES_SEED.length} ejercicios insertados en MongoDB`);
    }
  })
  .catch(err => console.error('❌ Error:', err));

// ── MODELOS ───────────────────────────────────────────────────────────────────
const User = mongoose.model('User', new mongoose.Schema({
  nombre:       { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  password:     { type: String, required: true },
  fecha:        { type: Date, default: Date.now },
  isAdmin:      { type: Boolean, default: false },
  routine:      { type: mongoose.Schema.Types.Mixed, default: null },
  testAnswers:  { type: mongoose.Schema.Types.Mixed, default: null },
  testDone:     { type: Boolean, default: false },
  streak: {
    count:      { type: Number,   default: 0 },
    lastActive: { type: String,   default: null },
    history:    { type: [String], default: [] }
  },
  dailyProgress:     { type: mongoose.Schema.Types.Mixed, default: {} },
  customRoutine:     { type: mongoose.Schema.Types.Mixed, default: null },
  // ── Auth fields (no default → undefined for old users = backward compat) ──
  emailVerified:     { type: Boolean },
  verificationToken: { type: String  },
  resetToken:        { type: String  },
  resetTokenExpiry:  { type: Date    }
}));

const Exercise = mongoose.model('Exercise', new mongoose.Schema({
  nombre:       { type: String, required: true },
  musculo:      String,
  descripcion:  String,
  dificultad:   String,
  equipo:       [String],
  restricciones:[String],
  color:        String,
  muscleColor:  String,
  muscleText:   String,
  icon:         String,
  imagen:       { type: String, default: '' }
}));

const Contact = mongoose.model('Contact', new mongoose.Schema({
  nombre:  String,
  email:   String,
  asunto:  String,
  mensaje: String,
  fecha:   { type: Date, default: Date.now },
  leido:   { type: Boolean, default: false }
}));

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ ok: false, msg: 'Token requerido' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ ok: false, msg: 'Token inválido o expirado' });
  }
}

async function adminAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ ok: false, msg: 'Token requerido' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const user = await User.findOne({ email: req.user.email });
    if (!user || !user.isAdmin) return res.status(403).json({ ok: false, msg: 'Sin permisos de administrador' });
    next();
  } catch {
    res.status(401).json({ ok: false, msg: 'Token inválido o expirado' });
  }
}

// ── REGISTRO ──────────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    console.log(`📝 Intento de registro: ${email}`);
    if (await User.findOne({ email }))
      return res.status(400).json({ ok: false, msg: 'Este email ya está registrado. ¿Quieres iniciar sesión?', code: 'EMAIL_EXISTS' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(password, 10);
    await new User({ nombre, email, password: hash, emailVerified: false, verificationToken }).save();

    const verifyLink = `http://localhost:${process.env.PORT || 5000}/api/verify-email/${verificationToken}`;
    console.log(`🔗 Token de verificación (manual): ${verifyLink}`);
    await sendMail(email, '✅ Verifica tu cuenta — Empieza en el Gym', `
      <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#f7f8fa;padding:32px;border-radius:16px">
        <h2 style="color:#10b981;margin:0 0 8px">¡Hola, ${nombre}!</h2>
        <p style="color:#5a6278;margin:0 0 24px">Gracias por registrarte en <strong>Empieza en el Gym</strong>. Solo queda un paso: verifica tu dirección de correo.</p>
        <a href="${verifyLink}" style="display:inline-block;padding:14px 32px;background:#10b981;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:1rem">Verificar mi cuenta</a>
        <p style="color:#9098a9;font-size:.82rem;margin-top:24px">El enlace es válido por 24 horas. Si no creaste esta cuenta, ignora este mensaje.</p>
      </div>
    `);

    res.status(201).json({ ok: true, msg: 'Cuenta creada. Revisa tu email para verificarla antes de entrar.', requiresVerification: true });
  } catch (e) {
    console.error('❌ Error en /api/register:', e.message);
    // Si el error es del email, da un mensaje claro
    if (e.message && (e.message.includes('auth') || e.message.includes('535') || e.message.includes('credentials'))) {
      return res.status(500).json({ ok: false, msg: 'Error al enviar el email de verificación. Comprueba las credenciales en el servidor.' });
    }
    res.status(500).json({ ok: false, msg: 'Error del servidor: ' + e.message });
  }
});

// ── VERIFICAR EMAIL ───────────────────────────────────────────────────────────
app.get('/api/verify-email/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) return res.send(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Error — Empieza en el Gym</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#f7f8fa;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{background:#fff;border-radius:20px;padding:40px;max-width:420px;width:100%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.1)}.icon{width:72px;height:72px;border-radius:50%;background:#fef2f2;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:2rem}h2{color:#1a1d2e;margin-bottom:10px;font-size:1.3rem}p{color:#5a6278;font-size:.9rem;line-height:1.6;margin-bottom:24px}a{display:inline-block;padding:12px 28px;background:#10b981;color:#fff;border-radius:12px;font-weight:700;text-decoration:none}</style></head><body><div class="card"><div class="icon">❌</div><h2>Enlace no válido</h2><p>Este enlace ya fue usado o ha expirado. Regístrate de nuevo para obtener uno nuevo.</p><a href="${FRONTEND_URL}/register.html">Volver al registro</a></div></body></html>`);
    await User.findByIdAndUpdate(user._id, { emailVerified: true, verificationToken: null });
    res.send(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>¡Cuenta verificada! — Empieza en el Gym</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#f7f8fa;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{background:#fff;border-radius:20px;padding:40px;max-width:420px;width:100%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.1)}.icon{width:72px;height:72px;border-radius:50%;background:#ecfdf5;border:2px solid #d1fae5;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:2.4rem}h2{color:#1a1d2e;margin-bottom:10px;font-size:1.3rem}p{color:#5a6278;font-size:.9rem;line-height:1.6;margin-bottom:24px}a{display:inline-block;padding:12px 28px;background:#10b981;color:#fff;border-radius:12px;font-weight:700;text-decoration:none;transition:background .2s}a:hover{background:#059669}</style></head><body><div class="card"><div class="icon">✅</div><h2>¡Cuenta verificada!</h2><p>Tu email ha sido verificado correctamente. Ya puedes iniciar sesión con tu cuenta.</p><a href="${FRONTEND_URL}/login.html">Iniciar sesión →</a></div></body></html>`);
  } catch (e) {
    res.send('Error al verificar. Inténtalo de nuevo.');
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ ok: false, msg: 'Email o contraseña incorrectos' });

    console.log(`🔍 Login: ${email} | emailVerified = ${user.emailVerified} | tipo = ${typeof user.emailVerified}`);

    if (user.emailVerified === false)
      return res.status(401).json({ ok: false, msg: 'Debes verificar tu email antes de entrar. Revisa tu bandeja de entrada.', code: 'EMAIL_NOT_VERIFIED' });

    // Soporte contraseñas antiguas en texto plano (migración automática)
    let valid = false;
    try {
      valid = await bcrypt.compare(password, user.password);
    } catch {
      valid = password === user.password;
      if (valid) {
        const hash = await bcrypt.hash(password, 10);
        await User.findOneAndUpdate({ email }, { password: hash });
      }
    }
    if (!valid) return res.status(401).json({ ok: false, msg: 'Email o contraseña incorrectos' });

    const token = jwt.sign(
      { email: user.email, nombre: user.nombre, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      ok: true, msg: 'Login correcto', token,
      user: { nombre: user.nombre, email: user.email, fecha: user.fecha, testDone: user.testDone, isAdmin: user.isAdmin }
    });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── OLVIDÉ MI CONTRASEÑA ──────────────────────────────────────────────────────
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    // Siempre responde igual para no revelar si el email existe
    if (!user) return res.json({ ok: true, msg: 'Si el email existe, recibirás un enlace.' });

    const resetToken     = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600 * 1000); // 1 hora
    await User.findByIdAndUpdate(user._id, { resetToken, resetTokenExpiry });

    const resetLink = `${FRONTEND_URL}/reset-password.html?token=${resetToken}`;
    await sendMail(email, '🔑 Cambiar contraseña — Empieza en el Gym', `
      <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#f7f8fa;padding:32px;border-radius:16px">
        <h2 style="color:#10b981;margin:0 0 8px">Cambiar contraseña</h2>
        <p style="color:#5a6278;margin:0 0 24px">Hemos recibido una solicitud para cambiar la contraseña de <strong>${user.nombre}</strong>. Haz clic en el botón — el enlace expira en <strong>1 hora</strong>.</p>
        <a href="${resetLink}" style="display:inline-block;padding:14px 32px;background:#10b981;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:1rem">Cambiar contraseña</a>
        <p style="color:#9098a9;font-size:.82rem;margin-top:24px">Si no solicitaste este cambio, ignora este mensaje. Tu contraseña no cambiará.</p>
      </div>
    `);

    res.json({ ok: true, msg: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.' });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── RESTABLECER CONTRASEÑA ────────────────────────────────────────────────────
app.post('/api/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return res.status(400).json({ ok: false, msg: 'La contraseña debe tener al menos 6 caracteres.' });

    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: new Date() }
    });
    if (!user) return res.status(400).json({ ok: false, msg: 'El enlace no es válido o ha expirado. Solicita uno nuevo.', code: 'INVALID_TOKEN' });

    const hash = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(user._id, { password: hash, resetToken: null, resetTokenExpiry: null });

    res.json({ ok: true, msg: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── PERFIL COMPLETO ───────────────────────────────────────────────────────────
app.get('/api/profile', auth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email }).select('-password');
    if (!user) return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
    res.json({ ok: true, user });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── EDITAR PERFIL ─────────────────────────────────────────────────────────────
app.put('/api/profile', auth, async (req, res) => {
  try {
    const { nombre, passwordActual, passwordNueva, newPassword } = req.body;
    const update = {};
    if (nombre && nombre.trim()) update.nombre = nombre.trim();

    // Cambio de contraseña con verificación de la actual
    const nuevaPwd = passwordNueva || newPassword;
    if (nuevaPwd) {
      const userDoc = await User.findOne({ email: req.user.email });
      if (!userDoc) return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
      // Si se proporciona passwordActual, verificarla
      if (passwordActual) {
        const isHash = userDoc.password.startsWith('$2');
        let match = false;
        if (isHash) {
          match = await bcrypt.compare(passwordActual, userDoc.password);
        } else {
          match = passwordActual === userDoc.password;
        }
        if (!match) return res.status(400).json({ ok: false, msg: 'La contraseña actual no es correcta' });
      }
      update.password = await bcrypt.hash(nuevaPwd, 10);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ ok: false, msg: 'No hay nada que actualizar' });
    }

    const user = await User.findOneAndUpdate(
      { email: req.user.email },
      { $set: update },
      { new: true }
    ).select('-password');

    const token = jwt.sign(
      { email: user.email, nombre: user.nombre, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ ok: true, msg: 'Perfil actualizado', user, token });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── RUTINA + TEST ─────────────────────────────────────────────────────────────
app.post('/api/routine', auth, async (req, res) => {
  try {
    const { days, testAnswers } = req.body;
    if (!days) return res.status(400).json({ ok: false, msg: 'Faltan datos' });
    await User.findOneAndUpdate(
      { email: req.user.email },
      { $set: { routine: days, testAnswers, testDone: true } },
      { new: true, strict: false }
    );
    res.json({ ok: true, msg: 'Rutina guardada correctamente' });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── PROGRESO DIARIO (ejercicios completados) ──────────────────────────────────
app.post('/api/progress', auth, async (req, res) => {
  try {
    const { date, exerciseId } = req.body;
    if (!date || !exerciseId) return res.status(400).json({ ok: false, msg: 'Faltan datos' });

    const user = await User.findOne({ email: req.user.email });
    const progress = user.dailyProgress || {};
    if (!progress[date]) progress[date] = [];
    if (!progress[date].includes(exerciseId)) progress[date].push(exerciseId);

    await User.findOneAndUpdate(
      { email: req.user.email },
      { $set: { dailyProgress: progress } },
      { strict: false }
    );
    res.json({ ok: true, progress });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── RACHA ─────────────────────────────────────────────────────────────────────
app.post('/api/streak', auth, async (req, res) => {
  try {
    const { count, lastActive, history } = req.body;
    await User.findOneAndUpdate(
      { email: req.user.email },
      { $set: { streak: { count, lastActive, history } } },
      { strict: false }
    );
    res.json({ ok: true, count });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── LEADERBOARD ───────────────────────────────────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  try {
    const users = await User.find({ 'streak.count': { $gt: 0 } })
      .select('nombre email streak fecha')
      .sort({ 'streak.count': -1 })
      .limit(10);
    res.json({ ok: true, leaderboard: users });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── EJERCICIOS (búsqueda pública) ─────────────────────────────────────────────
app.get('/api/exercises', async (req, res) => {
  try {
    const { musculo, equipo, q } = req.query;
    const query = {};
    if (musculo) query.musculo = musculo;
    if (equipo)  query.equipo = equipo;
    if (q)       query.nombre = { $regex: q, $options: 'i' };
    const exercises = await Exercise.find(query).sort({ musculo: 1 });
    res.json({ ok: true, exercises });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── BOOTSTRAP ADMIN (solo funciona si no hay ningún admin aún) ───────────────
app.post('/api/make-first-admin', auth, async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ isAdmin: true });
    if (adminCount > 0) return res.status(403).json({ ok: false, msg: 'Ya existe un admin. Endpoint desactivado.' });
    await User.updateOne({ email: req.user.email }, { isAdmin: true });
    console.log(`⭐ Usuario ${req.user.email} promovido a admin (primer admin)`);
    res.json({ ok: true, msg: `¡Listo! ${req.user.email} ahora es admin. Reinicia sesión.` });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── ADMIN: GESTIÓN DE USUARIOS ────────────────────────────────────────────────
app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ fecha: -1 });
    res.json({ ok: true, users });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

app.delete('/api/admin/users/:id', adminAuth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true, msg: 'Usuario eliminado' });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

app.patch('/api/admin/users/:id/admin', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.isAdmin = !user.isAdmin;
    await user.save();
    res.json({ ok: true, isAdmin: user.isAdmin });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── ADMIN: GESTIÓN DE EJERCICIOS ──────────────────────────────────────────────
app.post('/api/admin/exercises', adminAuth, async (req, res) => {
  try {
    const ex = await new Exercise(req.body).save();
    res.status(201).json({ ok: true, exercise: ex });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

app.put('/api/admin/exercises/:id', adminAuth, async (req, res) => {
  try {
    const ex = await Exercise.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ ok: true, exercise: ex });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

app.delete('/api/admin/exercises/:id', adminAuth, async (req, res) => {
  try {
    await Exercise.findByIdAndDelete(req.params.id);
    res.json({ ok: true, msg: 'Ejercicio eliminado' });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── ADMIN: MENSAJES DE CONTACTO ───────────────────────────────────────────────
app.get('/api/admin/contacts', adminAuth, async (req, res) => {
  try {
    const contacts = await Contact.find({}).sort({ fecha: -1 });
    res.json({ ok: true, contacts });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

app.patch('/api/admin/contacts/:id/leido', adminAuth, async (req, res) => {
  try {
    await Contact.findByIdAndUpdate(req.params.id, { leido: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── ADMIN: SEED EJERCICIOS ────────────────────────────────────────────────────
app.post('/api/admin/seed-exercises', adminAuth, async (req, res) => {
  try {
    await Exercise.deleteMany({});
    const SEED = [
      { nombre:'Press de banca',             musculo:'Pecho',      descripcion:'Tumbado en banco, baja la barra al esternón y empuja. Codos a 45°.',              dificultad:'Intermedio',    equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','espalda'],          color:'#3b82f6', muscleColor:'#eff6ff', muscleText:'#2563eb', icon:'bi-bar-chart-line', imagen:U('1690731033723-ad718c6e585a') },
      { nombre:'Press con mancuernas',       musculo:'Pecho',      descripcion:'Banco plano, mancuernas a los lados, baja controlado hasta el pecho.',             dificultad:'Principiante',  equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla'],                    color:'#3b82f6', muscleColor:'#eff6ff', muscleText:'#2563eb', icon:'bi-bar-chart-line', imagen:U('1630065612476-294f637f0248') },
      { nombre:'Press en máquina',           musculo:'Pecho',      descripcion:'Ajusta el asiento al nivel del pecho. Empuja hacia adelante de forma controlada.', dificultad:'Principiante',  equipo:['maquinas','completo'],                     restricciones:['ninguna','rodilla','espalda','hombro'], color:'#3b82f6', muscleColor:'#eff6ff', muscleText:'#2563eb', icon:'bi-building',        imagen:U('1517836357463-d25dfeac3438') },
      { nombre:'Flexiones',                  musculo:'Pecho',      descripcion:'Cuerpo recto, codos a 45°. Baja el pecho casi al suelo y sube explosivo.',         dificultad:'Principiante',  equipo:['sin_equipo','pesas','completo','maquinas'], restricciones:['ninguna','rodilla'],                    color:'#3b82f6', muscleColor:'#eff6ff', muscleText:'#2563eb', icon:'bi-person-arms-up',  imagen:U('1598971457999-ca4ef48a9a71') },
      { nombre:'Press inclinado con barra',  musculo:'Pecho',      descripcion:'Banco inclinado 30-45°, baja la barra al pecho superior. Trabaja el pecho alto.',   dificultad:'Intermedio',    equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','hombro'],           color:'#3b82f6', muscleColor:'#eff6ff', muscleText:'#2563eb', icon:'bi-bar-chart-line', imagen:U('1692372372344-41aed374b848') },
      { nombre:'Press inclinado mancuernas', musculo:'Pecho',      descripcion:'Banco inclinado, mancuernas a los lados. Baja hasta la línea del pecho y empuja.',  dificultad:'Intermedio',    equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','hombro'],           color:'#3b82f6', muscleColor:'#eff6ff', muscleText:'#2563eb', icon:'bi-bar-chart-line', imagen:U('1639673529903-bb8be2cc8bb1') },
      { nombre:'Press inclinado máquina',    musculo:'Pecho',      descripcion:'Máquina de press inclinado. Ajusta asiento y empuja hacia arriba controlado.',      dificultad:'Principiante',  equipo:['maquinas','completo'],                     restricciones:['ninguna','rodilla','hombro'],           color:'#3b82f6', muscleColor:'#eff6ff', muscleText:'#2563eb', icon:'bi-building',        imagen:U('1517836357463-d25dfeac3438') },
      { nombre:'Jalón al pecho',             musculo:'Espalda',    descripcion:'Agarra la barra ancha, lleva los codos hacia el suelo apretando la espalda.',      dificultad:'Principiante',  equipo:['maquinas','completo'],                     restricciones:['ninguna','rodilla','hombro'],           color:'#8b5cf6', muscleColor:'#f5f3ff', muscleText:'#7c3aed', icon:'bi-arrow-down-circle', imagen:U('1646072508097-0c8b3cbe44bc') },
      { nombre:'Remo en máquina',            musculo:'Espalda',    descripcion:'Pecho apoyado, tira del agarre hacia ti apretando los omóplatos.',                 dificultad:'Principiante',  equipo:['maquinas','completo'],                     restricciones:['ninguna','rodilla','hombro'],           color:'#8b5cf6', muscleColor:'#f5f3ff', muscleText:'#7c3aed', icon:'bi-arrows-move',      imagen:U('1534258936925-c58bed479fcb') },
      { nombre:'Remo con barra',             musculo:'Espalda',    descripcion:'Espalda recta 45°, tira la barra hacia el ombligo apretando la espalda.',          dificultad:'Avanzado',      equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','hombro'],           color:'#8b5cf6', muscleColor:'#f5f3ff', muscleText:'#7c3aed', icon:'bi-arrows-move',      imagen:U('1604480132736-44c188fe4d20') },
      { nombre:'Dominadas',                  musculo:'Espalda',    descripcion:'Agarre prono ancho, sube hasta que el pecho toque la barra.',                      dificultad:'Avanzado',      equipo:['sin_equipo','pesas','completo'],            restricciones:['ninguna','rodilla'],                    color:'#8b5cf6', muscleColor:'#f5f3ff', muscleText:'#7c3aed', icon:'bi-arrow-up-circle',  imagen:U('1605296867424-35fc25c9212a') },
      { nombre:'Press militar',              musculo:'Hombros',    descripcion:'De pie, empuja la barra desde los hombros hasta arriba. No arquees la espalda.',   dificultad:'Intermedio',    equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla'],                    color:'#f59e0b', muscleColor:'#fffbeb', muscleText:'#d97706', icon:'bi-arrow-up-square',  imagen:U('1541534741688-6078c6bfb5c5') },
      { nombre:'Elevaciones laterales',      musculo:'Hombros',    descripcion:'Mancuernas a los lados, eleva hasta la altura del hombro. Control total.',         dificultad:'Principiante',  equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','espalda'],          color:'#f59e0b', muscleColor:'#fffbeb', muscleText:'#d97706', icon:'bi-arrows-expand',    imagen:U('1606889462784-c033891d5a3e') },
      { nombre:'Sentadilla con barra',       musculo:'Piernas',    descripcion:'Pies al ancho de hombros, baja hasta paralelo. Rodillas alineadas con pies.',      dificultad:'Avanzado',      equipo:['completo','pesas'],                        restricciones:['ninguna','espalda','hombro'],           color:'#10b981', muscleColor:'#ecfdf5', muscleText:'#059669', icon:'bi-person-standing',  imagen:U('1666121363683-1f03bf2e0cc1') },
      { nombre:'Prensa de piernas',          musculo:'Piernas',    descripcion:'Pies al ancho de caderas, baja hasta 90°. No bloquees las rodillas al subir.',     dificultad:'Principiante',  equipo:['maquinas','completo'],                     restricciones:['ninguna','espalda','hombro'],           color:'#10b981', muscleColor:'#ecfdf5', muscleText:'#059669', icon:'bi-building',         imagen:U('1434682772747-f16d3ea162c3') },
      { nombre:'Extensión de piernas',       musculo:'Cuádriceps', descripcion:'En máquina, extiende la pierna completamente y baja despacio.',                    dificultad:'Principiante',  equipo:['maquinas','completo'],                     restricciones:['ninguna','espalda','hombro'],           color:'#10b981', muscleColor:'#ecfdf5', muscleText:'#059669', icon:'bi-person-standing',  imagen:U('1738524107966-23c49aa65ba3') },
      { nombre:'Curl femoral',               musculo:'Isquios',    descripcion:'Tumbado o sentado, flexiona la rodilla hasta 90°. Control en la bajada.',          dificultad:'Principiante',  equipo:['maquinas','completo'],                     restricciones:['ninguna','espalda','hombro'],           color:'#10b981', muscleColor:'#ecfdf5', muscleText:'#059669', icon:'bi-person-standing',  imagen:U('1574680178050-55c6a6a96e0a') },
      { nombre:'Zancadas',                   musculo:'Piernas',    descripcion:'Da un paso al frente y baja la rodilla trasera casi al suelo.',                    dificultad:'Principiante',  equipo:['sin_equipo','pesas','completo'],            restricciones:['ninguna','espalda','hombro'],           color:'#10b981', muscleColor:'#ecfdf5', muscleText:'#059669', icon:'bi-person-walking',   imagen:U('1650116385006-2a82a7b9941b') },
      { nombre:'Curl con barra',             musculo:'Bíceps',     descripcion:'Codos pegados al cuerpo, sube la barra y baja controlado. Sin balanceo.',          dificultad:'Principiante',  equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','espalda'],          color:'#14b8a6', muscleColor:'#f0fdfa', muscleText:'#0d9488', icon:'bi-bar-chart-steps',  imagen:U('1597452573811-85e7383195a6') },
      { nombre:'Curl alterno',          musculo:'Bíceps',     descripcion:'De pie, curla una mancuerna, supina la muñeca al subir. Alterna lados.',           dificultad:'Principiante',  equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','espalda'], color:'#14b8a6', muscleColor:'#f0fdfa', muscleText:'#0d9488', icon:'bi-bar-chart-steps',  imagen:U('1598268030450-7a476f602bf6') },
      { nombre:'Curl martillo',         musculo:'Bíceps',     descripcion:'Agarre neutro (como un martillo), curla la mancuerna sin rotar la muñeca.',        dificultad:'Principiante',  equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','espalda'], color:'#14b8a6', muscleColor:'#f0fdfa', muscleText:'#0d9488', icon:'bi-bar-chart-steps',  imagen:U('1581009146145-b5ef050c2e1e') },
      { nombre:'Curl en polea',         musculo:'Bíceps',     descripcion:'Polea baja, agarra la barra o cuerda y curla hacia los hombros. Tensión constante.',dificultad:'Principiante',  equipo:['maquinas','completo'],                     restricciones:['ninguna','rodilla','espalda'], color:'#14b8a6', muscleColor:'#f0fdfa', muscleText:'#0d9488', icon:'bi-arrow-up-circle',  imagen:U('1534438327276-14e5300c3a48') },
      { nombre:'Curl predicador',       musculo:'Bíceps',     descripcion:'Apoya los tríceps en el banco predicador. Curla sin levantar los codos.',          dificultad:'Intermedio',    equipo:['maquinas','completo','pesas'],              restricciones:['ninguna','rodilla','espalda'], color:'#14b8a6', muscleColor:'#f0fdfa', muscleText:'#0d9488', icon:'bi-building',         imagen:U('1583454110551-21f2fa2afe61') },
      { nombre:'Extensión en polea',    musculo:'Tríceps',    descripcion:'Codos fijos, empuja la cuerda hacia abajo hasta extender el brazo.',               dificultad:'Principiante',  equipo:['maquinas','completo'],                     restricciones:['ninguna','rodilla','espalda'], color:'#f97066', muscleColor:'#fef2f2', muscleText:'#dc2626', icon:'bi-arrow-down',        imagen:U('1581009146145-b5ef050c2e1e') },
      { nombre:'Fondos en paralelas',   musculo:'Tríceps',    descripcion:'Baja hasta 90° de flexión en el codo. Cuerpo ligeramente inclinado.',              dificultad:'Intermedio',    equipo:['sin_equipo','pesas','completo'],            restricciones:['ninguna','rodilla'],           color:'#f97066', muscleColor:'#fef2f2', muscleText:'#dc2626', icon:'bi-person-arms-up',  imagen:U('1634225251578-d5f6ffced78a') },
      { nombre:'Press francés',         musculo:'Tríceps',    descripcion:'Tumbado, baja la barra hacia la frente doblando solo los codos. Sube explosivo.',   dificultad:'Intermedio',    equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','hombro'],  color:'#f97066', muscleColor:'#fef2f2', muscleText:'#dc2626', icon:'bi-bar-chart-line',  imagen:U('1690731033723-ad718c6e585a') },
      { nombre:'Patada de tríceps',     musculo:'Tríceps',    descripcion:'Inclinado hacia adelante, codo fijo arriba, extiende el brazo hacia atrás.',       dificultad:'Principiante',  equipo:['completo','pesas'],                        restricciones:['ninguna','rodilla','espalda'], color:'#f97066', muscleColor:'#fef2f2', muscleText:'#dc2626', icon:'bi-arrow-right',      imagen:U('1598268030450-7a476f602bf6') },
      { nombre:'Plancha',               musculo:'Core',       descripcion:'Cuerpo recto apoyado en codos. Contrae el abdomen. Sin caer la cadera.',           dificultad:'Principiante',  equipo:['sin_equipo','pesas','completo','maquinas'], restricciones:['ninguna','rodilla','hombro'],  color:'#6366f1', muscleColor:'#eef2ff', muscleText:'#4f46e5', icon:'bi-align-middle',     imagen:U('1544216717-3bbf52512659') },
      { nombre:'Crunch abdominal',      musculo:'Core',       descripcion:'Tumbado, curva la columna llevando las costillas hacia la pelvis.',                 dificultad:'Principiante',  equipo:['sin_equipo','pesas','completo','maquinas'], restricciones:['ninguna','rodilla','hombro'],  color:'#6366f1', muscleColor:'#eef2ff', muscleText:'#4f46e5', icon:'bi-arrow-repeat',     imagen:U('1616803824305-a07cfbc8ea60') },
      { nombre:'Bicicleta estática',    musculo:'Cardio',     descripcion:'Resistencia moderada, mantén un ritmo constante durante toda la sesión.',          dificultad:'Principiante',  equipo:['maquinas','completo'],                     restricciones:['ninguna','espalda','hombro'],  color:'#06b6d4', muscleColor:'#ecfeff', muscleText:'#0891b2', icon:'bi-bicycle',          imagen:U('1571902943202-507ec2618e8f') },
      { nombre:'Caminata inclinada',    musculo:'Cardio',     descripcion:'Cinta a 6-8% inclinación, ritmo moderado. Quema grasa sin perder músculo.',        dificultad:'Principiante',  equipo:['maquinas','completo'],                     restricciones:['ninguna','espalda','hombro'],  color:'#06b6d4', muscleColor:'#ecfeff', muscleText:'#0891b2', icon:'bi-person-walking',   imagen:U('1637713871652-4c9f1e601209') },
      { nombre:'Jumping Jacks',         musculo:'Cardio',     descripcion:'Saltos con brazos arriba y piernas abiertas. Ritmo constante 30-60s.',              dificultad:'Principiante',  equipo:['sin_equipo','pesas','completo','maquinas'], restricciones:['ninguna','espalda','hombro'],  color:'#06b6d4', muscleColor:'#ecfeff', muscleText:'#0891b2', icon:'bi-stars',            imagen:U('1587433093163-49f2914e17e7') }
    ];
    await Exercise.insertMany(SEED);
    res.json({ ok: true, msg: `${SEED.length} ejercicios insertados en MongoDB` });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── MI RUTINA PERSONALIZADA ───────────────────────────────────────────────────
app.get('/api/my-routine', auth, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email }).select('customRoutine routine');
    res.json({ ok: true, customRoutine: user.customRoutine || null, aiRoutine: user.routine || null });
  } catch(e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

app.post('/api/my-routine', auth, async (req, res) => {
  try {
    const { exercises } = req.body;
    if (!Array.isArray(exercises)) return res.status(400).json({ ok: false, msg: 'Formato incorrecto' });
    await User.findOneAndUpdate({ email: req.user.email }, { customRoutine: exercises });
    res.json({ ok: true, msg: 'Rutina guardada correctamente' });
  } catch(e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── CONTACTO ──────────────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  try {
    const { nombre, email, asunto, mensaje } = req.body;
    if (!nombre || !email || !mensaje)
      return res.status(400).json({ ok: false, msg: 'Faltan campos obligatorios' });
    await new Contact({ nombre, email, asunto, mensaje }).save();
    res.json({ ok: true, msg: 'Mensaje enviado correctamente' });
  } catch (e) {
    res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
});

// ── TEST EMAIL (solo desarrollo) ──────────────────────────────────────────────
app.get('/api/test-email', async (req, res) => {
  const to = req.query.to || process.env.EMAIL_USER;
  try {
    console.log(`🧪 Enviando email de prueba a ${to}...`);
    await sendMail(to, '🧪 Test email — Empieza en el Gym', `
      <div style="font-family:sans-serif;padding:24px">
        <h2 style="color:#10b981">¡Email funcionando!</h2>
        <p>Si ves esto, el sistema de emails está correctamente configurado.</p>
      </div>
    `);
    res.json({ ok: true, msg: `Email de prueba enviado a ${to}` });
  } catch(e) {
    console.error('❌ Error test-email:', e.message);
    res.status(500).json({ ok: false, msg: e.message });
  }
});

// ── SERVIR FRONTEND ──────────────────────────────────────────────────────────
const path = require('path');
app.use(express.static(path.join(__dirname, '..')));

// ── ARRANCAR SERVIDOR ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
  console.log(`📧 Email configurado: ${process.env.EMAIL_USER || '❌ NO CONFIGURADO'}`);
  console.log(`🔐 Verificación de email: ACTIVADA`);

  // Verificar conexión SMTP al arrancar
  if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'tucorreo@gmail.com') {
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Error SMTP:', error.message);
      } else {
        console.log('✅ Conexión SMTP lista para enviar emails');
      }
    });
  }
});
