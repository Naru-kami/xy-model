import { useCallback, useId, useRef, useState } from 'react'
import { useStore } from './Store';
import Colorwheel from './Colorwheel';
import { InlineMath } from 'react-katex';
import type { MessageToWorker } from './Worker';

const sizes = {
  1: 32,
  2: 64,
  3: 128,
  4: 256,
  5: 512,
} as const;

const keys = {
  32: 1,
  64: 2,
  128: 3,
  256: 4,
  512: 5,
} as const;

function Sliders() {
  const [T, setStore] = useStore(store => store.T);
  const [N] = useStore(store => store.N);

  const id1 = useId();
  const id2 = useId();

  const handleTcChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStore(p => {
      p.worker?.postMessage([{
        property: "beta",
        value: 1 / Number(e.target.value),
      }] satisfies MessageToWorker)

      return {
        ...p,
        T: Number(e.target.value)
      }
    })
  }, []);

  const handleNChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStore(p => {
      const val = Number(e.target.value);
      if (!(val in sizes)) return p;

      p.worker?.postMessage([
        {
          method: "resize",
          parameters: [sizes[val as keyof typeof sizes], sizes[val as keyof typeof sizes]]
        },
        { method: "initializeData" },
        { method: "render" },
      ] satisfies MessageToWorker)

      return {
        ...p,
        N: sizes[val as keyof typeof sizes],
      }
    })
  }, []);


  return <div className="input-sliders">
    <div className="input-wrapper">
      <label htmlFor={id2}>
        <InlineMath math="N" />: {N}
      </label>
      <input
        type="range"
        id={id2}
        value={keys[N]}
        onChange={handleNChange}
        min={1}
        max={5}
        step={1}
        list="steplist"
      />
      <datalist id="steplist">
        <option>1</option>
        <option>2</option>
        <option>3</option>
        <option>4</option>
        <option>5</option>
      </datalist>
    </div>
    <div className="input-wrapper">
      <label htmlFor={id1}>
        <InlineMath math="k_BT/J" />: {T}
      </label>
      <input
        type="range"
        id={id1}
        value={T}
        onChange={handleTcChange}
        min={0}
        max={2}
        step={0.01}
      />
    </div>
  </div>
}

function Buttons() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [worker, setStore] = useStore(store => store.worker);

  const timer = useRef<number>(null);

  const handlePlay = useCallback(() => {
    isPlaying ? worker?.postMessage([{
      method: "pause",
    }] satisfies MessageToWorker) : worker?.postMessage([{
      method: "play",
    }] satisfies MessageToWorker);

    setIsPlaying(p => !p);
  }, [worker, isPlaying]);

  const handleStep = useCallback(() => {
    setIsPlaying(false)
    worker?.postMessage([
      { method: "pause" },
      { method: "step" },
      { method: "render" },
    ] satisfies MessageToWorker);
  }, [worker]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    worker?.postMessage([
      { method: "pause" },
      { method: "initializeData" },
      { method: "render" },
    ] satisfies MessageToWorker);
  }, [worker]);

  const handleSweep = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;

      worker?.postMessage([{
        method: "pause",
      }] satisfies MessageToWorker)
      setIsPlaying(false);
    } else {
      setIsPlaying(true);

      setStore(p => {
        p.worker?.postMessage([
          {
            property: "beta",
            value: 1 / 2,
          }, {
            method: "play",
          }
        ] satisfies MessageToWorker)

        return { ...p, T: 2 }
      })

      timer.current = setInterval(() => {
        setStore(p => {
          const T = Math.round(Math.max(0, Math.min(p.T - 0.01, 2)) * 100) / 100
          p.worker?.postMessage([{
            property: "beta",
            value: 1 / T,
          }] satisfies MessageToWorker)

          return { ...p, T }
        })
      }, 15000);

    }
  }, [worker]);

  return (
    <div className="input-buttons">
      <button className={`btn ${isPlaying ? "stop" : "start"}`} onClick={handlePlay}>{isPlaying ? "Stop" : "Start"}</button>
      <button className="btn step" onClick={handleStep}>Step</button>
      <button className="btn reset" onClick={handleReset}>Reset</button>
      <button className="btn step" onClick={handleSweep}>Sweep</button>
    </div>
  )
}

export default function Controls() {
  return (
    <div className='controls'>
      <Colorwheel />
      <Sliders />
      <Buttons />
    </div>
  )
}
