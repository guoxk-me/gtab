interface MistOrb {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
}

export class DaySky {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mistOrbs: MistOrb[] = [];
  private animationId: number | null = null;
  private lastTime = 0;
  private resizeHandler = () => {
    this.resize();
    this.initScene();
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    this.initScene();
  }

  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private initScene() {
    const { width, height } = this.canvas;

    const palette = ["209, 224, 255", "187, 211, 246", "234, 239, 252", "220, 230, 248"];

    this.mistOrbs = [
      {
        x: width * 0.82,
        y: height * 0.12,
        radius: 420,
        speedX: 0.0016,
        speedY: 0.0009,
        opacity: 0.28,
        color: palette[2],
      },
      {
        x: width * 0.14,
        y: height * 0.18,
        radius: 360,
        speedX: 0.0024,
        speedY: 0.0013,
        opacity: 0.24,
        color: palette[0],
      },
      {
        x: width * 0.52,
        y: height * 0.42,
        radius: 300,
        speedX: -0.0015,
        speedY: 0.0009,
        opacity: 0.16,
        color: palette[3],
      },
      {
        x: width * 0.76,
        y: height * 0.75,
        radius: 280,
        speedX: -0.0022,
        speedY: -0.0015,
        opacity: 0.18,
        color: palette[1],
      },
      {
        x: width * 0.18,
        y: height * 0.82,
        radius: 240,
        speedX: 0.0026,
        speedY: -0.0017,
        opacity: 0.15,
        color: palette[2],
      },
      {
        x: width * 0.65,
        y: height * 0.28,
        radius: 180,
        speedX: -0.003,
        speedY: 0.0022,
        opacity: 0.14,
        color: palette[0],
      },
    ];
  }

  private update(delta: number) {
    const { width, height } = this.canvas;

    for (const orb of this.mistOrbs) {
      orb.x += orb.speedX * delta;
      orb.y += orb.speedY * delta;

      if (orb.x - orb.radius > width + 100) orb.x = -orb.radius;
      if (orb.x + orb.radius < -100) orb.x = width + orb.radius;
      if (orb.y - orb.radius > height + 100) orb.y = -orb.radius;
      if (orb.y + orb.radius < -100) orb.y = height + orb.radius;
    }
  }

  private drawBackground() {
    const { ctx, canvas } = this;
    const { width, height } = canvas;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#edf4ff");
    gradient.addColorStop(0.36, "#e7effb");
    gradient.addColorStop(0.68, "#e9f0fa");
    gradient.addColorStop(1, "#dde7f5");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const topGlow = ctx.createRadialGradient(
      width * 0.52,
      height * 0.02,
      0,
      width * 0.52,
      height * 0.02,
      width * 0.65,
    );
    topGlow.addColorStop(0, "rgba(255, 255, 255, 0.42)");
    topGlow.addColorStop(0.48, "rgba(245, 249, 255, 0.18)");
    topGlow.addColorStop(1, "rgba(245, 249, 255, 0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, width, height);

    const lowerFade = ctx.createLinearGradient(0, height * 0.62, 0, height);
    lowerFade.addColorStop(0, "rgba(191, 209, 236, 0)");
    lowerFade.addColorStop(1, "rgba(191, 209, 236, 0.22)");
    ctx.fillStyle = lowerFade;
    ctx.fillRect(0, 0, width, height);
  }

  private drawMistOrbs(time: number) {
    const { ctx } = this;

    for (const orb of this.mistOrbs) {
      const breathe = 1 + Math.sin(time * 0.0003 + orb.x * 0.001) * 0.06;
      const r = orb.radius * breathe;

      const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, r);
      gradient.addColorStop(0, `rgba(${orb.color}, ${orb.opacity})`);
      gradient.addColorStop(0.5, `rgba(${orb.color}, ${orb.opacity * 0.45})`);
      gradient.addColorStop(1, `rgba(${orb.color}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private draw(time: number) {
    this.drawBackground();
    this.drawMistOrbs(time);
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
