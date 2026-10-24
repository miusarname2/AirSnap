// Generador y manipulador de piezas de rompecabezas con encaje realista

const K_BANDEJA = 0.62;

// Perfil de lengüeta de rompecabezas paramétrico (u: 0->1, w: desplazamiento normal)
function generateTabProfile() {
  const pts = [[0.0, 0.0], [0.34, 0.0]];
  const a = [0.34, 0.0], b = [0.455, 0.0], c = [0.455, 0.06];
  for (let step = 1; step <= 6; step++) {
    const t = step / 6;
    const u = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0];
    const w = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1];
    pts.push([u, w]);
  }

  const cw = 0.17, R = 0.10;
  const wn = cw - Math.sqrt(Math.max(0, R * R - 0.045 * 0.045));
  pts.push([0.455, wn]);

  const a0 = Math.atan2(wn - cw, 0.455 - 0.5) + 2 * Math.PI;
  const a1 = Math.atan2(wn - cw, 0.545 - 0.5);
  const stepsArc = 24;
  for (let i = 1; i < stepsArc; i++) {
    const ang = a0 + (a1 - a0) * (i / stepsArc);
    pts.push([0.5 + R * Math.cos(ang), cw + R * Math.sin(ang)]);
  }
  pts.push([0.545, wn]);

  const rightSide = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    rightSide.push([1 - pts[i][0], pts[i][1]]);
  }
  return pts.concat(rightSide);
}

const TAB_PROFILE = generateTabProfile();

// Genera los puntos de un borde con lengüeta (+1), hueco (-1) o recto (0)
function generateEdge(p0, p1, sign, c) {
  if (sign === 0) {
    return [p0];
  }
  const dx = (p1[0] - p0[0]) / c;
  const dy = (p1[1] - p0[1]) / c;
  const nx = dy;
  const ny = -dx;

  return TAB_PROFILE.slice(0, -1).map(([u, w]) => [
    p0[0] + dx * u * c + nx * w * sign * c,
    p0[1] + dy * u * c + ny * w * sign * c
  ]);
}

export function buildPuzzle(sourceImage, n, boardWidth, boardX0, boardY0) {
  const c = Math.floor(boardWidth / n);
  const m = Math.ceil(0.27 * c) + 4;
  const P = c + 2 * m;
  const Ps = Math.floor(P * K_BANDEJA);

  // Generar pestañas internas de forma consistente entre piezas adyacentes
  const hs = Array.from({ length: n + 1 }, () => Array(n).fill(0));
  const vs = Array.from({ length: n }, () => Array(n + 1).fill(0));

  for (let r = 1; r < n; r++) {
    for (let q = 0; q < n; q++) {
      hs[r][q] = Math.random() < 0.5 ? -1 : 1;
    }
  }
  for (let r = 0; r < n; r++) {
    for (let q = 1; q < n; q++) {
      vs[r][q] = Math.random() < 0.5 ? -1 : 1;
    }
  }

  const pieces = [];

  for (let r = 0; r < n; r++) {
    for (let q = 0; q < n; q++) {
      const a = m;
      const b = m + c;

      // Puntos perimetrales en coordenadas locales del canvas de la pieza (tamaño P x P)
      const topPts = generateEdge([a, a], [b, a], -hs[r][q], c);
      const rightPts = generateEdge([b, a], [b, b], vs[r][q + 1], c);
      const bottomPts = generateEdge([b, b], [a, b], hs[r + 1][q], c);
      const leftPts = generateEdge([a, b], [a, a], -vs[r][q], c);
      const allPts = [...topPts, ...rightPts, ...bottomPts, ...leftPts];

      // Canvas para la pieza en tamaño completo (al arrastrarla o fijarla)
      const pieceCanvas = document.createElement('canvas');
      pieceCanvas.width = P;
      pieceCanvas.height = P;
      const pctx = pieceCanvas.getContext('2d');

      const piecePath = new Path2D();
      piecePath.moveTo(allPts[0][0], allPts[0][1]);
      for (let i = 1; i < allPts.length; i++) {
        piecePath.lineTo(allPts[i][0], allPts[i][1]);
      }
      piecePath.closePath();

      pctx.save();
      pctx.clip(piecePath);

      // Dibujar la sección de la imagen original
      const srcX = q * c - m;
      const srcY = r * c - m;
      pctx.drawImage(sourceImage, -srcX, -srcY, boardWidth, boardWidth);

      // Sutil brillo 3D interior
      pctx.lineWidth = 3;
      pctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      pctx.stroke(piecePath);
      pctx.restore();

      // Borde externo sutil para distinguir la pieza
      pctx.lineWidth = 1.8;
      pctx.strokeStyle = 'rgba(20, 20, 20, 0.65)';
      pctx.stroke(piecePath);

      // Versión a escala reducida para la bandeja lateral
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = Ps;
      smallCanvas.height = Ps;
      const sctx = smallCanvas.getContext('2d');
      sctx.drawImage(pieceCanvas, 0, 0, Ps, Ps);

      // Coordenadas objetivo en el tablero
      const targetX = boardX0 + q * c + c / 2;
      const targetY = boardY0 + r * c + c / 2;

      pieces.push({
        id: `${r}_${q}`,
        row: r,
        col: q,
        canvas: pieceCanvas,
        smallCanvas: smallCanvas,
        path: piecePath,
        P: P,
        Ps: Ps,
        c: c,
        m: m,
        cx: targetX,
        cy: targetY,
        tx: targetX,
        ty: targetY,
        fija: false,
        // Radio de colisión para tomar la pieza
        radius: (c / 2) * 0.95
      });
    }
  }

  return { pieces, c, m, P, Ps };
}

// Genera la plantilla oscura de fondo donde van las ranuras del tablero
export function createBoardTemplate(pieces, boardWidth, c, m, P) {
  const templateCanvas = document.createElement('canvas');
  templateCanvas.width = boardWidth;
  templateCanvas.height = boardWidth;
  const ctx = templateCanvas.getContext('2d');

  // Fondo de tablero de madera/mármol oscuro sobrio
  ctx.fillStyle = '#2d2724';
  ctx.fillRect(0, 0, boardWidth, boardWidth);

  // Dibujar ranuras de cada pieza
  pieces.forEach(p => {
    ctx.save();
    ctx.translate(p.col * c - m, p.row * c - m);
    ctx.fillStyle = '#241f1c';
    ctx.fill(p.path);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#4e4540';
    ctx.stroke(p.path);
    ctx.restore();
  });

  return templateCanvas;
}
