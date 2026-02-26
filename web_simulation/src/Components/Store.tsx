import createFastContext from "./FastContext";
import type { Observables } from "./Worker";

export type StoreType = {
  obs_label: Observables,
  isPlaying: boolean,
  isDark: boolean,
  T: number,
  N: 32 | 64 | 128 | 256 | 512,
  observable: { x: number[], y: (number | null)[] },
  variance: { x: number[], y: (number | null)[] },
  worker?: Worker,
}

const Store: StoreType = {
  obs_label: "Magnetization",
  isPlaying: false,
  isDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  T: 1,
  N: 32,
  observable: {
    x: Array.from({ length: 201 }, (_, i) => i * 0.01),
    y: new Array(201).fill(null),
  },
  variance: {
    x: Array.from({ length: 201 }, (_, i) => i * 0.01),
    y: new Array(201).fill(null),
  },
}

const { Provider, useStore } = createFastContext(Store);

export { useStore };
export default Provider;