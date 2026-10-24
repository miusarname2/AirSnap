import { soundManager } from './audio.js';
import { createProceduralScenes } from './scenes.js';
import { buildPuzzle, createBoardTemplate } from './puzzle.js';
import { HandDetector, CONNECTIONS } from './detector.js';

// ================= CONFIGURACIÓN =================
const W = 1280;
const H = 720;
const S = 480;                      // Tamaño del tablero (cuadrado)
const X0 = Math.floor((W - S) / 2); // 400 (tablero centrado)
const Y0 = 160;                     // Esquina Y del tablero
const UMBRAL_CERRAR = 0.75;         // Más bajo = hay que cerrar más fuerte el puño
const UMBRAL_ABRIR = 0.95;
const AYUDAS = [0.35, 0.6, 0.9];
const NOMBRES_AYUDA = ['Baja', 'Media', 'Alta'];

// Paleta de colores sobria y moderna (BGR/RGB)
const ACENTO = '#00b4ff';
const VERDE = '#3dd68c';
const TEXTO = '#f1f5f9';
const GRIS = '#94a3b8';
const PANEL = '#26201c';
const PANEL_SOBRE = '#3b322c';
const BORDE = '#5a4f47';
const CHISPAS = ['#00b4ff', '#7dd3fc', '#ffffff', '#3dd68c', '#fbbf24'];

// ================= ELEMENTOS DEL DOM =================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('webcam');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingTitle = document.getElementById('loadingTitle');
const loadingMsg = document.getElementById('loadingMsg');

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
let ayuda_i = 1;
let mostrar_ref = true;
let movimientos = 0;
let t_ini = 0;
let t_fin = 0;
let esperar_abrir = true;

let debug = false;
let nitida = false;
let ratio_actual = 0.0;

// Efectos
let chispas_list = [];
let anillos_list = [];

// Detector y Cinemática de la Mano
const detector = new HandDetector();
let cursor = { x: W / 2, y: H / 2 };
let hay_mano = false;
let currentHandPts = null;
let cerrada = false;
let cerrada_prev = false;
let vista_mano_time = 0;

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

// ================= EFECTOS =================
function explosion(x, y, cant = 14, vmax = 7) {
  for (let i = 0; i < cant; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 1.5 + Math.random() * (vmax - 1.5);
    chispas_list.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      color: CHISPAS[Math.floor(Math.random() * CHISPAS.length)],
      r: 2 + Math.random() * 3,
      vida: 22 + Math.floor(Math.random() * 24)
    });
  }
}

function updateEfectos() {
  // Chispas
  for (let i = chispas_list.length - 1; i >= 0; i--) {
    const p = chispas_list[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.vx *= 0.97;
    p.vida--;
    if (p.vida <= 0) {
      chispas_list.splice(i, 1);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Anillos
  for (let i = anillos_list.length - 1; i >= 0; i--) {
    const a = anillos_list[i];
    a.r += 3.5;
    a.vida--;
    if (a.vida <= 0) {
      anillos_list.splice(i, 1);
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

// ================= INTERFAZ Y BOTONES =================
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
  ctx.fillStyle = sobre ? ACENTO : BORDE;
  rectRedondo(ctx, x1, y1, x2, y2, 14);
  ctx.fill();

  if (sobre) {
    ctx.shadowColor = 'rgba(0, 180, 255, 0.45)';
    ctx.shadowBlur = 18;
  }

  ctx.fillStyle = sobre ? PANEL_SOBRE : PANEL;
  rectRedondo(ctx, x1 + 2, y1 + 2, x2 - 2, y2 - 2, 12);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.font = `600 ${Math.floor(22 * escala)}px Outfit, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  ctx.fillStyle = '#0a0807';
  ctx.fillText(b.texto, mx + 2, my + 2);

  ctx.fillStyle = sobre ? '#ffffff' : TEXTO;
  ctx.fillText(b.texto, mx, my);
  ctx.restore();
}

// ================= LÓGICA DEL ROMPECABEZAS =================
function irMenu() {
  estado = 'menu';
  sostenida = null;
  esperar_abrir = true;
  hudStats.style.display = 'none';
  bottomHint.innerText = 'Cierra el puño sobre una opción para seleccionarla';
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

  ref_mini = document.createElement('canvas');
  ref_mini.width = 80;
  ref_mini.height = 80;
  const rmctx = ref_mini.getContext('2d');
  rmctx.drawImage(img_actual, 0, 0, 80, 80);

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

  slots.sort(() => Math.random() - 0.5);
  piezas.sort(() => Math.random() - 0.5);

  piezas.forEach((p, idx) => {
    const s = slots[idx];
    p.cx = s.x + (Math.random() * 16 - 8);
    p.cy = s.y + (Math.random() * 16 - 8);
  });

  chispas_list = [];
  anillos_list = [];
  sostenida = null;
  movimientos = 0;
  t_ini = performance.now();
  estado = 'juego';
  esperar_abrir = true;

  hudStats.style.display = 'flex';
  bottomHint.innerText = 'Cierra la mano para tomar la pieza  |  Ábrela para soltarla';
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

  p.cx = Math.max(PS / 2, Math.min(W - PS / 2, p.cx));
  p.cy = Math.max(PS / 2, Math.min(H - PS / 2, p.cy));

  const dist = Math.hypot(p.cx - p.tx, p.cy - p.ty);
  const umbralEncaje = C * AYUDAS[ayuda_i];

  if (dist < umbralEncaje) {
    p.cx = p.tx;
    p.cy = p.ty;
    p.fija = true;
    anillos_list.push({ x: p.tx, y: p.ty, r: 20, vida: 28 });
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
      bottomHint.innerText = '¡Felicidades! Rompecabezas completado';
    } else {
      soundManager.play('colocar');
    }
  }
}

// ================= RENDERIZADO =================
function renderFondoCamara() {
  // Dibujar video de la webcam en espejo (flipped horizontal) como en main.py
  if (video.readyState >= 2 && video.videoWidth > 0) {
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    if (!nitida) {
      ctx.filter = 'blur(6px) brightness(0.4)';
    } else {
      ctx.filter = 'brightness(0.6)';
    }
    ctx.drawImage(video, 0, 0, W, H);
    ctx.restore();

    // Fondo degradado superpuesto para estética sobria de main.py
    ctx.fillStyle = 'rgba(26, 20, 18, 0.65)';
    ctx.fillRect(0, 0, W, H);
  } else {
    // Si la cámara aún no envía frames, degradado sobrio
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#2e241e');
    bgGrad.addColorStop(1, '#1a1412');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
  }
}

function renderTablero() {
  ctx.save();
  // Sombra del tablero
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(X0 + 10, Y0 + 12, S, S);

  if (plantilla) {
    ctx.drawImage(plantilla, X0, Y0);
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = BORDE;
  ctx.strokeRect(X0 - 2, Y0 - 2, S + 4, S + 4);

  // Piezas fijadas
  piezas.forEach(p => {
    if (p.fija) {
      ctx.drawImage(p.canvas, Math.floor(p.cx - PP / 2), Math.floor(p.cy - PP / 2));
    }
  });

  // Piezas sueltas en la bandeja (escala reducida)
  piezas.forEach(p => {
    if (!p.fija && p !== sostenida) {
      ctx.drawImage(p.smallCanvas, Math.floor(p.cx - PS / 2), Math.floor(p.cy - PS / 2));
    }
  });

  // Pieza sostenida actualmente con la mano
  if (sostenida) {
    const p = sostenida;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 12;
    ctx.shadowOffsetY = 16;
    ctx.drawImage(p.canvas, Math.floor(p.cx - PP / 2), Math.floor(p.cy - PP / 2));
    ctx.restore();

    // Resaltar contorno de encaje cercano
    const dist = Math.hypot(p.cx - p.tx, p.cy - p.ty);
    if (dist < C * 1.2) {
      ctx.save();
      ctx.translate(p.col * C + X0 - M, p.row * C + Y0 - M);
      ctx.lineWidth = 2 + Math.abs(Math.sin(performance.now() * 0.006)) * 2;
      ctx.strokeStyle = ACENTO;
      ctx.shadowColor = ACENTO;
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

  statPieces.innerText = `${fijas} / ${total}`;
  statTime.innerText = `${minutos}:${segundos}`;
  statMoves.innerText = String(movimientos);

  ctx.save();
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 96, W, 4);
  ctx.fillStyle = ACENTO;
  const progresoW = total > 0 ? (W * fijas) / total : 0;
  ctx.fillRect(0, 96, progresoW, 4);
  ctx.restore();

  if (mostrar_ref && ref_mini) {
    ctx.save();
    ctx.drawImage(ref_mini, 20, 10, 80, 80);
    ctx.lineWidth = 2;
    ctx.strokeStyle = BORDE;
    ctx.strokeRect(20, 10, 80, 80);
    ctx.restore();
  }
}

// Dibuja el esqueleto anatómico completo de 21 puntos y el cursor cinemático
function renderMano(pts, cx, cy, cerradaActiva) {
  ctx.save();

  // 1. Esqueleto de la mano (líneas de huesos y círculos articulares)
  if (pts && pts.length >= 21) {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(235, 235, 235, 0.7)';
    CONNECTIONS.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(pts[a][0], pts[a][1]);
      ctx.lineTo(pts[b][0], pts[b][1]);
      ctx.stroke();
    });

    pts.forEach(p => {
      ctx.fillStyle = ACENTO;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 2. Cursor en el centro de la palma
  ctx.beginPath();
  if (cerradaActiva) {
    // Puño cerrado = círculo sólido brillante (agarrando o clic)
    ctx.fillStyle = ACENTO;
    ctx.shadowColor = ACENTO;
    ctx.shadowBlur = 18;
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  } else {
    // Mano abierta = anillo fino para apuntar libremente
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ================= BUCLE PRINCIPAL =================
function gameLoop() {
  const ahora = performance.now();

  // 1. Renderizar fondo con la cámara de video en vivo (espejo)
  renderFondoCamara();

  // 2. Ejecutar detección de la mano con MediaPipe
  const resMano = detector.detect(video, W, H);
  if (resMano) {
    const { pts, cx, cy, ratio } = resMano;
    currentHandPts = pts;
    ratio_actual = ratio;

    // Suavizado cinemático exponencial idéntico a main.py
    cursor.x += (cx - cursor.x) * 0.55;
    cursor.y += (cy - cursor.y) * 0.55;

    // Histéresis: umbral de cerrar (0.75) y abrir (0.95)
    cerrada = ratio < (cerrada ? UMBRAL_ABRIR : UMBRAL_CERRAR);
    vista_mano_time = ahora;
    hay_mano = true;
  } else if (ahora - vista_mano_time > 500) {
    hay_mano = false;
    currentHandPts = null;
    cerrada = false;
  }

  // Prevención de clics continuos tras cambiar de pantalla (esperar a abrir la mano)
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
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = TEXTO;
    ctx.font = '700 48px Outfit, sans-serif';
    ctx.fillText('R O M P E C A B E Z A S', W / 2, 130);

    ctx.fillStyle = ACENTO;
    ctx.fillRect(W / 2 - 140, 150, 280, 4);

    ctx.fillStyle = GRIS;
    ctx.font = '500 20px Inter, sans-serif';
    ctx.fillText('Control por gestos con la mano', W / 2, 190);
    ctx.restore();

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

    // Vista previa de la imagen seleccionada
    ctx.save();
    const previewSize = 130;
    const px = W / 2 - previewSize / 2;
    const py = 640;
    ctx.drawImage(img_actual, px, py, previewSize, previewSize * 0.55);
    ctx.lineWidth = 2;
    ctx.strokeStyle = BORDE;
    ctx.strokeRect(px, py, previewSize, previewSize * 0.55);
    ctx.restore();
  }

  // ================= PANTALLA: JUEGO =================
  else if (estado === 'juego') {
    // Si la mano está cerrada y detectada, toma o arrastra la pieza
    if (cerrada_ef && hay_mano) {
      if (!sostenida) {
        const p = piezaEn(mx, my);
        if (p) {
          sostenida = p;
          // Traer la pieza sostenida al frente
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
      // Si la mano se abre, soltar la pieza
      soltar();
    }

    renderTablero();
    renderHUD(false);

    const sobreMenu = hay_mano && dentro(BOTON_VOLVER_MENU, mx, my);
    dibujarBoton(BOTON_VOLVER_MENU, sobreMenu, 0.7);
  }

  // ================= PANTALLA: FIN =================
  else if (estado === 'fin') {
    renderTablero();
    renderHUD(true);

    if (Math.random() < 0.4) {
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
    renderMano(currentHandPts, mx, my, cerrada_ef);
  } else {
    // Exacto a línea 631 de main.py
    ctx.save();
    ctx.font = '600 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0a0807';
    ctx.fillText('Muestra tu mano frente a la cámara', W / 2 + 2, H - 23);
    ctx.fillStyle = TEXTO;
    ctx.fillText('Muestra tu mano frente a la cámara', W / 2, H - 25);
    ctx.restore();
  }

  if (debug) {
    // Exacto a línea 633 de main.py
    ctx.save();
    ctx.font = '500 20px monospace';
    ctx.fillStyle = ACENTO;
    ctx.fillText(`ratio: ${ratio_actual.toFixed(2)}  cerrada: ${cerrada}`, 200, H - 60);
    ctx.restore();
  }

  requestAnimationFrame(gameLoop);
}

// ================= INICIALIZACIÓN DE CÁMARA =================
async function initCamera() {
  try {
    loadingTitle.innerText = 'Accediendo a la Cámara';
    loadingMsg.innerText = 'Por favor, permite el acceso a tu cámara para interactuar por gestos...';

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
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
    console.error('Error de acceso a la cámara:', err);
    loadingTitle.innerText = 'Permiso de Cámara Requerido';
    loadingMsg.innerText =
      'Para jugar por gestos con la mano, autoriza el permiso de la cámara web en la barra de direcciones del navegador.';
  }
}

// ================= CONTROLES Y ATAJOS =================
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

  imageUpload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const userImg = new Image();
      userImg.onload = () => {
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

  // Atajos de teclado idénticos a líneas 639-653 de main.py
  window.addEventListener('keydown', e => {
    soundManager.init();
    const key = e.key.toLowerCase();
    if (key === 'm') irMenu();
    if (key === 'n' && estado !== 'menu') nuevoJuego(n);
    if (key === 'd') debug = !debug;
    if (key === 'c') nitida = !nitida;
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

// Iniciar
setupDOMControls();
requestAnimationFrame(gameLoop);
initCamera();
