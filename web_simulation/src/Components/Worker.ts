type PropertyNames = NonNullable<{
  [K in keyof Data]: Data[K] extends (...args: any) => any ? never : K
}[keyof Data]>;

type MethodNames = NonNullable<{
  [K in keyof Data]: Data[K] extends (...args: any) => any ? K : never
}[keyof Data]>;

type DataMethodParameters = {
  [K in MethodNames]: Data[K] extends (...args: infer P) => any ? P : never
};

type CanvasInit = {
  canvas: OffscreenCanvas
  width: number
  height: number
};

type MethodMessage = {
  [K in MethodNames]: DataMethodParameters[K] extends []
  ? { method: K; parameters?: DataMethodParameters[K] }
  : (undefined extends DataMethodParameters[K][0]
    ? { method: K; parameters?: DataMethodParameters[K] }
    : { method: K; parameters: DataMethodParameters[K] })
}[MethodNames];

type PropertyMessage = {
  [K in PropertyNames]: { property: K; value: Data[K] }
}[PropertyNames];


export type MessageToWorker = (CanvasInit | MethodMessage | PropertyMessage)[];
export type MessageFromWorker = {
  magnetization?: (number | null)[],
  susceptibility?: (number | null)[]
}

var CanvasData: Data | undefined;

self.onmessage = function (e: MessageEvent<MessageToWorker>) {
  const { data } = e;

  for (const instruction of data) {

    if ('canvas' in instruction) {
      const ctx = instruction.canvas.getContext("2d");
      if (ctx) ctx.imageSmoothingEnabled = false;

      CanvasData = new Data(instruction.canvas, instruction.width, instruction.height);
      CanvasData.initializeData();
      CanvasData.render();
      continue;
    }

    if (!CanvasData) continue;

    if ('method' in instruction) {
      // @ts-expect-error
      CanvasData[instruction.method].apply(CanvasData, instruction.parameters ?? []);
      continue;
    }

    if ('property' in instruction) {
      // @ts-expect-error
      CanvasData[instruction.property] = instruction.value;
      continue;
    }

  }
};

class Data {
  // Canvas and rendering
  #viewport: OffscreenCanvas;
  #canvas: OffscreenCanvas;
  #pixelData: ImageData;
  #rAF?: number;
  #lastCalc: number;

  // Spin data
  #spins: Float64Array;
  #m: (number | null)[];
  #m2: (number | null)[];
  #chi: (number | null)[];
  #len: Uint32Array;

  // overwritables
  record: boolean;
  beta: number;
  step: Data["Metropolis" | "SwendsenWang" | "Wolff"];

  constructor(viewport: OffscreenCanvas, width: number, height: number) {
    this.#viewport = viewport;
    this.#canvas = new OffscreenCanvas(width, height);
    this.#pixelData = new ImageData(width, height);
    this.#lastCalc = 0;

    this.#spins = new Float64Array(width * height);
    this.#m = new Array(width * height).fill(null);
    this.#m2 = new Array(width * height).fill(null);
    this.#chi = new Array(width * height).fill(null);
    this.#len = new Uint32Array(width * height);

    this.record = true;
    this.beta = 1;
    this.step = this.Metropolis;
  }

  resize(width: number, height: number) {
    this.#canvas.width = width;
    this.#canvas.height = height;

    this.#pixelData = new ImageData(width, height);

    this.#spins = new Float64Array(width * height);
    this.#m = new Array(width * height).fill(null);
    this.#m2 = new Array(width * height).fill(null);
    this.#chi = new Array(width * height).fill(null);
    this.#len = new Uint32Array(width * height);
  }

  initializeData() {
    for (let y = 0; y < this.#pixelData.height; y++) {
      for (let x = 0; x < this.#pixelData.width; x++) {
        this.#spins[y * this.#pixelData.width + x] = 2 * Math.PI * Math.random();
        this.#m[y * this.#pixelData.width + x] = null;
        this.#m2[y * this.#pixelData.width + x] = null;
        this.#chi[y * this.#pixelData.width + x] = null;
        this.#len[y * this.#pixelData.width + x] = 0;
      }
    }
    self.postMessage?.({
      magnetization: this.#m,
      susceptibility: this.#chi,
    } satisfies MessageFromWorker)
  }

  play() {
    this.#rAF = requestAnimationFrame((time) => {
      this.step();
      if (this.record) {
        const M = this.magnetization();
        const idx = Math.round(100 / this.beta);

        this.#m[idx] = (this.#m[idx] ?? 0) + M;
        this.#m2[idx] = (this.#m2[idx] ?? 0) + M * M;
        this.#len[idx]++;
        this.#chi[idx] = (this.#m2[idx] / this.#len[idx] - (this.#m[idx] / this.#len[idx]) ** 2) * this.beta;

        if (time - this.#lastCalc > 500) {
          this.#lastCalc = time;
          self.postMessage?.({
            magnetization: this.#m.map((e, i) => e && e / this.#len[i]),
            susceptibility: this.#chi,
          } satisfies MessageFromWorker)
        }
      }
      this.render();
      this.play();
    });
  }

  pause() {
    this.#rAF && cancelAnimationFrame(this.#rAF);
    this.#rAF = undefined;

    self.postMessage?.({
      magnetization: this.#m.map((e, i) => e && e / this.#len[i]),
      susceptibility: this.#chi,
    } satisfies MessageFromWorker)
  }

  magnetization() {
    let sumX = 0, sumY = 0;
    for (let i = 0; i < this.#spins.length; i++) {
      sumX += Math.cos(this.#spins[i]);
      sumY += Math.sin(this.#spins[i]);
    }
    return Math.hypot(sumX, sumY) / this.#spins.length;
  }

  Metropolis() {
    const width = this.#pixelData.width;
    const height = this.#pixelData.height;

    let energy_now: number, energy_after: number, delta: number;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        energy_now = -(
          Math.cos(this.#spins[y * width + x] - this.#spins[y * width + ((x + 1) % width)]) +
          Math.cos(this.#spins[y * width + x] - this.#spins[y * width + ((x - 1 + width) % width)]) +
          Math.cos(this.#spins[y * width + x] - this.#spins[((y + 1) % height) * width + x]) +
          Math.cos(this.#spins[y * width + x] - this.#spins[((y - 1 + height) % height) * width + x])
        );

        delta = 2 * Math.PI * Math.random();
        energy_after = -(
          Math.cos(this.#spins[y * width + x] + delta - this.#spins[y * width + ((x + 1) % width)]) +
          Math.cos(this.#spins[y * width + x] + delta - this.#spins[y * width + ((x - 1 + width) % width)]) +
          Math.cos(this.#spins[y * width + x] + delta - this.#spins[((y + 1) % height) * width + x]) +
          Math.cos(this.#spins[y * width + x] + delta - this.#spins[((y - 1 + height) % height) * width + x])
        );

        if (energy_after < energy_now || Math.random() < Math.exp(-this.beta * (energy_after - energy_now))) {
          this.#spins[y * width + x] = (this.#spins[y * width + x] + delta + 2 * Math.PI) % (2 * Math.PI);
        }
      }
    }
  }

  SwendsenWang() {

  }

  Wolff() {

  }

  render() {
    if (!this.#viewport) return;

    const width = this.#pixelData.width;
    const height = this.#pixelData.height;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const [r, g, b] = hslToRgb(this.#spins[y * width + x])
        this.#pixelData.data[(y * width + x) * 4 + 0] = r * 255;
        this.#pixelData.data[(y * width + x) * 4 + 1] = g * 255;
        this.#pixelData.data[(y * width + x) * 4 + 2] = b * 255;
        this.#pixelData.data[(y * width + x) * 4 + 3] = 255;
      }
    }
    this.#canvas.getContext("2d")?.putImageData(this.#pixelData, 0, 0);

    const M = new DOMMatrix().translateSelf(256, 256).scaleSelf(512 / width, 512 / height);
    const ctx = this.#viewport.getContext("2d");
    ctx?.setTransform(M);
    ctx?.drawImage(this.#canvas, -width / 2, -height / 2);
  }
}

/** Taken from [Stackoverflow](https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion). */
function hslToRgb(h: number, s = 1, l = 0.5) {
  h *= 180 / Math.PI;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  return [f(0), f(8), f(4)];
}