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

type BackgroundTheme = "dark" | "light";
type RgbaColor = readonly [number, number, number, number];

interface ThemePalette {
  backgroundTop: RgbaColor;
  backgroundMid: RgbaColor;
  backgroundBottom: RgbaColor;
  topGlowInner: RgbaColor;
  topGlowMid: RgbaColor;
  topGlowOuter: RgbaColor;
  lightBandTop: RgbaColor;
  lightBandMid: RgbaColor;
  lightBandBottom: RgbaColor;
  nebulaInner: RgbaColor;
  nebulaMid: RgbaColor;
  nebulaOuter: RgbaColor;
  horizonTop: RgbaColor;
  horizonMid: RgbaColor;
  horizonBottom: RgbaColor;
  auroraBlend: GlobalCompositeOperation;
  auroraOneInner: RgbaColor;
  auroraOneMid: RgbaColor;
  auroraOneOuter: RgbaColor;
  auroraTwoInner: RgbaColor;
  auroraTwoMid: RgbaColor;
  auroraTwoOuter: RgbaColor;
  star: RgbaColor;
  meteorHead: RgbaColor;
  meteorMid: RgbaColor;
  meteorTail: RgbaColor;
  glow: RgbaColor;
}

const THEME_PALETTES: Record<BackgroundTheme, ThemePalette> = {
  dark: {
    backgroundTop: [48, 52, 104, 1],
    backgroundMid: [29, 39, 78, 1],
    backgroundBottom: [18, 25, 46, 1],
    topGlowInner: [170, 188, 255, 0.08],
    topGlowMid: [118, 138, 210, 0.04],
    topGlowOuter: [0, 0, 0, 0],
    lightBandTop: [160, 185, 255, 0],
    lightBandMid: [132, 158, 228, 0.05],
    lightBandBottom: [160, 185, 255, 0],
    nebulaInner: [116, 100, 184, 0.26],
    nebulaMid: [83, 72, 138, 0.13],
    nebulaOuter: [0, 0, 0, 0],
    horizonTop: [0, 0, 0, 0],
    horizonMid: [90, 72, 136, 0.28],
    horizonBottom: [70, 54, 112, 0.4],
    auroraBlend: "screen",
    auroraOneInner: [100, 210, 195, 0],
    auroraOneMid: [144, 228, 218, 0.13],
    auroraOneOuter: [100, 210, 195, 0],
    auroraTwoInner: [160, 120, 230, 0],
    auroraTwoMid: [188, 160, 246, 0.12],
    auroraTwoOuter: [160, 120, 230, 0],
    star: [236, 241, 255, 1],
    meteorHead: [240, 246, 255, 1],
    meteorMid: [202, 226, 255, 1],
    meteorTail: [178, 214, 255, 0],
    glow: [230, 240, 255, 1],
  },
  light: {
    // 顶部近白 → 底部深钢蓝，亮度差约 100，和 dark 的层次感对齐
    backgroundTop: [252, 254, 255, 1],
    backgroundMid: [188, 212, 236, 1],
    backgroundBottom: [128, 164, 204, 1],
    topGlowInner: [255, 255, 255, 0.82],
    topGlowMid: [240, 247, 255, 0.4],
    topGlowOuter: [255, 255, 255, 0],
    lightBandTop: [255, 255, 255, 0],
    lightBandMid: [250, 253, 255, 0.36],
    lightBandBottom: [255, 255, 255, 0],
    // nebula 用更高不透明度，左上角明显亮斑
    nebulaInner: [255, 255, 255, 0.62],
    nebulaMid: [214, 232, 252, 0.38],
    nebulaOuter: [0, 0, 0, 0],
    // horizon 底部更重，承托感更强
    horizonTop: [0, 0, 0, 0],
    horizonMid: [100, 140, 184, 0.32],
    horizonBottom: [72, 112, 160, 0.52],
    // light 下用 multiply，在亮底上才能真正显色
    auroraBlend: "multiply",
    auroraOneInner: [160, 220, 210, 0],
    auroraOneMid: [140, 200, 192, 0.28],
    auroraOneOuter: [160, 220, 210, 0],
    auroraTwoInner: [180, 160, 230, 0],
    auroraTwoMid: [164, 148, 218, 0.24],
    auroraTwoOuter: [180, 160, 230, 0],
    star: [255, 255, 255, 0.8],
    meteorHead: [255, 255, 255, 0.76],
    meteorMid: [200, 228, 255, 0.68],
    meteorTail: [160, 200, 240, 0],
    glow: [255, 255, 255, 0.65],
  },
};

function mixNumber(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function mixColor(from: RgbaColor, to: RgbaColor, progress: number): RgbaColor {
  return [
    mixNumber(from[0], to[0], progress),
    mixNumber(from[1], to[1], progress),
    mixNumber(from[2], to[2], progress),
    mixNumber(from[3], to[3], progress),
  ];
}

function mixPalette(from: ThemePalette, to: ThemePalette, progress: number): ThemePalette {
  return {
    backgroundTop: mixColor(from.backgroundTop, to.backgroundTop, progress),
    backgroundMid: mixColor(from.backgroundMid, to.backgroundMid, progress),
    backgroundBottom: mixColor(from.backgroundBottom, to.backgroundBottom, progress),
    topGlowInner: mixColor(from.topGlowInner, to.topGlowInner, progress),
    topGlowMid: mixColor(from.topGlowMid, to.topGlowMid, progress),
    topGlowOuter: mixColor(from.topGlowOuter, to.topGlowOuter, progress),
    lightBandTop: mixColor(from.lightBandTop, to.lightBandTop, progress),
    lightBandMid: mixColor(from.lightBandMid, to.lightBandMid, progress),
    lightBandBottom: mixColor(from.lightBandBottom, to.lightBandBottom, progress),
    nebulaInner: mixColor(from.nebulaInner, to.nebulaInner, progress),
    nebulaMid: mixColor(from.nebulaMid, to.nebulaMid, progress),
    nebulaOuter: mixColor(from.nebulaOuter, to.nebulaOuter, progress),
    horizonTop: mixColor(from.horizonTop, to.horizonTop, progress),
    horizonMid: mixColor(from.horizonMid, to.horizonMid, progress),
    horizonBottom: mixColor(from.horizonBottom, to.horizonBottom, progress),
    auroraBlend: progress < 0.5 ? from.auroraBlend : to.auroraBlend,
    auroraOneInner: mixColor(from.auroraOneInner, to.auroraOneInner, progress),
    auroraOneMid: mixColor(from.auroraOneMid, to.auroraOneMid, progress),
    auroraOneOuter: mixColor(from.auroraOneOuter, to.auroraOneOuter, progress),
    auroraTwoInner: mixColor(from.auroraTwoInner, to.auroraTwoInner, progress),
    auroraTwoMid: mixColor(from.auroraTwoMid, to.auroraTwoMid, progress),
    auroraTwoOuter: mixColor(from.auroraTwoOuter, to.auroraTwoOuter, progress),
    star: mixColor(from.star, to.star, progress),
    meteorHead: mixColor(from.meteorHead, to.meteorHead, progress),
    meteorMid: mixColor(from.meteorMid, to.meteorMid, progress),
    meteorTail: mixColor(from.meteorTail, to.meteorTail, progress),
    glow: mixColor(from.glow, to.glow, progress),
  };
}

function toRgba(color: RgbaColor, alphaScale = 1) {
  const alpha = Math.max(0, Math.min(1, color[3] * alphaScale));
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}

export class MeteorShower {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private meteors: Meteor[] = [];
  private stars: Star[] = [];
  private animationId: number | null = null;
  private lastTime = 0;
  private spawnTimer = 0;
  private transitionDuration = 720;
  private paletteFrom: ThemePalette;
  private paletteTo: ThemePalette;
  private paletteTransitionStartedAt: number | null = null;
  private resizeHandler = () => {
    this.resize();
    this.initStars();
  };

  constructor(canvas: HTMLCanvasElement, theme: BackgroundTheme = "dark") {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.paletteFrom = THEME_PALETTES[theme];
    this.paletteTo = THEME_PALETTES[theme];
    this.resize();
    this.initStars();
  }

  private getTransitionState(time: number) {
    if (this.paletteTransitionStartedAt === null) {
      return {
        palette: this.paletteTo,
        progress: null as number | null,
      };
    }

    const rawProgress = Math.min(
      1,
      (time - this.paletteTransitionStartedAt) / this.transitionDuration,
    );
    if (rawProgress >= 1) {
      this.paletteFrom = this.paletteTo;
      this.paletteTransitionStartedAt = null;
      return {
        palette: this.paletteTo,
        progress: null as number | null,
      };
    }

    const progress = easeOutCubic(rawProgress);

    return {
      palette: mixPalette(this.paletteFrom, this.paletteTo, progress),
      progress,
    };
  }

  setTheme(theme: BackgroundTheme) {
    const nextPalette = THEME_PALETTES[theme];
    if (this.paletteTo === nextPalette && this.paletteTransitionStartedAt === null) {
      return;
    }

    const now = performance.now();
    this.paletteFrom = this.getTransitionState(now).palette;
    this.paletteTo = nextPalette;
    this.paletteTransitionStartedAt = now;
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

  private drawBackground(palette: ThemePalette) {
    const { ctx, canvas } = this;
    const { width, height } = canvas;

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, toRgba(palette.backgroundTop));
    bg.addColorStop(0.55, toRgba(palette.backgroundMid));
    bg.addColorStop(1, toRgba(palette.backgroundBottom));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const topGlow = ctx.createRadialGradient(
      width * 0.5,
      height * 0.04,
      0,
      width * 0.5,
      height * 0.04,
      width * 0.58,
    );
    topGlow.addColorStop(0, toRgba(palette.topGlowInner));
    topGlow.addColorStop(0.5, toRgba(palette.topGlowMid));
    topGlow.addColorStop(1, toRgba(palette.topGlowOuter));
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, width, height);

    const lightBand = ctx.createLinearGradient(0, height * 0.12, 0, height * 0.62);
    lightBand.addColorStop(0, toRgba(palette.lightBandTop));
    lightBand.addColorStop(0.5, toRgba(palette.lightBandMid));
    lightBand.addColorStop(1, toRgba(palette.lightBandBottom));
    ctx.fillStyle = lightBand;
    ctx.fillRect(0, 0, width, height);

    const nebula = ctx.createRadialGradient(
      width * 0.18,
      height * 0.22,
      0,
      width * 0.18,
      height * 0.22,
      width * 0.45,
    );
    nebula.addColorStop(0, toRgba(palette.nebulaInner));
    nebula.addColorStop(0.5, toRgba(palette.nebulaMid));
    nebula.addColorStop(1, toRgba(palette.nebulaOuter));
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, width, height);

    const horizon = ctx.createLinearGradient(0, height * 0.72, 0, height);
    horizon.addColorStop(0, toRgba(palette.horizonTop));
    horizon.addColorStop(0.6, toRgba(palette.horizonMid));
    horizon.addColorStop(1, toRgba(palette.horizonBottom));
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 0, width, height);
  }

  private drawAurora(time: number, palette: ThemePalette, alphaScale = 1) {
    const { ctx, canvas } = this;
    const { width, height } = canvas;

    const t = time * 0.00008;

    ctx.save();
    ctx.globalCompositeOperation = palette.auroraBlend;

    const bandHeight1 = height * 0.06;
    const baseY1 = height * 0.28 + Math.sin(t * 0.7) * height * 0.04;

    const aurora1 = ctx.createLinearGradient(0, baseY1 - bandHeight1, 0, baseY1 + bandHeight1);
    aurora1.addColorStop(0, toRgba(palette.auroraOneInner, alphaScale));
    aurora1.addColorStop(0.5, toRgba(palette.auroraOneMid, alphaScale));
    aurora1.addColorStop(1, toRgba(palette.auroraOneOuter, alphaScale));

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

    const bandHeight2 = height * 0.05;
    const baseY2 = height * 0.42 + Math.sin(t * 0.5 + 1.2) * height * 0.035;

    const aurora2 = ctx.createLinearGradient(0, baseY2 - bandHeight2, 0, baseY2 + bandHeight2);
    aurora2.addColorStop(0, toRgba(palette.auroraTwoInner, alphaScale));
    aurora2.addColorStop(0.5, toRgba(palette.auroraTwoMid, alphaScale));
    aurora2.addColorStop(1, toRgba(palette.auroraTwoOuter, alphaScale));

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

  private drawStars(time: number, palette: ThemePalette) {
    for (const star of this.stars) {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
      const opacity = star.opacity + twinkle * 0.12;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = toRgba(palette.star, Math.max(0, opacity));
      this.ctx.fill();
    }
  }

  private drawMeteors(palette: ThemePalette) {
    for (const m of this.meteors) {
      const dx = Math.cos(m.angle) * m.length;
      const dy = Math.sin(m.angle) * m.length;

      const gradient = this.ctx.createLinearGradient(m.x, m.y, m.x - dx, m.y - dy);
      gradient.addColorStop(0, toRgba(palette.meteorHead, m.opacity));
      gradient.addColorStop(0.25, toRgba(palette.meteorMid, m.opacity * 0.55));
      gradient.addColorStop(1, toRgba(palette.meteorTail));

      this.ctx.beginPath();
      this.ctx.moveTo(m.x, m.y);
      this.ctx.lineTo(m.x - dx, m.y - dy);
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = m.width;
      this.ctx.lineCap = "round";
      this.ctx.stroke();

      const glow = this.ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.width * 2.5);
      glow.addColorStop(0, toRgba(palette.glow, m.opacity * 0.7));
      glow.addColorStop(1, toRgba(palette.glow, 0));
      this.ctx.beginPath();
      this.ctx.arc(m.x, m.y, m.width * 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = glow;
      this.ctx.fill();
    }
  }

  private update(delta: number) {
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
    const { palette, progress } = this.getTransitionState(time);
    this.drawBackground(palette);

    if (progress === null) {
      this.drawAurora(time, palette);
    } else {
      this.drawAurora(time, this.paletteFrom, 1 - progress);
      this.drawAurora(time, this.paletteTo, progress);
    }

    this.drawStars(time, palette);
    this.drawMeteors(palette);
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
