import createFastContext from "./FastContext";

export type StoreType = {
  isPlaying: boolean,
  isDark: boolean,
  T: number,
  N: 32 | 64 | 128 | 256 | 512,
  magnetization: { x: number[], y: (number | null)[] },
  susceptibility: { x: number[], y: (number | null)[] },
  worker?: Worker,
}

const Store: StoreType = {
  isPlaying: false,
  isDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  T: 1,
  N: 32,
  magnetization: {
    x: Array.from({ length: 201 }, (_, i) => i * 0.01),
    y: new Array(201).fill(null),
  },
  susceptibility: {
    x: Array.from({ length: 201 }, (_, i) => i * 0.01),
    y: new Array(201).fill(null),
  },
}

const { Provider, useStore } = createFastContext(Store);

export { useStore };
export default Provider;