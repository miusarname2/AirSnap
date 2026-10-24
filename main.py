import os
import math
import time
import wave
import struct
import random
import urllib.request

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

try:
    import winsound
except ImportError:
    winsound = None

# ======================= CONFIGURACION =======================
W, H = 1280, 720
S = 480                          # tamano del tablero (divisible entre 3, 4 y 5)
X0, Y0 = (W - S) // 2, 160       # esquina del tablero
UMBRAL_CERRAR = 0.75             # mas bajo = hay que cerrar mas fuerte el puno
UMBRAL_ABRIR = 0.95
AYUDAS = [0.35, 0.6, 0.9]        # radio de encaje (en fracciones de pieza)
NOMBRES_AYUDA = ["Baja", "Media", "Alta"]
K_BANDEJA = 0.62                 # escala de las piezas sueltas (al agarrarlas crecen)
CARPETA = os.path.dirname(os.path.abspath(__file__))
VENTANA = "Rompecabezas"

# Paleta sobria (BGR)
ACENTO = (0, 180, 255)
VERDE = (130, 200, 90)
TEXTO = (240, 240, 240)
GRIS = (170, 165, 160)
PANEL = (66, 58, 52)
PANEL_SOBRE = (92, 80, 70)
BORDE = (112, 102, 95)
CHISPAS = [(0, 190, 255), (120, 215, 255), (255, 255, 255), (130, 200, 90)]
CONEXIONES = [(0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 7), (7, 8),
              (5, 9), (9, 10), (10, 11), (11, 12), (9, 13), (13, 14), (14, 15),
              (15, 16), (13, 17), (17, 18), (18, 19), (19, 20), (0, 17)]

# ======================= MODELO DE MANOS =======================
MODELO = os.path.join(CARPETA, "hand_landmarker.task")
URL = ("https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
       "hand_landmarker/float16/1/hand_landmarker.task")
if not os.path.exists(MODELO):
    print("Descargando modelo de manos (solo la primera vez)...")
    urllib.request.urlretrieve(URL, MODELO)

detector = vision.HandLandmarker.create_from_options(
    vision.HandLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=MODELO),
        running_mode=vision.RunningMode.VIDEO,
        num_hands=1,
        min_hand_detection_confidence=0.6,
        min_tracking_confidence=0.6,
    )
)

# ======================= SONIDOS (se crean solos) =======================
def crear_sonidos():
    carpeta = os.path.join(CARPETA, "sonidos_rompe")
    os.makedirs(carpeta, exist_ok=True)
    notas = {
        "agarrar": [(440, 0.05)],
        "click": [(660, 0.06)],
        "colocar": [(523, 0.08), (784, 0.25)],
        "final": [(523, 0.14), (659, 0.14), (784, 0.14), (1047, 0.55)],
    }
    rutas = {}
    sr = 22050
    for nombre, lista in notas.items():
        ruta = os.path.join(carpeta, nombre + ".wav")
        rutas[nombre] = ruta
        if os.path.exists(ruta):
            continue
        datos = []
        for f, dur in lista:
            total = int(sr * dur)
            for i in range(total):
                env = min(1.0, i / (sr * 0.01)) * math.exp(-3.0 * i / total)
                v = (math.sin(2 * math.pi * f * i / sr)
                     + 0.25 * math.sin(4 * math.pi * f * i / sr)) * env * 0.4
                datos.append(int(max(-1.0, min(1.0, v)) * 32767))
        with wave.open(ruta, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes(struct.pack("<%dh" % len(datos), *datos))
    return rutas

SONIDOS = crear_sonidos()

def sonar(nombre):
    if winsound:
        try:
            winsound.PlaySound(SONIDOS[nombre], winsound.SND_FILENAME | winsound.SND_ASYNC)
        except Exception:
            pass

# ======================= DIBUJO BASICO =======================
FUENTE = cv2.FONT_HERSHEY_SIMPLEX

def degradado(w, h, c1, c2):
    t = np.linspace(0, 1, h, dtype=np.float32).reshape(h, 1, 1)
    a = np.array(c1, dtype=np.float32).reshape(1, 1, 3)
    b = np.array(c2, dtype=np.float32).reshape(1, 1, 3)
    return np.repeat(a * (1 - t) + b * t, w, axis=1).astype(np.uint8)

def texto(img, s, x, y, escala=0.8, color=TEXTO, grosor=1, centrar=True):
    (tw, _), _ = cv2.getTextSize(s, FUENTE, escala, grosor)
    if centrar:
        x -= tw // 2
    cv2.putText(img, s, (int(x) + 2, int(y) + 2), FUENTE, escala, (15, 12, 10), grosor + 1, cv2.LINE_AA)
    cv2.putText(img, s, (int(x), int(y)), FUENTE, escala, color, grosor, cv2.LINE_AA)

def rect_redondo(img, x1, y1, x2, y2, color, r=14):
    cv2.rectangle(img, (x1 + r, y1), (x2 - r, y2), color, -1)
    cv2.rectangle(img, (x1, y1 + r), (x2, y2 - r), color, -1)
    for cx, cy in ((x1 + r, y1 + r), (x2 - r, y1 + r), (x1 + r, y2 - r), (x2 - r, y2 - r)):
        cv2.circle(img, (cx, cy), r, color, -1)

def dibujar_boton(img, b, sobre, escala=0.9):
    x1, y1, x2, y2 = b["rect"]
    rect_redondo(img, x1, y1, x2, y2, ACENTO if sobre else BORDE, 14)
    rect_redondo(img, x1 + 2, y1 + 2, x2 - 2, y2 - 2, PANEL_SOBRE if sobre else PANEL, 12)
    texto(img, b["texto"], (x1 + x2) // 2, (y1 + y2) // 2 + int(11 * escala),
          escala, TEXTO, 2 if sobre else 1)

def dentro(b, x, y):
    x1, y1, x2, y2 = b["rect"]
    return x1 <= x <= x2 and y1 <= y <= y2

def sombra(dst, x, y, w, h):
    x1, y1 = max(int(x), 0), max(int(y), 0)
    x2, y2 = min(int(x + w), dst.shape[1]), min(int(y + h), dst.shape[0])
    if x1 < x2 and y1 < y2:
        dst[y1:y2, x1:x2] = (dst[y1:y2, x1:x2] * 0.5).astype(np.uint8)

def pegar_masc(dst, spr, a, x, y, opac=1.0):
    h, w = spr.shape[:2]
    x1, y1 = max(x, 0), max(y, 0)
    x2, y2 = min(x + w, dst.shape[1]), min(y + h, dst.shape[0])
    if x1 >= x2 or y1 >= y2:
        return
    s = spr[y1 - y:y2 - y, x1 - x:x2 - x].astype(np.float32)
    al = a[y1 - y:y2 - y, x1 - x:x2 - x] * opac
    roi = dst[y1:y2, x1:x2]
    roi[:] = (s * al + roi.astype(np.float32) * (1.0 - al)).astype(np.uint8)

# ======================= IMAGENES =======================
def escena_montanas():
    im = degradado(600, 600, (90, 40, 60), (110, 150, 255))
    rng = random.Random(1)
    for _ in range(40):
        cv2.circle(im, (rng.randint(0, 599), rng.randint(0, 230)), rng.randint(1, 2), (255, 255, 255), -1)
    brillo = im.copy()
    cv2.circle(brillo, (300, 340), 160, (140, 200, 255), -1)
    im = cv2.addWeighted(im, 0.7, brillo, 0.3, 0)
    cv2.circle(im, (300, 340), 85, (150, 225, 255), -1)
    capas = [
        ([(0, 410), (80, 340), (160, 390), (260, 310), (360, 395), (450, 325), (600, 410)], (130, 80, 120)),
        ([(0, 480), (120, 390), (230, 470), (340, 410), (470, 490), (600, 430)], (100, 55, 90)),
        ([(0, 550), (150, 480), (300, 550), (450, 490), (600, 560)], (70, 38, 62)),
    ]
    for pts, col in capas:
        cv2.fillPoly(im, [np.array(pts + [(600, 600), (0, 600)], dtype=np.int32)], col)
    return im

def escena_ciudad():
    im = degradado(600, 600, (70, 35, 20), (150, 90, 60))
    rng = random.Random(3)
    for _ in range(60):
        cv2.circle(im, (rng.randint(0, 599), rng.randint(0, 300)), rng.randint(1, 2), (255, 255, 255), -1)
    cv2.circle(im, (470, 110), 45, (225, 235, 240), -1)
    for x, y, r in [(455, 100, 9), (485, 125, 7), (480, 92, 5)]:
        cv2.circle(im, (x, y), r, (200, 212, 220), -1)
    x = 0
    while x < 600:
        w, h = rng.randint(50, 90), rng.randint(130, 340)
        t = rng.randint(0, 25)
        cv2.rectangle(im, (x, 600 - h), (x + w, 600), (40 + t, 28 + t, 25 + t), -1)
        for wy in range(600 - h + 14, 590, 24):
            for wx in range(x + 9, x + w - 12, 20):
                if rng.random() < 0.45:
                    cv2.rectangle(im, (wx, wy), (wx + 9, wy + 13), (130, 215, 255), -1)
        x += w + 4
    return im

def escena_geometrica():
    im = degradado(600, 600, (48, 40, 34), (30, 24, 22))
    rng = random.Random(5)
    paleta = [(160, 175, 40), (40, 170, 240), (95, 105, 230), (215, 228, 238), (150, 110, 60)]
    for i in range(14):
        capa = im.copy()
        col = paleta[i % len(paleta)]
        x, y, t = rng.randint(0, 600), rng.randint(0, 600), rng.randint(60, 170)
        k = rng.choice((0, 1, 2))
        if k == 0:
            cv2.circle(capa, (x, y), t, col, -1)
        elif k == 1:
            cv2.rectangle(capa, (x - t, y - t), (x + t, y + t), col, -1)
        else:
            cv2.fillPoly(capa, [np.array([[x, y - t], [x - t, y + t], [x + t, y + t]])], col)
        im = cv2.addWeighted(im, 0.25, capa, 0.75, 0)
    return im

def cargar_imagenes():
    imgs = []
    carpeta = os.path.join(CARPETA, "imagenes")   # tus propias fotos (opcional)
    if os.path.isdir(carpeta):
        for nombre in sorted(os.listdir(carpeta)):
            if nombre.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".webp")):
                im = cv2.imdecode(np.fromfile(os.path.join(carpeta, nombre), np.uint8), cv2.IMREAD_COLOR)
                if im is not None:
                    h, w = im.shape[:2]
                    l = min(h, w)
                    im = im[(h - l) // 2:(h - l) // 2 + l, (w - l) // 2:(w - l) // 2 + l]
                    imgs.append(cv2.resize(im, (S, S), interpolation=cv2.INTER_AREA))
    for f in (escena_montanas, escena_ciudad, escena_geometrica):
        imgs.append(cv2.resize(f(), (S, S), interpolation=cv2.INTER_AREA))
    return imgs

IMAGENES = cargar_imagenes()
FONDO = degradado(W, H, (46, 36, 30), (26, 20, 18))

# ======================= FORMA DE LAS PIEZAS =======================
def _perfil():
    """Lengueta de rompecabezas en unidades de lado: lista de (u, w), u de 0 a 1."""
    izq = [(0.0, 0.0), (0.34, 0.0)]
    a, b, c = (0.34, 0.0), (0.455, 0.0), (0.455, 0.06)
    for t in np.linspace(0, 1, 7)[1:]:
        izq.append(((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0],
                    (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1]))
    cw, R = 0.17, 0.10
    wn = cw - math.sqrt(R * R - 0.045 * 0.045)
    pts = list(izq) + [(0.455, wn)]
    a0 = math.atan2(wn - cw, 0.455 - 0.5) + 2 * math.pi
    a1 = math.atan2(wn - cw, 0.545 - 0.5)
    for ang in np.linspace(a0, a1, 26)[1:-1]:
        pts.append((0.5 + R * math.cos(ang), cw + R * math.sin(ang)))
    pts.append((0.545, wn))
    pts += [(1 - u, w) for u, w in reversed(izq)]
    return pts

PERFIL = _perfil()

def borde(p0, p1, signo, c):
    """Puntos de un borde de la pieza. signo: 1 = lengueta, -1 = hueco, 0 = recto."""
    if signo == 0:
        return [p0]
    dx, dy = (p1[0] - p0[0]) / c, (p1[1] - p0[1]) / c
    nx, ny = dy, -dx
    return [(p0[0] + dx * u * c + nx * w * signo * c, p0[1] + dy * u * c + ny * w * signo * c)
            for u, w in PERFIL[:-1]]

def crear_piezas(img, nn):
    c = S // nn
    m = int(math.ceil(0.27 * c)) + 4
    P = c + 2 * m
    Ps = int(P * K_BANDEJA)
    SS = 3
    hs = [[0] * nn for _ in range(nn + 1)]
    vs = [[0] * (nn + 1) for _ in range(nn)]
    for r in range(1, nn):
        for q in range(nn):
            hs[r][q] = random.choice((-1, 1))
    for r in range(nn):
        for q in range(1, nn):
            vs[r][q] = random.choice((-1, 1))
    relleno = cv2.copyMakeBorder(img, m, m, m, m, cv2.BORDER_REFLECT)
    plantilla = np.full((S, S, 3), (50, 44, 40), np.uint8)
    lista = []
    for r in range(nn):
        for q in range(nn):
            a, b = m, m + c
            pts = (borde((a, a), (b, a), -hs[r][q], c) + borde((b, a), (b, b), vs[r][q + 1], c)
                   + borde((b, b), (a, b), hs[r + 1][q], c) + borde((a, b), (a, a), -vs[r][q], c))
            big = np.zeros((P * SS, P * SS), np.uint8)
            cv2.fillPoly(big, [np.round(np.array(pts) * SS).astype(np.int32)], 255)
            big = cv2.GaussianBlur(big, (0, 0), SS * 1.1)
            big = (big > 127).astype(np.uint8) * 255
            mask = cv2.resize(big, (P, P), interpolation=cv2.INTER_AREA)
            binaria = (mask > 127).astype(np.uint8) * 255
            cont, _ = cv2.findContours(binaria, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            spr = relleno[r * c:r * c + P, q * c:q * c + P].copy()
            cv2.drawContours(spr, cont, -1, (235, 235, 235), 3, cv2.LINE_AA)
            spr_s = cv2.resize(spr, (Ps, Ps), interpolation=cv2.INTER_AREA)
            mask_s = cv2.resize(mask, (Ps, Ps), interpolation=cv2.INTER_AREA)
            hit = cv2.dilate((mask_s > 100).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
            off = (q * c - m, r * c - m)
            cv2.drawContours(plantilla, cont, -1, (66, 60, 56), -1, cv2.LINE_AA, offset=off)
            cv2.drawContours(plantilla, cont, -1, (120, 112, 105), 2, cv2.LINE_AA, offset=off)
            lista.append({
                "img": spr, "a": (mask.astype(np.float32) / 255.0)[:, :, None],
                "img_s": spr_s, "a_s": (mask_s.astype(np.float32) / 255.0)[:, :, None],
                "hit": hit, "cont": cont, "cx": 0.0, "cy": 0.0,
                "tx": X0 + q * c + c // 2, "ty": Y0 + r * c + c // 2, "fija": False,
            })
    return lista, plantilla, c, m, P, Ps

# ======================= EFECTOS =======================
chispas = []
anillos = []

def explosion(x, y, cant=14, vmax=7):
    for _ in range(cant):
        a = random.uniform(0, 2 * math.pi)
        v = random.uniform(1.5, vmax)
        chispas.append([x, y, math.cos(a) * v, math.sin(a) * v,
                        random.choice(CHISPAS), random.randint(2, 4), random.randint(22, 45)])

def dibujar_efectos(img):
    vivas = []
    for p in chispas:
        p[0] += p[2]; p[1] += p[3]; p[3] += 0.12; p[2] *= 0.97; p[6] -= 1
        if p[6] > 0:
            vivas.append(p)
            cv2.circle(img, (int(p[0]), int(p[1])), p[5], p[4], -1, cv2.LINE_AA)
    chispas[:] = vivas
    vivos = []
    for a in anillos:
        a[2] += 3.5; a[3] -= 1
        if a[3] > 0:
            vivos.append(a)
            f = a[3] / 28.0
            cv2.circle(img, (int(a[0]), int(a[1])), int(a[2]),
                       tuple(int(v * f) for v in ACENTO), 3, cv2.LINE_AA)
    anillos[:] = vivos

# ======================= MANO =======================
def leer_mano(res):
    if not res.hand_landmarks:
        return None
    pts = [((p.x - 0.1) / 0.8 * W, (p.y - 0.1) / 0.8 * H) for p in res.hand_landmarks[0]]
    cx = sum(pts[i][0] for i in (0, 5, 9, 13, 17)) / 5
    cy = sum(pts[i][1] for i in (0, 5, 9, 13, 17)) / 5
    tam = max(math.hypot(pts[0][0] - pts[9][0], pts[0][1] - pts[9][1]), 1)
    d = sum(math.hypot(pts[t][0] - cx, pts[t][1] - cy) for t in (8, 12, 16, 20)) / 4
    return pts, min(max(cx, 0), W - 1), min(max(cy, 0), H - 1), d / tam

def dibujar_mano(img, pts, cx, cy, cerrada):
    if pts:
        for a, b in CONEXIONES:
            cv2.line(img, (int(pts[a][0]), int(pts[a][1])), (int(pts[b][0]), int(pts[b][1])),
                     (225, 225, 225), 2, cv2.LINE_AA)
        for p in pts:
            cv2.circle(img, (int(p[0]), int(p[1])), 3, ACENTO, -1, cv2.LINE_AA)
    c = (int(cx), int(cy))
    if cerrada:
        cv2.circle(img, c, 24, ACENTO, -1, cv2.LINE_AA)
        cv2.circle(img, c, 24, (255, 255, 255), 2, cv2.LINE_AA)
    else:
        cv2.circle(img, c, 24, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.circle(img, c, 4, (255, 255, 255), -1, cv2.LINE_AA)

# ======================= BOTONES =======================
BOTONES_MENU = [
    {"rect": (380, 220, 900, 290), "texto": "Principiante  |  3 x 3  |  9 piezas", "tipo": "nivel", "n": 3},
    {"rect": (380, 305, 900, 375), "texto": "Intermedio  |  4 x 4  |  16 piezas", "tipo": "nivel", "n": 4},
    {"rect": (380, 390, 900, 460), "texto": "Avanzado  |  5 x 5  |  25 piezas", "tipo": "nivel", "n": 5},
    {"rect": (380, 490, 900, 550), "texto": "", "tipo": "ayuda", "n": 0},
    {"rect": (510, 580, 770, 640), "texto": "Salir", "tipo": "salir", "n": 0},
]
BOTON_MENU = {"rect": (1110, 28, 1250, 72), "texto": "Menu"}
BOTONES_FIN = [
    {"rect": (40, 300, 360, 370), "texto": "Jugar de nuevo", "accion": "otro"},
    {"rect": (920, 300, 1240, 370), "texto": "Menu", "accion": "menu"},
]

# ======================= ESTADO DEL JUEGO =======================
estado = "menu"
n = 3
piezas = []
plantilla = None
sostenida = None
img_actual = IMAGENES[0]
ref_mini = cv2.resize(img_actual, (80, 80), interpolation=cv2.INTER_AREA)
indice_img = 0
esperar_abrir = True
t_ini = t_fin = 0.0
movimientos = 0
ayuda_i = 1
mostrar_ref = True
C = M = PP = PS = 0

def ir_menu():
    global estado, sostenida, esperar_abrir
    estado, sostenida, esperar_abrir = "menu", None, True

def nuevo_juego(nn):
    global estado, n, piezas, plantilla, sostenida, img_actual, indice_img, esperar_abrir
    global t_ini, movimientos, C, M, PP, PS, ref_mini
    n = nn
    img_actual = IMAGENES[indice_img % len(IMAGENES)]
    indice_img += 1
    ref_mini = cv2.resize(img_actual, (80, 80), interpolation=cv2.INTER_AREA)
    piezas, plantilla, C, M, PP, PS = crear_piezas(img_actual, nn)
    total = len(piezas)
    slots = []
    for (zx1, zx2), k in zip(((15, X0 - 15), (X0 + S + 15, W - 15)), ((total + 1) // 2, total // 2)):
        filas = math.ceil(k / 2)
        for i in range(k):
            col, fila = i % 2, i // 2
            slots.append((zx1 + (zx2 - zx1) * (col + 0.5) / 2, 115 + (H - 125) * (fila + 0.5) / filas))
    random.shuffle(slots)
    random.shuffle(piezas)
    for p, (sx, sy) in zip(piezas, slots):
        p["cx"], p["cy"] = sx + random.randint(-8, 8), sy + random.randint(-8, 8)
    chispas.clear()
    anillos.clear()
    sostenida = None
    movimientos = 0
    t_ini = time.time()
    estado = "juego"
    esperar_abrir = True

def pieza_en(mx, my):
    for p in reversed(piezas):
        if p["fija"]:
            continue
        lx = int(mx - (p["cx"] - PS / 2))
        ly = int(my - (p["cy"] - PS / 2))
        if 0 <= lx < PS and 0 <= ly < PS and p["hit"][ly, lx]:
            return p
    return None

def soltar():
    global sostenida, estado, t_fin, esperar_abrir, movimientos
    p, sostenida = sostenida, None
    movimientos += 1
    p["cx"] = min(max(p["cx"], PS / 2), W - PS / 2)
    p["cy"] = min(max(p["cy"], PS / 2), H - PS / 2)
    if math.hypot(p["cx"] - p["tx"], p["cy"] - p["ty"]) < C * AYUDAS[ayuda_i]:
        p["cx"], p["cy"], p["fija"] = p["tx"], p["ty"], True
        anillos.append([p["tx"], p["ty"], 20, 28])
        explosion(p["tx"], p["ty"], 14, 7)
        if all(q["fija"] for q in piezas):
            estado, t_fin, esperar_abrir = "fin", time.time(), True
            sonar("final")
            for _ in range(5):
                explosion(random.uniform(X0, X0 + S), random.uniform(Y0, Y0 + S), 25, 11)
        else:
            sonar("colocar")

def dibujar_pieza(img, p, grande, con_sombra=False):
    if grande:
        spr, a, s = p["img"], p["a"], PP
    else:
        spr, a, s = p["img_s"], p["a_s"], PS
    x, y = int(p["cx"] - s / 2), int(p["cy"] - s / 2)
    if con_sombra:
        pegar_masc(img, np.zeros_like(spr), a, x + 10, y + 12, 0.45)
    pegar_masc(img, spr, a, x, y)

def dibujar_tablero(img):
    sombra(img, X0 + 10, Y0 + 12, S, S)
    img[Y0:Y0 + S, X0:X0 + S] = plantilla
    cv2.rectangle(img, (X0 - 2, Y0 - 2), (X0 + S + 2, Y0 + S + 2), BORDE, 2)
    for p in piezas:
        if p["fija"]:
            dibujar_pieza(img, p, True)
    for p in piezas:
        if not p["fija"] and p is not sostenida:
            dibujar_pieza(img, p, False)
    if sostenida is not None:
        p = sostenida
        dibujar_pieza(img, p, True, True)
        if math.hypot(p["cx"] - p["tx"], p["cy"] - p["ty"]) < C * 1.2:
            grosor = 2 + int(2 * abs(math.sin(time.time() * 6)))
            cv2.drawContours(img, p["cont"], -1, ACENTO, grosor, cv2.LINE_AA,
                             offset=(p["tx"] - PP // 2, p["ty"] - PP // 2))

def dibujar_hud(img, completado):
    img[0:100] = (img[0:100] * 0.35).astype(np.uint8)
    if mostrar_ref:
        img[10:90, 20:100] = ref_mini
        cv2.rectangle(img, (20, 10), (100, 90), BORDE, 2)
    fijas = sum(1 for p in piezas if p["fija"])
    t = (t_fin if completado else time.time()) - t_ini
    datos = [("PIEZAS", "%d / %d" % (fijas, len(piezas)), 130),
             ("TIEMPO", "%02d:%02d" % divmod(int(t), 60), 330),
             ("MOVIMIENTOS", str(movimientos), 500)]
    for etiqueta, valor, x in datos:
        texto(img, etiqueta, x, 38, 0.5, GRIS, 1, centrar=False)
        texto(img, valor, x, 78, 1.1, TEXTO, 2, centrar=False)
    if completado:
        texto(img, "COMPLETADO", 820, 68, 1.3, VERDE, 3)
    cv2.rectangle(img, (0, 96), (W, 100), PANEL, -1)
    cv2.rectangle(img, (0, 96), (int(W * fijas / max(1, len(piezas))), 100), ACENTO, -1)

# ======================= PROGRAMA PRINCIPAL =======================
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
if not cap.isOpened():
    raise SystemExit("No pude abrir la camara. Cierra otras apps que la usen.")
cv2.namedWindow(VENTANA, cv2.WINDOW_NORMAL)
cv2.resizeWindow(VENTANA, W, H)

T0 = time.time()
ultimo_ts = 0
cursor = [W / 2, H / 2]
cerrada = False
cerrada_prev = False
vista = 0
ratio = 0.0
debug = False
nitida = False
pantalla_completa = False
terminar = False

while True:
    ok, frame = cap.read()
    if not ok:
        break
    frame = cv2.resize(cv2.flip(frame, 1), (W, H))
    if nitida:
        base = frame
    else:
        base = cv2.resize(cv2.GaussianBlur(cv2.resize(frame, (W // 4, H // 4)), (0, 0), 2), (W, H))
    fondo = cv2.addWeighted(base, 0.4, FONDO, 0.6, 0)

    # --- detectar mano ---
    ts = int((time.time() - T0) * 1000)
    if ts <= ultimo_ts:
        ts = ultimo_ts + 1
    ultimo_ts = ts
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    res = detector.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), ts)

    ahora = time.time()
    mano = leer_mano(res)
    pts = None
    if mano:
        pts, cx, cy, ratio = mano
        cursor[0] += (cx - cursor[0]) * 0.55
        cursor[1] += (cy - cursor[1]) * 0.55
        cerrada = ratio < (UMBRAL_ABRIR if cerrada else UMBRAL_CERRAR)
        vista = ahora
    elif ahora - vista > 0.5:
        cerrada = False
    hay_mano = ahora - vista < 0.5

    # al cambiar de pantalla hay que abrir la mano antes de volver a "hacer clic"
    if esperar_abrir:
        if not cerrada:
            esperar_abrir = False
        cerrada_ef = False
    else:
        cerrada_ef = cerrada
    click = cerrada_ef and not cerrada_prev
    cerrada_prev = cerrada_ef
    mx, my = cursor

    # ================= MENU =================
    if estado == "menu":
        img = fondo.copy()
        texto(img, "R O M P E C A B E Z A S", W // 2, 125, 1.9, TEXTO, 3)
        cv2.line(img, (W // 2 - 140, 148), (W // 2 + 140, 148), ACENTO, 3, cv2.LINE_AA)
        texto(img, "Control por gestos con la mano", W // 2, 185, 0.8, GRIS, 1)
        for b in BOTONES_MENU:
            if b["tipo"] == "ayuda":
                b["texto"] = "Ayuda de encaje: " + NOMBRES_AYUDA[ayuda_i]
            sobre = hay_mano and dentro(b, mx, my)
            dibujar_boton(img, b, sobre)
            if sobre and click:
                sonar("click")
                if b["tipo"] == "salir":
                    terminar = True
                elif b["tipo"] == "ayuda":
                    ayuda_i = (ayuda_i + 1) % len(AYUDAS)
                else:
                    nuevo_juego(b["n"])
        texto(img, "Cierra la mano sobre una opcion para seleccionarla", W // 2, 690, 0.6, GRIS, 1)

    # ================= JUEGO =================
    elif estado == "juego":
        if cerrada_ef and hay_mano:
            if sostenida is None:
                p = pieza_en(mx, my)
                if p is not None:
                    sostenida = p
                    piezas[:] = [q for q in piezas if q is not p] + [p]
                    sonar("agarrar")
                elif click and dentro(BOTON_MENU, mx, my):
                    sonar("click")
                    ir_menu()
            if sostenida is not None:
                sostenida["cx"], sostenida["cy"] = mx, my
        elif sostenida is not None:
            soltar()

        img = fondo.copy()
        dibujar_tablero(img)
        dibujar_hud(img, False)
        dibujar_boton(img, BOTON_MENU, hay_mano and dentro(BOTON_MENU, mx, my), 0.7)
        if hay_mano:
            texto(img, "Cierra la mano para tomar la pieza  |  Abrela para soltarla",
                  W // 2, H - 15, 0.55, GRIS, 1)

    # ================= FIN =================
    else:
        img = fondo.copy()
        dibujar_tablero(img)
        k = min(1.0, max(0.0, (ahora - t_fin - 0.8) / 1.2))
        if k > 0:
            zona = img[Y0:Y0 + S, X0:X0 + S]
            img[Y0:Y0 + S, X0:X0 + S] = cv2.addWeighted(zona, 1 - k, img_actual, k, 0)
        if ahora - t_fin < 2.5 and random.random() < 0.5:
            explosion(random.uniform(X0, X0 + S), random.uniform(Y0, Y0 + S), 10, 9)
        dibujar_hud(img, True)
        for b in BOTONES_FIN:
            sobre = hay_mano and dentro(b, mx, my)
            dibujar_boton(img, b, sobre)
            if sobre and click:
                sonar("click")
                if b["accion"] == "otro":
                    nuevo_juego(n)
                else:
                    ir_menu()

    # ================= COMUN =================
    dibujar_efectos(img)
    if hay_mano:
        dibujar_mano(img, pts, mx, my, cerrada_ef)
    else:
        texto(img, "Muestra tu mano frente a la camara", W // 2, H - 25, 0.8, TEXTO, 1)
    if debug:
        texto(img, "ratio: %.2f  cerrada: %s" % (ratio, cerrada), 200, H - 60, 0.7, ACENTO, 1)

    cv2.imshow(VENTANA, img)
    tecla = cv2.waitKey(1) & 0xFF
    if tecla in (ord("q"), 27) or terminar:
        break
    if tecla == ord("m"):
        ir_menu()
    if tecla == ord("n") and estado != "menu":
        nuevo_juego(n)
    if tecla == ord("d"):
        debug = not debug
    if tecla == ord("c"):
        nitida = not nitida
    if tecla == ord("v"):
        mostrar_ref = not mostrar_ref
    if tecla == ord("f"):
        pantalla_completa = not pantalla_completa
        cv2.setWindowProperty(VENTANA, cv2.WND_PROP_FULLSCREEN,
                              cv2.WINDOW_FULLSCREEN if pantalla_completa else cv2.WINDOW_NORMAL)

cap.release()
cv2.destroyAllWindows()