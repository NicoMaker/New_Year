const canvas = document.getElementById("fireworks");
const ctx = canvas.getContext("2d");

let cw = window.innerWidth;
let ch = window.innerHeight;
canvas.width = cw;
canvas.height = ch;

const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

window.addEventListener("resize", () => {
  cw = window.innerWidth;
  ch = window.innerHeight;
  canvas.width = cw;
  canvas.height = ch;
});

const rand = (min, max) => Math.random() * (max - min) + min;
const PI2 = Math.PI * 2;

const colors = [
  { h: 200, s: 90, l: 60 },
  { h: 280, s: 90, l: 65 },
  { h: 320, s: 90, l: 70 },
  { h: 180, s: 90, l: 55 },
];

class Firework {
  constructor(sx, sy, tx, ty, text = null) {
    this.x = sx;
    this.y = sy;
    this.sx = sx;
    this.sy = sy;
    this.tx = tx;
    this.ty = ty;
    this.text = text;

    this.distanceToTarget = this.calcDistance(sx, sy, tx, ty);
    this.distanceTraveled = 0;

    this.angle = Math.atan2(ty - sy, tx - sx);
    this.speed = rand(8, 12);
    this.acceleration = 1.03;

    const colorSet = colors[Math.floor(Math.random() * colors.length)];
    this.hue = colorSet.h;
    this.sat = colorSet.s;
    this.light = colorSet.l;

    this.trail = [];
    this.trailLength = 5;
  }

  calcDistance(sx, sy, tx, ty) {
    const dx = tx - sx;
    const dy = ty - sy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  update(index, fireworks, particles) {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.trailLength) {
      this.trail.shift();
    }

    this.speed *= this.acceleration;
    const vx = Math.cos(this.angle) * this.speed;
    const vy = Math.sin(this.angle) * this.speed;
    this.distanceTraveled = this.calcDistance(
      this.sx,
      this.sy,
      this.x + vx,
      this.y + vy
    );

    if (this.distanceTraveled >= this.distanceToTarget) {
      this.createParticles(particles);
      fireworks.splice(index, 1);
    } else {
      this.x += vx;
      this.y += vy;
    }
  }

  draw(ctx) {
    ctx.save();

    if (this.trail.length > 1) {
      for (let i = 0; i < this.trail.length - 1; i++) {
        const point = this.trail[i];
        const nextPoint = this.trail[i + 1];
        const alpha = (i / this.trail.length) * 0.6;
        const width = (i / this.trail.length) * 2 + 1;

        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(nextPoint.x, nextPoint.y);
        ctx.strokeStyle = `hsla(${this.hue},${this.sat}%,${this.light}%,${alpha})`;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, PI2);
    ctx.fillStyle = `hsl(${this.hue},${this.sat}%,80%)`;
    ctx.shadowBlur = 15;
    ctx.shadowColor = `hsl(${this.hue},${this.sat}%,80%)`;
    ctx.fill();

    ctx.restore();
  }

  createParticles(particles) {
    const count = 35;
    for (let i = 0; i < count; i++) {
      particles.push(
        new Particle(this.tx, this.ty, this.hue, this.sat, this.light)
      );
    }
  }
}

class Particle {
  constructor(x, y, hue, sat, light) {
    this.x = x;
    this.y = y;
    this.hue = hue + rand(-15, 15);
    this.sat = sat;
    this.light = light;

    this.speed = rand(3, 8);
    this.size = rand(1.5, 3);
    this.decay = rand(0.02, 0.03);

    this.angle = rand(0, PI2);
    this.friction = 0.96;
    this.gravity = 0.08;
    this.alpha = 1;
  }

  update(index, particles) {
    this.speed *= this.friction;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed + this.gravity;
    this.alpha -= this.decay;
    this.size *= 0.98;

    if (this.alpha <= this.decay || this.size < 0.5) {
      particles.splice(index, 1);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = this.alpha;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, PI2);
    ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.light}%)`;
    ctx.shadowBlur = 10;
    ctx.shadowColor = `hsl(${this.hue},${this.sat}%,${this.light}%)`;
    ctx.fill();

    ctx.restore();
  }
}

class TextParticle {
  constructor(x, y, text, hue, sat, light) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.hue = hue;
    this.sat = sat;
    this.light = light;
    this.alpha = 1;
    this.decay = 0.008;
    this.size = 48;
    this.vy = -1;
    this.gravity = 0.05;
  }

  update(index, particles) {
    this.vy += this.gravity;
    this.y += this.vy;
    this.alpha -= this.decay;

    if (this.alpha <= 0) {
      particles.splice(index, 1);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.font = `bold ${this.size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `hsl(${this.hue},${this.sat}%,${this.light}%)`;
    ctx.shadowBlur = 20;
    ctx.shadowColor = `hsl(${this.hue},${this.sat}%,${this.light}%)`;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

const fireworks = [];
const particles = [];
let lastAutoLaunch = 0;
const autoInterval = 1500;

window.addEventListener("click", (e) => {
  const startX = cw / 2;
  const startY = ch;
  const targetX = e.clientX;
  const targetY = e.clientY;
  fireworks.push(new Firework(startX, startY, targetX, targetY));
});

function loop(timestamp) {
  requestAnimationFrame(loop);

  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
  ctx.fillRect(0, 0, cw, ch);
  ctx.globalCompositeOperation = "lighter";

  if (!lastAutoLaunch || timestamp - lastAutoLaunch > autoInterval) {
    for (let i = 0; i < 3; i++) {
      const startX = cw / 2 + rand(-100, 100);
      const startY = ch;

      let targetX, targetY;

      switch (i) {
        case 0:
          targetX = rand(cw * 0.1, cw * 0.3);
          targetY = rand(ch * 0.1, ch * 0.25);
          break;
        case 1:
          targetX = rand(cw * 0.4, cw * 0.6);
          targetY = rand(ch * 0.05, ch * 0.2);
          break;
        case 2:
          targetX = rand(cw * 0.7, cw * 0.9);
          targetY = rand(ch * 0.1, ch * 0.25);
          break;
      }

      fireworks.push(new Firework(startX, startY, targetX, targetY));
    }

    for (let i = 0; i < 3; i++) {
      const startX = cw / 2 + rand(-100, 100);
      const startY = ch;

      let targetX, targetY;

      switch (i) {
        case 0:
          targetX = rand(cw * 0.15, cw * 0.35);
          targetY = rand(ch * 0.4, ch * 0.55);
          break;
        case 1:
          targetX = rand(cw * 0.4, cw * 0.6);
          targetY = rand(ch * 0.45, ch * 0.6);
          break;
        case 2:
          targetX = rand(cw * 0.65, cw * 0.85);
          targetY = rand(ch * 0.4, ch * 0.55);
          break;
      }

      fireworks.push(new Firework(startX, startY, targetX, targetY));
    }

    lastAutoLaunch = timestamp;
  }

  for (let i = fireworks.length - 1; i >= 0; i--) {
    fireworks[i].update(i, fireworks, particles);
    fireworks[i].draw(ctx);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(i, particles);
    particles[i].draw(ctx);
  }
}

requestAnimationFrame(loop);
