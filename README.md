# Rompecabezas Interactivo con Visión Artificial y Control por Gestos

> **Aviso de Autoría y Créditos**  
> 
> - **Software Original de Escritorio en Python ([`main.py`](file:///c:/Users/Perso/Desktop/AI%20project/main.py)):** Desarrollado originalmente por **Alexander Santamaria Bayona - Juan David Jaimes Figueroa**.  
> - **Versión Web, Arquitectura Frontend y Adaptación para Vercel:** Es **100% de mi autoría** (diseño del sistema web, ingeniería de software en JavaScript, migración a Canvas HTML5, Web Audio API y MediaPipe WebAssembly).

---

## 📋 Descripción General

Este proyecto es un videojuego interactivo de **rompecabezas (jigsaw puzzle)** en tiempo real implementado en Python. Utiliza la cámara web del usuario y modelos de visión artificial para rastrear la mano e interpretar gestos manuales, permitiendo controlar la interfaz y manipular las piezas sin necesidad de tocar el teclado ni el ratón.

---

## 🛠️ Tecnologías y Librerías

- **Python 3**
- **OpenCV (`cv2`)**:
  - Captura y preprocesamiento de video en vivo (desenfoque gaussiano, espejo, redimensionado).
  - Renderizado procedural de interfaz gráfica (botones redondeados, degradados, textos, partículas, sombras).
  - Generación geométrica procedural de las piezas del rompecabezas (lengüetas con curvas Bézier, máscaras alfa y detección de bordes).
- **MediaPipe Tasks Vision (`HandLandmarker`)**:
  - Detección y seguimiento de los 21 puntos anatómicos (landmarks) de la mano en 3D.
  - Clasificación de gestos en tiempo real (mano abierta vs. puño cerrado).
- **NumPy**: Operaciones matriciales de imágenes y máscaras de bits.
- **Wave & Struct**: Generación sintética procedural de ondas de sonido en memoria (`.wav`).
- **Winsound**: Reproducción asíncrona de efectos sonoros (específico de Windows).

---

## 🧩 Características del Juego

1. **Control 100% por Gestos:**
   - **Mover el cursor:** Mover la mano libremente frente a la cámara. El cursor sigue el centro de la palma.
   - **Tomar pieza / Clic:** Cerrar la mano formando un puño.
   - **Soltar pieza:** Abrir la mano.
2. **Niveles de Dificultad:**
   - **Principiante:** Cuadrícula de 3 x 3 (9 piezas).
   - **Intermedio:** Cuadrícula de 4 x 4 (16 piezas).
   - **Avanzado:** Cuadrícula de 5 x 5 (25 piezas).
3. **Ayuda de Encaje Configurable:**
   - Radio de atracción magnética para acoplar la pieza en su lugar (Baja, Media, Alta).
4. **Generador de Piezas Realistas:**
   - Lengüetas y huecos macho/hembra generados aleatoriamente mediante curvas Bézier cúbicas y arcos circulares.
   - Efecto de bandeja: las piezas sueltas a los lados se muestran a escala reducida y aumentan a tamaño real al tomarlas.
5. **Generador Procedural de Imágenes:**
   - Incluye 3 paisajes vectoriales/geométricos generados matemáticamente (Montañas al atardecer, Ciudad nocturna y Arte abstracto geométrico).
   - Soporte para cargar imágenes personalizadas colocadas en una carpeta `/imagenes/`.
6. **HUD y Efectos Visuales:**
   - Contador de piezas colocadas vs. total, cronómetro de tiempo transcurrido y contador de movimientos.
   - Miniatura de referencia visual en la esquina superior.
   - Partículas de chispas y anillos expansivos al encajar piezas o completar el juego.
7. **Sonidos Sintéticos Integrados:**
   - Tonos de audio sintetizados matemáticamente (sin requerir descargar archivos de audio externos): agarrar, clic, colocar y fanfarria final.

---

## ⌨️ Controles de Teclado (Atajos Opcionales)

| Tecla | Acción |
| :--- | :--- |
| `Q` / `ESC` | Salir del juego |
| `M` | Volver al Menú Principal |
| `N` | Iniciar un nuevo juego |
| `D` | Alternar visualización del modo de depuración (ratios de mano) |
| `C` | Alternar nitidez del fondo (cámara desenfocada estética vs. cámara nítida) |
| `V` | Mostrar / ocultar la miniatura de referencia |
| `F` | Alternar pantalla completa |

---

## 🏗️ Estructura del Código ([`main.py`](file:///c:/Users/Perso/Desktop/AI%20project/main.py))

- **Líneas 1-44:** Importación de dependencias, constantes de configuración, dimensiones ($1280 \times 720$), colores en formato BGR y conexiones óseas de la mano.
- **Líneas 45-62:** Descarga automática del modelo `hand_landmarker.task` de MediaPipe y configuración del detector en modo video.
- **Líneas 63-103:** Síntesis y persistencia de efectos sonoros `.wav` y función de reproducción `sonar()`.
- **Líneas 104-153:** Primitivas gráficas personalizadas en OpenCV (degradados, textos con sombra, botones redondeados, máscaras con canal alfa).
- **Líneas 154-229:** Generadores procedimentales de imágenes y lector de fotos locales.
- **Líneas 230-304:** Algoritmo de perfil de rompecabezas (curvas paramétricas para machos/hembras y recorte de máscaras con `copyMakeBorder` y `findContours`).
- **Líneas 305-333:** Motor de partículas (física simple de gravedad y dispersión para chispas y anillos).
- **Líneas 334-359:** Cálculo cinemático de la mano (posición del cursor y cálculo del ratio de apertura/cierre de dedos).
- **Líneas 360-448:** Máquina de estados (`menu`, `juego`, `fin`), lógica de agarre, soltado y encaje magnético.
- **Líneas 449-494:** Renderizado del tablero, piezas en bandeja/mesa y barra de progreso (HUD).
- **Líneas 495-655:** Bucle principal de ejecución (`while True`), lectura de webcam a 720p, inferencia con MediaPipe y despacho de eventos.

---

---

## 🌐 Versión Web (Optimizada para Vercel)

> ⭐️ **Nota de Autoría:** La versión web completa (arquitectura de software, código en JavaScript, componentes interactivos, diseño visual y adaptación para Vercel) es **100% de mi autoría**, desarrollada inspirándose y respetando la lógica del software de escritorio original en Python.

### Estructura de la versión web:
- [`index.html`](file:///c:/Users/Perso/Desktop/AI%20project/index.html): Estructura semántica, accesibilidad y HUD de juego.
- [`style.css`](file:///c:/Users/Perso/Desktop/AI%20project/style.css): Estilos visuales con Glassmorphism, animaciones y diseño responsivo.
- [`src/main.js`](file:///c:/Users/Perso/Desktop/AI%20project/src/main.js): Bucle de juego a 60 FPS, interpolación cinemática y máquina de estados.
- [`src/detector.js`](file:///c:/Users/Perso/Desktop/AI%20project/src/detector.js): Integración con MediaPipe Tasks Vision (`HandLandmarker`) para seguimiento de 21 landmarks y detección de puño cerrado.
- [`src/puzzle.js`](file:///c:/Users/Perso/Desktop/AI%20project/src/puzzle.js): Generación de piezas con lengüetas y huecos usando curvas paramétricas, plantillas y encaje magnético.
- [`src/scenes.js`](file:///c:/Users/Perso/Desktop/AI%20project/src/scenes.js): Escenas artísticas procedurales originales (Montañas, Ciudad nocturna, Geometría) + selector para subir fotos propias.
- [`src/audio.js`](file:///c:/Users/Perso/Desktop/AI%20project/src/audio.js): Síntesis de ondas de sonido con Web Audio API (agarrar, clic, colocar, fanfarria).
- [`vercel.json`](file:///c:/Users/Perso/Desktop/AI%20project/vercel.json): Configuración lista para Vercel con Vite.

### 💻 Probar localmente
Para ejecutar la versión web en tu máquina:
```bash
npm run dev
```
Luego abre en tu navegador el enlace mostrado (ej. `http://localhost:5173`).

---

## 🚀 Despliegue en Vercel (Paso a Paso)

### Opción 1: Desde la web de Vercel (Recomendada)
1. Sube tu proyecto a un repositorio de GitHub:
   ```bash
   git add .
   git commit -m "feat: versión web interactiva para Vercel"
   git push origin master
   ```
2. Entra a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
3. Haz clic en **"Add New..."** > **"Project"**.
4. Selecciona tu repositorio.
5. Vercel detectará automáticamente la configuración de **Vite** y el archivo `vercel.json`.
6. Haz clic en **"Deploy"**. En menos de 1 minuto tendrás tu enlace público `https://tu-proyecto.vercel.app` listo con SSL/HTTPS (necesario para el acceso a la cámara).

### Opción 2: Usando Vercel CLI desde la terminal
```bash
npx vercel
```
Sigue las indicaciones en pantalla y se desplegará directamente.

