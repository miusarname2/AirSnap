import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export class HandDetector {
  constructor() {
    this.landmarker = null;
    this.isReady = false;
    this.lastTimestamp = 0;
  }

  async init(onProgress) {
    if (this.isReady) return;

    if (onProgress) onProgress('Cargando motor de visión MediaPipe...');
    let vision;
    try {
      vision = await FilesetResolver.forVisionTasks('./wasm');
    } catch (err) {
      console.warn('Cargando desde CDN fallback...', err);
      vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
      );
    }

    if (onProgress) onProgress('Descargando modelo de detección de manos...');
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    this.isReady = true;
    if (onProgress) onProgress('¡Detector de manos listo!');
  }

  detect(videoElement, width, height) {
    if (
      !this.isReady ||
      !this.landmarker ||
      !videoElement ||
      videoElement.readyState < 2 ||
      videoElement.videoWidth === 0
    ) {
      return null;
    }

    let now = performance.now();
    if (now <= this.lastTimestamp) {
      now = this.lastTimestamp + 1;
    }
    this.lastTimestamp = now;

    let results = null;
    try {
      results = this.landmarker.detectForVideo(videoElement, now);
    } catch (e) {
      console.warn('Error en detectForVideo:', e);
      return null;
    }

    if (!results || !results.landmarks || results.landmarks.length === 0) {
      return null;
    }

    const landmarks = results.landmarks[0];

    // Modo espejo idéntico a main.py:
    // En main.py se invertía la imagen con cv2.flip(frame, 1) y luego se calculaba:
    // pts = [((p.x - 0.1) / 0.8 * W, (p.y - 0.1) / 0.8 * H) for p in res.hand_landmarks[0]]
    const pts = landmarks.map(p => {
      const mirroredX = 1 - p.x;
      const sx = ((mirroredX - 0.1) / 0.8) * width;
      const sy = ((p.y - 0.1) / 0.8) * height;
      return [sx, sy, p.z || 0];
    });

    // Centro de la palma: promedio de muñeca (0) y bases de dedos (5, 9, 13, 17)
    const palmIndices = [0, 5, 9, 13, 17];
    const cx = palmIndices.reduce((sum, i) => sum + pts[i][0], 0) / 5;
    const cy = palmIndices.reduce((sum, i) => sum + pts[i][1], 0) / 5;

    // Tamaño de la mano: distancia de la muñeca (0) a la base del dedo medio (9)
    const tam = Math.max(
      Math.hypot(pts[0][0] - pts[9][0], pts[0][1] - pts[9][1]),
      1
    );

    // Distancia media de las 4 puntas de los dedos (8, 12, 16, 20) al centro de la palma
    const fingertips = [8, 12, 16, 20];
    const avgTipDist =
      fingertips.reduce((sum, t) => sum + Math.hypot(pts[t][0] - cx, pts[t][1] - cy), 0) / 4;
    const ratio = avgTipDist / tam;

    return {
      pts,
      cx: Math.min(Math.max(cx, 0), width),
      cy: Math.min(Math.max(cy, 0), height),
      ratio
    };
  }
}

export const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];
