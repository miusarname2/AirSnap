// Generador de imágenes procedurales idénticas y mejoradas de main.py

export function createProceduralScenes(size = 480) {
  return [
    createMountainsScene(size),
    createCityScene(size),
    createGeometricScene(size)
  ];
}

function createMountainsScene(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Degradado de cielo (de púrpura/magenta oscuro a naranja/durazno brillante)
  const sky = ctx.createLinearGradient(0, 0, 0, size);
  sky.addColorStop(0, '#3c285a');
  sky.addColorStop(0.4, '#823768');
  sky.addColorStop(0.75, '#c96160');
  sky.addColorStop(1, '#ff966e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, size, size);

  // Estrellas
  ctx.fillStyle = '#ffffff';
  const seedRandom = (seed) => {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
  for (let i = 0; i < 45; i++) {
    const rx = seedRandom(i * 3 + 1) * size;
    const ry = seedRandom(i * 5 + 2) * (size * 0.4);
    const r = seedRandom(i * 7 + 3) * 1.5 + 0.5;
    ctx.beginPath();
    ctx.arc(rx, ry, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sol resplandeciente
  const sunX = size * 0.5;
  const sunY = size * 0.55;
  const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, size * 0.35);
  glow.addColorStop(0, 'rgba(255, 235, 180, 0.95)');
  glow.addColorStop(0.4, 'rgba(255, 170, 110, 0.45)');
  glow.addColorStop(1, 'rgba(255, 120, 80, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, size * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff4df';
  ctx.beginPath();
  ctx.arc(sunX, sunY, size * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // Capas de montañas
  const layers = [
    {
      color: '#784b73',
      points: [
        [0, 0.68], [0.13, 0.57], [0.27, 0.65], [0.43, 0.52], [0.60, 0.66], [0.75, 0.54], [1.0, 0.68]
      ]
    },
    {
      color: '#5a3458',
      points: [
        [0, 0.80], [0.20, 0.65], [0.38, 0.78], [0.57, 0.68], [0.78, 0.82], [1.0, 0.72]
      ]
    },
    {
      color: '#3e243d',
      points: [
        [0, 0.92], [0.25, 0.80], [0.50, 0.92], [0.75, 0.82], [1.0, 0.93]
      ]
    }
  ];

  layers.forEach(({ color, points }) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, size);
    points.forEach(([px, py]) => {
      ctx.lineTo(px * size, py * size);
    });
    ctx.lineTo(size, size);
    ctx.closePath();
    ctx.fill();
  });

  return canvas;
}

function createCityScene(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Cielo nocturno
  const sky = ctx.createLinearGradient(0, 0, 0, size);
  sky.addColorStop(0, '#101728');
  sky.addColorStop(0.5, '#1e2640');
  sky.addColorStop(1, '#3c3250');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, size, size);

  // Estrellas
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 60; i++) {
    const rx = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * size;
    const ry = (Math.sin(i * 78.233) * 43758.5453 % 1 + 1) % 1 * (size * 0.55);
    ctx.beginPath();
    ctx.arc(rx, ry, Math.random() > 0.8 ? 1.5 : 1.0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Luna brillante y cráteres
  const moonX = size * 0.78;
  const moonY = size * 0.18;
  const moonR = size * 0.08;

  const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 2.5);
  moonGlow.addColorStop(0, 'rgba(230, 240, 255, 0.4)');
  moonGlow.addColorStop(1, 'rgba(230, 240, 255, 0)');
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR * 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#eef3f8';
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();

  // Cráteres lunares
  ctx.fillStyle = '#d2dbe5';
  [
    [moonX - 8, moonY - 6, 7],
    [moonX + 12, moonY + 8, 5],
    [moonX + 4, moonY - 10, 4]
  ].forEach(([cx, cy, cr]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  });

  // Edificios silueteados
  let curX = 0;
  let idx = 0;
  while (curX < size) {
    const bw = 40 + ((idx * 37) % 35);
    const bh = 120 + ((idx * 73) % 240);
    const bTop = size - bh;

    const bGrad = ctx.createLinearGradient(curX, bTop, curX, size);
    bGrad.addColorStop(0, '#221e2a');
    bGrad.addColorStop(1, '#110f17');
    ctx.fillStyle = bGrad;
    ctx.fillRect(curX, bTop, bw, bh);

    // Ventanas iluminadas
    for (let wy = bTop + 14; wy < size - 20; wy += 22) {
      for (let wx = curX + 7; wx < curX + bw - 10; wx += 16) {
        if ((wx * 13 + wy * 19 + idx) % 5 > 2) {
          ctx.fillStyle = (wx + wy) % 7 === 0 ? '#ffdd88' : '#7fe4ff';
          ctx.fillRect(wx, wy, 8, 12);
        }
      }
    }

    curX += bw + 3;
    idx++;
  }

  return canvas;
}

function createGeometricScene(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Fondo oscuro moderno
  ctx.fillStyle = '#1e1a18';
  ctx.fillRect(0, 0, size, size);

  const colors = [
    'rgba(240, 90, 60, 0.75)',
    'rgba(0, 180, 240, 0.75)',
    'rgba(140, 210, 70, 0.75)',
    'rgba(255, 200, 50, 0.75)',
    'rgba(170, 100, 240, 0.75)',
    'rgba(240, 240, 240, 0.65)'
  ];

  for (let i = 0; i < 18; i++) {
    const col = colors[i % colors.length];
    ctx.fillStyle = col;
    const cx = ((i * 137) % size);
    const cy = ((i * 219) % size);
    const r = 40 + ((i * 53) % 90);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i * 35 * Math.PI) / 180);

    const type = i % 3;
    if (type === 0) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 1) {
      ctx.fillRect(-r, -r, r * 2, r * 2);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, r);
      ctx.lineTo(-r, r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  return canvas;
}
