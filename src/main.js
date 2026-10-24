import { soundManager } from './audio.js';
import { createProceduralScenes } from './scenes.js';
import { buildPuzzle, createBoardTemplate } from './puzzle.js';
import { HandDetector, CONNECTIONS } from './detector.js';

// ================= CONSTANTES Y CONFIGURACIÓN =================
const W = 1280;
const H = 720;
const S = 480;                      // Tamaño del tablero cuadrado
const X0 = Math.floor((W - S) / 2); // Esquina X del tablero centrado (400)
const Y0 = 160;                     // Esquina Y del tablero
const UMBRAL_CERRAR = 0.75;
const UMBRAL_ABRIR = 0.95;
const AYUDAS = [0.35, 0.6, 0.9];
const NOMBRES_AYUDA = ['Baja', 'Media', 'Alta'];

// Colores sobrios y modernos
const COLOR_ACENTO = '#00b4ff';
const COLOR_VERDE = '#3dd68c';
const COLOR_TEXTO = '#f1f5f9';
const COLOR_GRIS = '#94a3b8';
const COLOR_PANEL = '#26201c';
const COLOR_PANEL_SOBRE = '#3b322c';
const COLOR_BORDE = '#5a4f47';
const CHISPAS_COLORES = ['#00b4ff', '#7dd3fc', '#ffffff', '#3dd68c', '#fbbf24'];

// ================= ELEMENTOS DEL DOM =================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('webcam');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingTitle = document.getElementById('loadingTitle');
const loadingMsg = document.getElementById('loadingMsg');
const mouseFallbackBtn = document.getElementById('mouseFallbackBtn');
const btnUseMouse = document.getElementById('btnUseMouse');

// HUD DOM
const hudStats = document.getElementById('hudStats');
const statPieces = document.getElementById('statPieces');
const statTime = document.getElementById('statTime');
const statMoves = document.getElementById('statMoves');
const btnToggleRef = document.getElementById('btnToggleRef');
const btnSound = document.getElementById('btnSound');
const btnFullscreen = document.getElementById('btnFullscreen');
const imageUpload = document.getElementById('imageUpload');
const bottomHint = document.getElementById('bottomHint');

// ================= ESTADO DEL JUEGO =================
let estado = 'menu'; // 'menu', 'juego', 'fin'
let n = 3;
let piezas = [];
let plantilla = null;
let sostenida = null;
let C = 0, M = 0, PP = 0, PS = 0;
let imagenes = createProceduralScenes(S);
let indice_img = 0;
let img_actual = imagenes[0];
let ref_mini = null;
let ayuda_i = 1; // Media por defecto
let mostrar_ref = true;
let movimientos = 0;
let t_ini = 0;
let t_fin = 0;
let esperar_abrir = true;

// Partículas y efectos
let chispas = [];
let anillos = [];

// Interacción de la Mano
const detector = new HandDetector();
let cursor = { x: W / 2, y: H / 2 };
let hay_mano = false;
let cerrada = false;
let cerrada_prev = false;
let vista_mano_time = 0;
let usando_mouse = false;
let mousePresionado = false;

// Botones de la interfaz
const BOTONES_MENU = [
  { rect: [380, 220, 900, 290], texto: 'Principiante  |  3 x 3  |  9 piezas', tipo: 'nivel', n: 3 },
  { rect: [380, 305, 900, 375], texto: 'Intermedio  |  4 x 4  |  16 piezas', tipo: 'nivel', n: 4 },
  { rect: [380, 390, 900, 460], texto: 'Avanzado  |  5 x 5  |  25 piezas', tipo: 'nivel', n: 5 },
  { rect: [380, 485, 900, 545], texto: '', tipo: 'ayuda', n: 0 },
  { rect: [380, 565, 900, 625], texto: 'Cambiar Imagen', tipo: 'imagen', n: 0 }
];

const BOTON_VOLVER_MENU = { rect: [1110, 24, 1250, 70], texto: 'Menú' };

const BOTONES_FIN = [
  { rect: [40, 320, 360, 390], texto: 'Jugar de nuevo', accion: 'otro' },
  { rect: [920, 320, 1240, 390], texto: 'Menú principal', accion: 'menu' }
];

// ================= EFECTOS DE PARTÍCULAS =================
function explosion(x, y, cant = 16, vmax = 7) {
  for (let i = 0; i < cant; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 1.5 + Math.random() * (vmax - 1.5);
    chispas.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      color: CHISPAS_COLORES[Math.floor(Math.random() * CHISPAS_COLORES.length)],
      r: 2 + Math.random() * 3,
      vida: 24 + Math.floor(Math.random() * 25)
    });
  }
}

function updateEfectos() {
  // Chispas
  for (let i = chispas.length - 1; i >= 0; i--) {
    const p = chispas[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12; // gravedad
    p.vx *= 0.97;
    p.vida--;
    if (p.vida <= 0) {
      chispas.splice(i, 1);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Anillos expansivos
  for (let i = anillos.length - 1; i >= 0; i--) {
    const a = anillos[i];
    a.r += 3.5;
    a.vida--;
    if (a.vida <= 0) {
      anillos.splice(i, 1);
    } else {
      const alpha = a.vida / 28;
      ctx.strokeStyle = `rgba(0, 180, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// ================= FUNCIONES DE DIBUJO Y BOTONES =================
function rectRedondo(c, x1, y1, x2, y2, r = 14) {
  c.beginPath();
  c.moveTo(x1 + r, y1);
  c.lineTo(x2 - r, y1);
  c.quadraticCurveTo(x2, y1, x2, y1 + r);
  c.lineTo(x2, y2 - r);
  c.quadraticCurveTo(x2, y2, x2 - r, y2);
  c.lineTo(x1 + r, y2);
  c.quadraticCurveTo(x1, y2, x1, y2 - r);
  c.lineTo(x1, y1 + r);
  c.quadraticCurveTo(x1, y1, x1 + r, y1);
  c.closePath();
}

function dentro(b, x, y) {
  const [x1, y1, x2, y2] = b.rect;
  return x >= x1 && x <= x2 && y >= y1 && y <= y2;
}

function dibujarBoton(b, sobre, escala = 0.9) {
  const [x1, y1, x2, y2] = b.rect;

  ctx.save();
  // Borde externo
  ctx.fillStyle = sobre ? COLOR_ACENTO : COLOR_BORDE;
  rectRedondo(ctx, x1, y1, x2, y2, 14);
  ctx.fill();

  if (sobre) {
    ctx.shadowColor = 'rgba(0, 180, 255, 0.45)';
    ctx.shadowBlur = 18;
  }

  // Relleno interno
  ctx.fillStyle = sobre ? COLOR_PANEL_SOBRE : COLOR_PANEL;
  rectRedondo(ctx, x1 + 2, y1 + 2, x2 - 2, y2 - 2, 12);
  ctx.fill();
  ctx.restore();

  // Texto
  ctx.save();
  ctx.font = `600 ${Math.floor(22 * escala)}px Outfit, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  // Sombra del texto
  ctx.fillStyle = '#0a0807';
  ctx.fillText(b.texto, mx + 2, my + 2);

  ctx.fillStyle = sobre ? '#ffffff' : COLOR_TEXTO;
  ctx.fillText(b.texto, mx, my);
  ctx.restore();
}

// ================= LÓGICA DE JUEGO =================
function irMenu() {
  estado = 'menu';
  sostenida = null;
  esperar_abrir = true;
  hudStats.style.display = 'none';
  bottomHint.innerText = 'Cierra la mano sobre una opción para seleccionarla';
}

function nuevoJuego(nn) {
  n = nn;
  const built = buildPuzzle(img_actual, n, S, X0, Y0);
  piezas = built.pieces;
  C = built.c;
  M = built.m;
  PP = built.P;
  PS = built.Ps;

  plantilla = createBoardTemplate(piezas, S, C, M, PP);

  // Crear miniatura para referencia
  ref_mini = document.createElement('canvas');
  ref_mini.width = 80;
  ref_mini.height = 80;
  const rmctx = ref_mini.getContext('2d');
  rmctx.drawImage(img_actual, 0, 0, 80, 80);

  // Distribuir piezas en las bandejas izquierda y derecha
  const total = piezas.length;
  const slots = [];
  const kLeft = Math.ceil(total / 2);
  const kRight = Math.floor(total / 2);

  [
    { x1: 20, x2: X0 - 20, k: kLeft },
    { x1: X0 + S + 20, x2: W - 20, k: kRight }
  ].forEach(({ x1, x2, k }) => {
    const filas = Math.ceil(k / 2);
    for (let i = 0; i < k; i++) {
      const col = i % 2;
      const fila = Math.floor(i / 2);
      slots.push({
        x: x1 + ((x2 - x1) * (col + 0.5)) / 2,
        y: 120 + ((H - 140) * (fila + 0.5)) / filas
      });
    }
  });

  // Mezclar slots y piezas
  slots.sort(() => Math.random() - 0.5);
  piezas.sort(() => Math.random() - 0.5);

  piezas.forEach((p, idx) => {
    const s = slots[idx];
    p.cx = s.x + (Math.random() * 16 - 8);
    p.cy = s.y + (Math.random() * 16 - 8);
  });

  chispas = [];
  anillos = [];
  sostenida = null;
  movimientos = 0;
  t_ini = performance.now();
  estado = 'juego';
  esperar_abrir = true;

  hudStats.style.display = 'flex';
  bottomHint.innerText = 'Cierra el puño para tomar la pieza • Ábrelo para soltarla';
}

function piezaEn(mx, my) {
  for (let i = piezas.length - 1; i >= 0; i--) {
    const p = piezas[i];
    if (p.fija) continue;
    const dist = Math.hypot(mx - p.cx, my - p.cy);
    if (dist <= p.radius) {
      return p;
    }
  }
  return null;
}

function soltar() {
  if (!sostenida) return;
  const p = sostenida;
  sostenida = null;
  movimientos++;

  // Restringir a los bordes de la pantalla
  p.cx = Math.max(PS / 2, Math.min(W - PS / 2, p.cx));
  p.cy = Math.max(PS / 2, Math.min(H - PS / 2, p.cy));

  // Verificar si está cerca de la posición correcta
  const dist = Math.hypot(p.cx - p.tx, p.cy - p.ty);
  const umbralEncaje = C * AYUDAS[ayuda_i];

  if (dist < umbralEncaje) {
    p.cx = p.tx;
    p.cy = p.ty;
    p.fija = true;
    anillos.push({ x: p.tx, y: p.ty, r: 20, vida: 28 });
    explosion(p.tx, p.ty, 14, 7);

    const completado = piezas.every(q => q.fija);
    if (completado) {
      estado = 'fin';
      t_fin = performance.now();
      esperar_abrir = true;
      soundManager.play('final');
      for (let i = 0; i < 5; i++) {
        explosion(X0 + Math.random() * S, Y0 + Math.random() * S, 25, 11);
      }
      bottomHint.innerText = '¡Felicidades! Rompecabezas completado con éxito';
    } else {
      soundManager.play('colocar');
    }
  }
}

// ================= RENDERIZADO DEL JUEGO =================
function renderTablero() {
  ctx.save();
  // Sombra del tablero
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(X0 + 10, Y0 + 12, S, S);

  // Marco y ranuras
  if (plantilla) {
    ctx.drawImage(plantilla, X0, Y0);
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLOR_BORDE;
  ctx.strokeRect(X0 - 2, Y0 - 2, S + 4, S + 4);

  // 1. Dibujar piezas fijas en el tablero
  piezas.forEach(p => {
    if (p.fija) {
      ctx.drawImage(p.canvas, Math.floor(p.cx - PP / 2), Math.floor(p.cy - PP / 2));
    }
  });

  // 2. Dibujar piezas sueltas en las bandejas (versión reducida)
  piezas.forEach(p => {
    if (!p.fija && p !== sostenida) {
      ctx.drawImage(p.smallCanvas, Math.floor(p.cx - PS / 2), Math.floor(p.cy - PS / 2));
    }
  });

  // 3. Dibujar la pieza actualmente sostenida (tamaño real con sombra flotante)
  if (sostenida) {
    const p = sostenida;
    ctx.save();
    // Sombra proyectada
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 12;
    ctx.shadowOffsetY = 16;
    ctx.drawImage(p.canvas, Math.floor(p.cx - PP / 2), Math.floor(p.cy - PP / 2));
    ctx.restore();

    // Si está cerca del objetivo, resaltar el contorno objetivo
    const dist = Math.hypot(p.cx - p.tx, p.cy - p.ty);
    if (dist < C * 1.2) {
      ctx.save();
      ctx.translate(p.col * C + X0 - M, p.row * C + Y0 - M);
      ctx.lineWidth = 2 + Math.abs(Math.sin(performance.now() * 0.006)) * 2;
      ctx.strokeStyle = COLOR_ACENTO;
      ctx.shadowColor = COLOR_ACENTO;
      ctx.shadowBlur = 10;
      ctx.stroke(p.path);
      ctx.restore();
    }
  }

  ctx.restore();
}

function renderHUD(completado) {
  const fijas = piezas.filter(p => p.fija).length;
  const total = piezas.length;
  const tiempoSegundos = Math.floor(((completado ? t_fin : performance.now()) - t_ini) / 1000);
  const minutos = String(Math.floor(tiempoSegundos / 60)).padStart(2, '0');
  const segundos = String(tiempoSegundos % 60).padStart(2, '0');

  // Actualizar stats en el DOM superior
  statPieces.innerText = `${fijas} / ${total}`;
  statTime.innerText = `${minutos}:${segundos}`;
  statMoves.innerText = String(movimientos);

  // Barra de progreso de encaje en canvas
  ctx.save();
  ctx.fillStyle = COLOR_PANEL;
  ctx.fillRect(0, 96, W, 4);
  ctx.fillStyle = COLOR_ACENTO;
  const progresoW = total > 0 ? (W * fijas) / total : 0;
  ctx.fillRect(0, 96, progresoW, 4);
  ctx.restore();

  // Miniatura de referencia flotante
  if (mostrar_ref && ref_mini) {
    ctx.save();
    ctx.drawImage(ref_mini, 20, 10, 80, 80);
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLOR_BORDE;
    ctx.strokeRect(20, 10, 80, 80);
    ctx.restore();
  }
}

function renderMano(pts, cx, cy, cerradaActiva) {
  ctx.save();
  // Esqueleto óseo
  if (pts && pts.length >= 21) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    CONNECTIONS.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(pts[a][0], pts[a][1]);
      ctx.lineTo(pts[b][0], pts[b][1]);
      ctx.stroke();
    });

    pts.forEach(p => {
      ctx.fillStyle = COLOR_ACENTO;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Cursor del usuario
  ctx.beginPath();
  if (cerradaActiva) {
    // Puño cerrado (agarrando o clic)
    ctx.fillStyle = COLOR_ACENTO;
    ctx.shadowColor = COLOR_ACENTO;
    ctx.shadowBlur = 15;
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  } else {
    // Mano abierta (cursor libre)
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ================= BUCLE PRINCIPAL =================
function gameLoop() {
  // Limpiar y fondo oscuro degradado
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#191e2b');
  bgGrad.addColorStop(1, '#0c0f14');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const ahora = performance.now();

  // 1. Detectar mano desde el video
  if (!usando_mouse) {
    const resMano = detector.detect(video, W, H);
    if (resMano) {
      const { pts, cx, cy, ratio } = resMano;
      // Suavizado cinemático exponencial
      cursor.x += (cx - cursor.x) * 0.55;
      cursor.y += (cy - cursor.y) * 0.55;
      cerrada = ratio < (cerrada ? UMBRAL_ABRIR : UMBRAL_CERRAR);
      vista_mano_time = ahora;
      hay_mano = true;
    } else if (ahora - vista_mano_time > 500) {
      hay_mano = false;
      cerrada = false;
    }
  } else {
    hay_mano = true;
    cerrada = mousePresionado;
  }

  // Prevención de clics accidentales tras cambiar de pantalla
  let cerrada_ef = false;
  if (esperar_abrir) {
    if (!cerrada) {
      esperar_abrir = false;
    }
  } else {
    cerrada_ef = cerrada;
  }

  const click = cerrada_ef && !cerrada_prev;
  cerrada_prev = cerrada_ef;
  const mx = cursor.x;
  const my = cursor.y;

  // ================= PANTALLA: MENÚ =================
  if (estado === 'menu') {
    // Título elegante
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOR_TEXTO;
    ctx.font = '700 48px Outfit, sans-serif';
    ctx.fillText('R O M P E C A B E Z A S   I A', W / 2, 130);

    // Línea de acento
    ctx.fillStyle = COLOR_ACENTO;
    ctx.fillRect(W / 2 - 140, 150, 280, 4);

    ctx.fillStyle = COLOR_GRIS;
    ctx.font = '500 20px Inter, sans-serif';
    ctx.fillText('Control por gestos manuales con Visión Artificial', W / 2, 190);
    ctx.restore();

    // Dibujar botones
    BOTONES_MENU.forEach(b => {
      if (b.tipo === 'ayuda') {
        b.texto = 'Ayuda de encaje: ' + NOMBRES_AYUDA[ayuda_i];
      }
      const sobre = hay_mano && dentro(b, mx, my);
      dibujarBoton(b, sobre);

      if (sobre && click) {
        soundManager.play('click');
        if (b.tipo === 'nivel') {
          nuevoJuego(b.n);
        } else if (b.tipo === 'ayuda') {
          ayuda_i = (ayuda_i + 1) % AYUDAS.length;
        } else if (b.tipo === 'imagen') {
          indice_img = (indice_img + 1) % imagenes.length;
          img_actual = imagenes[indice_img];
        }
      }
    });

    // Vista previa de la imagen actual en el menú
    ctx.save();
    const previewSize = 140;
    const px = W / 2 - previewSize / 2;
    const py = 635;
    ctx.drawImage(img_actual, px, py, previewSize, previewSize * 0.55);
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLOR_BORDE;
    ctx.strokeRect(px, py, previewSize, previewSize * 0.55);
    ctx.restore();
  }

  // ================= PANTALLA: JUEGO =================
  else if (estado === 'juego') {
    if (cerrada_ef && hay_mano) {
      if (!sostenida) {
        const p = piezaEn(mx, my);
        if (p) {
          sostenida = p;
          // Traer la pieza al frente
          piezas = piezas.filter(q => q !== p).concat([p]);
          soundManager.play('agarrar');
        } else if (click && dentro(BOTON_VOLVER_MENU, mx, my)) {
          soundManager.play('click');
          irMenu();
        }
      }
      if (sostenida) {
        sostenida.cx = mx;
        sostenida.cy = my;
      }
    } else if (sostenida) {
      soltar();
    }

    renderTablero();
    renderHUD(false);

    // Botón para volver al menú
    const sobreMenu = hay_mano && dentro(BOTON_VOLVER_MENU, mx, my);
    dibujarBoton(BOTON_VOLVER_MENU, sobreMenu, 0.7);
  }

  // ================= PANTALLA: FIN / VICTORIA =================
  else if (estado === 'fin') {
    renderTablero();
    renderHUD(true);

    // Explosiones de confeti continuas
    if (Math.random() < 0.45) {
      explosion(X0 + Math.random() * S, Y0 + Math.random() * S, 10, 8);
    }

    BOTONES_FIN.forEach(b => {
      const sobre = hay_mano && dentro(b, mx, my);
      dibujarBoton(b, sobre);
      if (sobre && click) {
        soundManager.play('click');
        if (b.accion === 'otro') {
          nuevoJuego(n);
        } else {
          irMenu();
        }
      }
    });
  }

  // ================= ELEMENTOS COMUNES =================
  updateEfectos();

  if (hay_mano) {
    renderMano(null, mx, my, cerrada_ef);
  }

  requestAnimationFrame(gameLoop);
}

// ================= INICIALIZACIÓN DE CÁMARA Y DETECTOR =================
async function initCamera() {
  try {
    loadingTitle.innerText = 'Accediendo a la Cámara';
    loadingMsg.innerText = 'Por favor, autoriza el permiso de la cámara web...';

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false
    });
    video.srcObject = stream;
    await new Promise(resolve => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });

    await detector.init(msg => {
      loadingMsg.innerText = msg;
    });

    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
    }, 400);

    irMenu();
  } catch (err) {
    console.warn('Cámara no disponible o permiso denegado:', err);
    loadingTitle.innerText = 'Cámara no detectada';
    loadingMsg.innerText =
      'No se pudo conectar a la cámara web. Puedes seguir jugando cómodamente usando tu ratón o pantalla táctil.';
    mouseFallbackBtn.style.display = 'block';
  }
}

// ================= CONTROLES DE RATÓN Y TOUCH =================
function setupMouseAndTouch() {
  btnUseMouse.addEventListener('click', () => {
    usando_mouse = true;
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
    }, 400);
    irMenu();
  });

  const updateMousePos = e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    cursor.x = (e.clientX - rect.left) * scaleX;
    cursor.y = (e.clientY - rect.top) * scaleY;
    usando_mouse = true;
  };

  canvas.addEventListener('mousemove', updateMousePos);
  canvas.addEventListener('mousedown', e => {
    updateMousePos(e);
    mousePresionado = true;
    soundManager.init();
  });
  window.addEventListener('mouseup', () => {
    mousePresionado = false;
  });

  // Touch para móviles / tablets
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      cursor.x = (t.clientX - rect.left) * (W / rect.width);
      cursor.y = (t.clientY - rect.top) * (H / rect.height);
      usando_mouse = true;
    }
  }, { passive: false });

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      cursor.x = (t.clientX - rect.left) * (W / rect.width);
      cursor.y = (t.clientY - rect.top) * (H / rect.height);
      usando_mouse = true;
      mousePresionado = true;
      soundManager.init();
    }
  }, { passive: false });

  window.addEventListener('touchend', () => {
    mousePresionado = false;
  });
}

// ================= BOTONES DEL DOM =================
function setupDOMControls() {
  btnToggleRef.addEventListener('click', () => {
    mostrar_ref = !mostrar_ref;
  });

  btnSound.addEventListener('click', () => {
    soundManager.muted = !soundManager.muted;
    btnSound.style.opacity = soundManager.muted ? '0.5' : '1.0';
  });

  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Cargar foto propia del usuario
  imageUpload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const userImg = new Image();
      userImg.onload = () => {
        // Crear canvas cuadrado centrado (S x S)
        const userCanvas = document.createElement('canvas');
        userCanvas.width = S;
        userCanvas.height = S;
        const uctx = userCanvas.getContext('2d');

        const minDim = Math.min(userImg.width, userImg.height);
        const sx = (userImg.width - minDim) / 2;
        const sy = (userImg.height - minDim) / 2;
        uctx.drawImage(userImg, sx, sy, minDim, minDim, 0, 0, S, S);

        imagenes.unshift(userCanvas);
        indice_img = 0;
        img_actual = userCanvas;
        soundManager.play('click');
        if (estado === 'juego') {
          nuevoJuego(n);
        }
      };
      userImg.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Atajos de teclado
  window.addEventListener('keydown', e => {
    soundManager.init();
    const key = e.key.toLowerCase();
    if (key === 'm') irMenu();
    if (key === 'n' && estado !== 'menu') nuevoJuego(n);
    if (key === 'v') mostrar_ref = !mostrar_ref;
    if (key === 'f') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  });
}

// ================= PUNTO DE ENTRADA =================
setupMouseAndTouch();
setupDOMControls();
requestAnimationFrame(gameLoop);
initCamera();
