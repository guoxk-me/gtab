export interface Meteor {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  angle: number;
  width: number;
  tail: number;
}

export interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export class MeteorShower {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private meteors: Meteor[] = [];
  private stars: Star[] = [];
  private animationId: number | null = null;
  private lastTime = 0;
  private spawnTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    this.initStars();
  }

  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private initStars() {
    this.stars = [];
    const count = Math.floor((this.canvas.width * this.canvas.height) / 4000);
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 1.2 + 0.2,
        opacity: Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  private spawnMeteor() {
    const angle = (Math.PI / 180) * (30 + Math.random() * 20); // 30-50 degrees
    const startX = Math.random() * this.canvas.width * 1.5 - this.canvas.width * 0.25;
    const startY = -50;
    this.meteors.push({
      x: startX,
      y: startY,
      length: Math.random() * 120 + 60,
      speed: Math.random() * 6 + 4,
      opacity: Math.random() * 0.6 + 0.4,
      angle,
      width: Math.random() * 1.5 + 0.5,
      tail: 0,
    });
  }

  private drawStars(time: number) {
    for (const star of this.stars) {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
      const opacity = star.opacity + twinkle * 0.15;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, opacity)})`;
      this.ctx.fill();
    }
  }

  private drawMeteors() {
    for (const m of this.meteors) {
      const dx = Math.cos(m.angle) * m.length;
      const dy = Math.sin(m.angle) * m.length;

      const gradient = this.ctx.createLinearGradient(m.x, m.y, m.x - dx, m.y - dy);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${m.opacity})`);
      gradient.addColorStop(0.3, `rgba(180, 200, 255, ${m.opacity * 0.6})`);
      gradient.addColorStop(1, "rgba(180, 200, 255, 0)");

      this.ctx.beginPath();
      this.ctx.moveTo(m.x, m.y);
      this.ctx.lineTo(m.x - dx, m.y - dy);
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = m.width;
      this.ctx.lineCap = "round";
      this.ctx.stroke();

      // Glow at head
      const glow = this.ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.width * 3);
      glow.addColorStop(0, `rgba(220, 230, 255, ${m.opacity * 0.8})`);
      glow.addColorStop(1, "rgba(220, 230, 255, 0)");
      this.ctx.beginPath();
      this.ctx.arc(m.x, m.y, m.width * 3, 0, Math.PI * 2);
      this.ctx.fillStyle = glow;
      this.ctx.fill();
    }
  }

  private update(delta: number) {
    // Spawn new meteors
    this.spawnTimer += delta;
    const spawnInterval = 800 + Math.random() * 1200;
    if (this.spawnTimer > spawnInterval) {
      this.spawnTimer = 0;
      if (this.meteors.length < 8) {
        this.spawnMeteor();
        // Occasionally spawn a burst
        if (Math.random() < 0.2) {
          setTimeout(() => this.spawnMeteor(), 150);
          setTimeout(() => this.spawnMeteor(), 300);
        }
      }
    }

    // Move meteors
    this.meteors = this.meteors.filter((m) => {
      m.x += Math.cos(m.angle) * m.speed;
      m.y += Math.sin(m.angle) * m.speed;
      m.opacity -= 0.008;
      return (
        m.opacity > 0 &&
        m.x < this.canvas.width + 200 &&
        m.y < this.canvas.height + 200
      );
    });
  }

  private draw(time: number) {
    const { width, height } = this.canvas;

    // Background gradient
    const bg = this.ctx.createRadialGradient(
      width * 0.5,
      height * 0.3,
      0,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.8,
    );
    bg.addColorStop(0, "#0d1b3e");
    bg.addColorStop(0.5, "#080d1f");
    bg.addColorStop(1, "#020408");

    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, width, height);

    this.drawStars(time);
    this.drawMeteors();
  }

  start() {
    const loop = (time: number) => {
      const delta = time - this.lastTime;
      this.lastTime = time;
      this.update(delta);
      this.draw(time);
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);

    window.addEventListener("resize", () => {
      this.resize();
      this.initStars();
    });
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
