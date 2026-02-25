import type { StoreType } from "./Store";

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

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer R> ? Array<RecursivePartial<R>> : RecursivePartial<T[P]>
}

export type StepMethods = "Metropolis" | "Wolff";
export type Observables = "Magnetization" | "Energy";
export type MessageToWorker = (CanvasInit | MethodMessage | PropertyMessage)[];
export type MessageFromWorker = RecursivePartial<Omit<StoreType, "worker">>

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
  #palette: Uint8Array = new Uint8Array(4608); // 6 permutations for 3 * 8-bit colors => 6 * 256 * 3 = 4608

  // Spin data
  #spins: Float64Array;
  #obs: Float64Array;
  #obs2: Float64Array;
  #varObs: Float64Array;
  #len: Uint32Array;

  // overwritables
  record: boolean;
  T: number;
  #varObsPower = 1;
  step: Data[StepMethods];
  obs: Data[Observables];

  constructor(viewport: OffscreenCanvas, width: number, height: number) {
    this.#viewport = viewport;
    this.#canvas = new OffscreenCanvas(width, height);
    this.#pixelData = new ImageData(width, height);

    this.#spins = new Float64Array(width * height);
    this.#obs = new Float64Array(width * height);
    this.#obs2 = new Float64Array(width * height);
    this.#varObs = new Float64Array(width * height);
    this.#len = new Uint32Array(width * height);

    for (let i = 0; i < this.#spins.length; i++) {
      this.#pixelData.data[i * 4 + 3] = 255;
    }

    this.record = true;
    this.T = 1;
    this.step = this.Metropolis;
    this.obs = this.Magnetization;

    this.#buildPalette();

    const M = new DOMMatrix().translateSelf(256, 256).scaleSelf(512 / width, 512 / height);
    const ctx = this.#viewport.getContext("2d");
    ctx?.setTransform(M);
  }

  setStep(method: StepMethods) {
    this.step = this[method];
  }

  setObs(obs: Observables) {
    this.obs = this[obs];
    this.#varObsPower = obs === "Magnetization" ? 1 : 2;

    const width = this.#pixelData.width;
    const height = this.#pixelData.height;

    this.#obs = new Float64Array(width * height);
    this.#obs2 = new Float64Array(width * height);
    this.#varObs = new Float64Array(width * height);
    this.#len = new Uint32Array(width * height);

    self.postMessage?.({
      observable: { y: new Array(this.#obs.length).fill(null) },
      variance: { y: new Array(this.#varObs.length).fill(null) },
    } satisfies MessageFromWorker)
  }

  resize(width: number, height: number) {
    this.#canvas.width = width;
    this.#canvas.height = height;

    const M = new DOMMatrix().translateSelf(256, 256).scaleSelf(512 / width, 512 / height);
    const ctx = this.#viewport.getContext("2d");
    ctx?.setTransform(M);

    this.#pixelData = new ImageData(width, height);

    this.#spins = new Float64Array(width * height);
    this.#obs = new Float64Array(width * height);
    this.#obs2 = new Float64Array(width * height);
    this.#varObs = new Float64Array(width * height);
    this.#len = new Uint32Array(width * height);

    for (let i = 0; i < this.#spins.length; i++) {
      this.#pixelData.data[i * 4 + 3] = 255;
    }
  }

  initializeData() {
    for (let y = 0; y < this.#pixelData.height; y++) {
      for (let x = 0; x < this.#pixelData.width; x++) {
        this.#spins[y * this.#pixelData.width + x] = 2 * Math.PI * Math.random();

        this.#obs[y * this.#pixelData.width + x] = 0;
        this.#obs2[y * this.#pixelData.width + x] = 0;
        this.#varObs[y * this.#pixelData.width + x] = 0;
        this.#len[y * this.#pixelData.width + x] = 0;
      }
    }
    self.postMessage?.({
      observable: { y: new Array(this.#obs.length).fill(null) },
      variance: { y: new Array(this.#varObs.length).fill(null) },
    } satisfies MessageFromWorker)
  }

  initializeDataAligned() {
    const angle = Math.random() * 2 * Math.PI;
    for (let y = 0; y < this.#pixelData.height; y++) {
      for (let x = 0; x < this.#pixelData.width; x++) {
        this.#spins[y * this.#pixelData.width + x] = angle;

        this.#obs[y * this.#pixelData.width + x] = 0;
        this.#obs2[y * this.#pixelData.width + x] = 0;
        this.#varObs[y * this.#pixelData.width + x] = 0;
        this.#len[y * this.#pixelData.width + x] = 0;
      }
    }
    self.postMessage?.({
      observable: { y: new Array(this.#obs.length).fill(null) },
      variance: { y: new Array(this.#varObs.length).fill(null) },
    } satisfies MessageFromWorker)
  }

  #buildPalette() {
    for (let i = 0; i < 1536; i++) {
      const h = (i + 0.5) / 1536 * 2 * Math.PI;
      const [r, g, b] = hslToRgb(h);
      this.#palette[i * 3 + 0] = Math.round(r * 255);
      this.#palette[i * 3 + 1] = Math.round(g * 255);
      this.#palette[i * 3 + 2] = Math.round(b * 255);
    }
  }

  burnIn() {
    for (let i = 0; i < 10; i++) {
      this.step();
    }
  }

  play(lastTime = 0) {
    this.#rAF = requestAnimationFrame((time) => {
      this.step();
      if (this.record) {
        this.recordData();

        if (time - lastTime > 500) {
          lastTime = time;
          self.postMessage?.({
            T: Math.round(100 * this.T) / 100,
            observable: { y: Array.from(this.#obs).map((e, i) => this.#len[i] == 0 || e == 0 ? null : e / this.#len[i]) },
            variance: { y: Array.from(this.#varObs).map((e) => e ? e : null) },
          } satisfies MessageFromWorker)
        }
      }
      this.render();
      this.play(lastTime);
    });
  }

  pause() {
    this.#rAF && cancelAnimationFrame(this.#rAF);
    this.#rAF = undefined;

    self.postMessage?.({
      observable: { y: Array.from(this.#obs).map((e, i) => this.#len[i] == 0 || e == 0 ? null : e / this.#len[i]) },
      variance: { y: Array.from(this.#varObs).map((e) => e ? e : null) },
    } satisfies MessageFromWorker)
  }

  sweep(lastTime = performance.now()) {
    if (this.T > 2) {
      this.T = 2;
      self.postMessage?.({
        T: this.T,
        isPlaying: false,
        observable: { y: Array.from(this.#obs).map((e, i) => this.#len[i] == 0 || e == 0 ? null : e / this.#len[i]) },
        variance: { y: Array.from(this.#varObs).map((e) => e ? e : null) },
      } satisfies MessageFromWorker)

      this.#rAF && cancelAnimationFrame(this.#rAF);
      this.#rAF = undefined;
      return
    }

    this.#rAF = requestAnimationFrame(currentTime => {
      for (let i = 0; i < 20; i++) {
        this.step()
        this.recordData();
      }

      if (currentTime - lastTime > 500) {
        self.postMessage?.({
          T: this.T,
          observable: { y: Array.from(this.#obs).map((e, i) => this.#len[i] == 0 || e == 0 ? null : e / this.#len[i]) },
          variance: { y: Array.from(this.#varObs).map((e) => e ? e : null) },
        } satisfies MessageFromWorker)
        this.render();

        this.T = Math.round(100 * this.T + 1) / 100;
        lastTime = currentTime;

        this.burnIn();
      }

      this.sweep(lastTime);
    })
  }

  recordData() {
    const O = this.obs();
    const idx = Math.round(100 * this.T);

    this.#obs[idx] += O;
    this.#obs2[idx] += O * O;
    this.#len[idx]++;
    this.#varObs[idx] = (this.#obs2[idx] / this.#len[idx] - (this.#obs[idx] / this.#len[idx]) ** 2) * this.#spins.length / (this.T ** this.#varObsPower);
  }

  Magnetization() {
    let sumX = 0, sumY = 0;
    for (let i = 0; i < this.#spins.length; i++) {
      sumX += Math.cos(this.#spins[i]);
      sumY += Math.sin(this.#spins[i]);
    }
    return Math.hypot(sumX, sumY) / this.#spins.length;
  }

  Energy() {
    const width = this.#pixelData.width;
    const height = this.#pixelData.height;
    let sum = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        sum -=
          Math.cos(this.#spins[y * width + x] - this.#spins[y * width + ((x + 1) % width)]) +
          Math.cos(this.#spins[y * width + x] - this.#spins[y * width + ((x - 1 + width) % width)]) +
          Math.cos(this.#spins[y * width + x] - this.#spins[((y + 1) % height) * width + x]) +
          Math.cos(this.#spins[y * width + x] - this.#spins[((y - 1 + height) % height) * width + x]);
      }
    }
    return sum / 2 / this.#spins.length;
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

        if (energy_after < energy_now || Math.random() < Math.exp(-(energy_after - energy_now) / this.T)) {
          this.#spins[y * width + x] = (this.#spins[y * width + x] + delta + 2 * Math.PI) % (2 * Math.PI);
        }
      }
    }
  }

  Wolff() {
    const width = this.#pixelData.width;
    const height = this.#pixelData.height;

    const stack = new Set<number>();
    const cluster = new Set<number>();

    let neighbors = new Uint32Array(4),
      flippedSpins = 0, i = 0,
      x: number, y: number;

    do {
      let r = Math.random() * 2 * Math.PI;
      cluster.clear();
      stack.clear();
      stack.add(Math.floor(Math.random() * height) * width + Math.floor(Math.random() * width))

      for (const s of stack.values()) {
        this.#spins[s] = (2 * r - this.#spins[s] + 3 * Math.PI) % (2 * Math.PI);
        x = s % width;
        y = Math.floor(s / width);

        neighbors[0] = ((y - 1 + height) % height) * width + x;  // top
        neighbors[1] = y * width + ((x + 1) % width);            // right
        neighbors[2] = ((y + 1) % height) * width + x;           // bottom
        neighbors[3] = y * width + ((x - 1 + width) % width);    // left

        for (const neighbor of neighbors) {
          if (
            !cluster.has(neighbor) &&
            !stack.has(neighbor) &&
            (Math.random() < 1 - Math.exp(Math.min(0, 2 / this.T * Math.cos(r - this.#spins[s]) * Math.cos(r - this.#spins[neighbor]))))
          ) {
            stack.add(neighbor);
          }
        }

        cluster.add(s);
        stack.delete(s)
      }
      i++;
      flippedSpins += cluster.size;
      // Attempt to flip Nx*Ny spin in total.
      // If next cluster would exceed it, exit.
    } while (flippedSpins * (1 + 1 / i) < this.#spins.length);
  }

  render() {
    if (!this.#viewport) return;

    const width = this.#pixelData.width;
    const height = this.#pixelData.height;
    const scale = 1536 / (2 * Math.PI);
    let idx: number;

    for (let i = 0; i < this.#spins.length; i++) {
      idx = Math.floor(this.#spins[i] * scale) * 3;

      this.#pixelData.data[i * 4 + 0] = this.#palette[idx + 0];
      this.#pixelData.data[i * 4 + 1] = this.#palette[idx + 1];
      this.#pixelData.data[i * 4 + 2] = this.#palette[idx + 2];
    }
    this.#canvas.getContext("2d")?.putImageData(this.#pixelData, 0, 0);

    const ctx = this.#viewport.getContext("2d");
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