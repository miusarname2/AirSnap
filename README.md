# AirSnap 🧩🖐️

> Interactive Jigsaw Puzzle in the air, powered by Computer Vision & MediaPipe.

[![GitHub Repo](https://img.shields.io/badge/GitHub-miusarname2%2FAirSnap-blue?logo=github)](https://github.com/miusarname2/AirSnap)
[![Deploy with Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)](https://vitejs.dev/)

---

## 📌 Autoría y Créditos

- **Prototipo Original de Escritorio en Python ([`main.py`](file:///c:/Users/Perso/Desktop/AI%20project/main.py)):** Desarrollado originalmente por **Alexander Santamaria Bayona & Juan David Jaimes Figueroa**.
- **Versión Web, Arquitectura Frontend y Adaptación para Vercel:** **100% de mi autoría** ([oscarmauricio631](https://github.com/miusarname2)). Diseño del sistema en Canvas HTML5, Web Audio API, integración con MediaPipe WebAssembly y despliegue continuo en Vercel.

---

## 🎮 ¿Cómo se juega?

No necesitas ratón ni teclado. El juego rastrea tu mano en tiempo real a través de tu cámara web:

- **Mover cursor:** Mueve tu mano en el aire frente a la cámara.
- **Tomar pieza / Clic:** Cierra la mano formando un puño.
- **Soltar pieza:** Abre la mano.
- **Encaje magnético:** Acerca la pieza a su posición correcta en el tablero para que encaje automáticamente con efectos de sonido y partículas.

---

## ✨ Características

- **Rastreo 3D de mano a 60 FPS:** Basado en MediaPipe Tasks Vision con aceleración por hardware.
- **Generación paramétrica de piezas:** Lengüetas y ranuras generadas proceduralmente con curvas Bézier cúbicas idénticas a un rompecabezas físico.
- **Escenas artísticas integradas:** Montañas al atardecer, ciudad nocturna y arte geométrico abstracto.
- **Sube tus propias imágenes:** Puedes cargar cualquier fotografía desde tu dispositivo para convertirla en rompecabezas al instante.
- **Audio procedural:** Efectos sonoros sintetizados matemáticamente con Web Audio API (sin archivos `.wav` pesados externos).
- **Dificultad ajustable:** 3x3 (9 piezas), 4x4 (16 piezas) y 5x5 (25 piezas), con tolerancia de encaje configurable (Baja, Media, Alta).

---

## ⌨️ Atajos de Teclado

| Tecla | Acción |
| :---: | :--- |
| `M` | Volver al Menú |
| `N` | Nuevo juego |
| `V` | Alternar miniatura de referencia |
| `D` | Modo depuración (ratios de apertura/cierre) |
| `C` | Alternar nitidez del fondo |
| `F` | Pantalla completa |

---

## 🚀 Instalación y Ejecución Local

```bash
# Clonar repositorio
git clone https://github.com/miusarname2/AirSnap.git
cd AirSnap

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre `http://localhost:5173` en tu navegador y autoriza el acceso a la cámara.

---

## 📦 Despliegue en Vercel

El proyecto incluye configuración nativa en `vercel.json` y binarios WASM empaquetados en `public/wasm`:

1. Conecta tu repositorio `https://github.com/miusarname2/AirSnap` en el panel de [Vercel](https://vercel.com).
2. Framework preset: **Vite**.
3. Haz clic en **Deploy**.
