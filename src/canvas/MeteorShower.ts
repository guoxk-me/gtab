export interface Meteor {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  angle: number;
  width: number;
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
  private resizeHandler = () => {
    this.resize();
    this.initStars();
  };

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
    // 密度降低 30%，更细腻
    const count = Math.floor((this.canvas.width * this.canvas.height) / 5500);
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 0.9 + 0.15,
        opacity: Math.random() * 0.5 + 0.15,
        twinkleSpeed: Math.random() * 0.015 + 0.004,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  private spawnMeteor() {
    const angle = (Math.PI / 180) * (28 + Math.random() * 18);
    const startX = Math.random() * this.canvas.width * 1.4 - this.canvas.width * 0.2;
    const startY = -50;
    this.meteors.push({
      x: startX,
      y: startY,
      length: Math.random() * 100 + 50,
      speed: Math.random() * 5 + 3.5,
      opacity: Math.random() * 0.55 + 0.35,
      angle,
      width: Math.random() * 1.2 + 0.4,
    });
  }

  private drawBackground() {
    const { ctx, canvas } = this;
    const { width, height } = canvas;

    // 主渐变：深紫蓝 → 深靛 → 近黑
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "#1a1740");
    bg.addColorStop(0.55, "#0d1230");
    bg.addColorStop(1, "#06070f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // 左上角深空暖斑（纵深感）
    const nebula = ctx.createRadialGradient(
      width * 0.18,
      height * 0.22,
      0,
      width * 0.18,
      height * 0.22,
      width * 0.45,
    );
    nebula.addColorStop(0, "rgba(80, 55, 140, 0.22)");
    nebula.addColorStop(0.5, "rgba(50, 35, 100, 0.10)");
    nebula.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, width, height);

    // 底部地平线辉光（承托按钮区域）
    const horizon = ctx.createLinearGradient(0, height * 0.72, 0, height);
    horizon.addColorStop(0, "rgba(0, 0, 0, 0)");
    horizon.addColorStop(0.6, "rgba(55, 35, 95, 0.28)");
    horizon.addColorStop(1, "rgba(40, 25, 75, 0.45)");
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 0, width, height);
  }

  private drawAurora(time: number) {
    const { ctx, canvas } = this;
    const { width, height } = canvas;

    const t = time * 0.00008;

    // 极光带 1：青绿色，偏上
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const bandHeight1 = height * 0.06;
    const baseY1 = height * 0.28 + Math.sin(t * 0.7) * height * 0.04;

    const aurora1 = ctx.createLinearGradient(0, baseY1 - bandHeight1, 0, baseY1 + bandHeight1);
    aurora1.addColorStop(0, "rgba(100, 210, 195, 0)");
    aurora1.addColorStop(0.5, "rgba(120, 210, 200, 0.10)");
    aurora1.addColorStop(1, "rgba(100, 210, 195, 0)");

    ctx.beginPath();
    ctx.moveTo(0, baseY1);
    for (let x = 0; x <= width; x += 8) {
      const y =
        baseY1 +
        Math.sin(x * 0.004 + t * 1.2) * height * 0.025 +
        Math.sin(x * 0.009 + t * 0.8) * height * 0.012;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, baseY1 + bandHeight1 * 2);
    ctx.lineTo(0, baseY1 + bandHeight1 * 2);
    ctx.closePath();
    ctx.fillStyle = aurora1;
    ctx.fill();

    // 极光带 2：紫色，偏中
    const bandHeight2 = height * 0.05;
    const baseY2 = height * 0.42 + Math.sin(t * 0.5 + 1.2) * height * 0.035;

    const aurora2 = ctx.createLinearGradient(0, baseY2 - bandHeight2, 0, baseY2 + bandHeight2);
    aurora2.addColorStop(0, "rgba(160, 120, 230, 0)");
    aurora2.addColorStop(0.5, "rgba(165, 130, 235, 0.09)");
    aurora2.addColorStop(1, "rgba(160, 120, 230, 0)");

    ctx.beginPath();
    ctx.moveTo(0, baseY2);
    for (let x = 0; x <= width; x += 8) {
      const y =
        baseY2 +
        Math.sin(x * 0.005 + t * 0.9 + 2.5) * height * 0.022 +
        Math.sin(x * 0.011 + t * 1.4) * height * 0.01;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, baseY2 + bandHeight2 * 2);
    ctx.lineTo(0, baseY2 + bandHeight2 * 2);
    ctx.closePath();
    ctx.fillStyle = aurora2;
    ctx.fill();

    ctx.restore();
  }

  private drawStars(time: number) {
    for (const star of this.stars) {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
      const opacity = star.opacity + twinkle * 0.12;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(220, 228, 255, ${Math.max(0, opacity)})`;
      this.ctx.fill();
    }
  }

  private drawMeteors() {
    for (const m of this.meteors) {
      const dx = Math.cos(m.angle) * m.length;
      const dy = Math.sin(m.angle) * m.length;

      const gradient = this.ctx.createLinearGradient(m.x, m.y, m.x - dx, m.y - dy);
      gradient.addColorStop(0, `rgba(220, 235, 255, ${m.opacity})`);
      gradient.addColorStop(0.25, `rgba(180, 210, 255, ${m.opacity * 0.55})`);
      gradient.addColorStop(1, "rgba(160, 200, 255, 0)");

      this.ctx.beginPath();
      this.ctx.moveTo(m.x, m.y);
      this.ctx.lineTo(m.x - dx, m.y - dy);
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = m.width;
      this.ctx.lineCap = "round";
      this.ctx.stroke();

      // 头部辉光
      const glow = this.ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.width * 2.5);
      glow.addColorStop(0, `rgba(210, 228, 255, ${m.opacity * 0.7})`);
      glow.addColorStop(1, "rgba(210, 228, 255, 0)");
      this.ctx.beginPath();
      this.ctx.arc(m.x, m.y, m.width * 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = glow;
      this.ctx.fill();
    }
  }

  private update(delta: number) {
    // 克制的流星：间隔 2500-5000ms，并发上限 3，无 burst
    this.spawnTimer += delta;
    const spawnInterval = 2500 + Math.random() * 2500;
    if (this.spawnTimer > spawnInterval) {
      this.spawnTimer = 0;
      if (this.meteors.length < 3) {
        this.spawnMeteor();
      }
    }

    this.meteors = this.meteors.filter((m) => {
      m.x += Math.cos(m.angle) * m.speed;
      m.y += Math.sin(m.angle) * m.speed;
      m.opacity -= 0.006;
      return m.opacity > 0 && m.x < this.canvas.width + 200 && m.y < this.canvas.height + 200;
    });
  }

  private draw(time: number) {
    this.drawBackground();
    this.drawAurora(time);
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
    window.addEventListener("resize", this.resizeHandler);
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    window.removeEventListener("resize", this.resizeHandler);
  }
}
