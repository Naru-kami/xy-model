import React, { useCallback, useId, useState } from 'react'
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
  const [isPlaying, setStore] = useStore(store => store.isPlaying);
  const [worker] = useStore(store => store.worker);

  const handlePlay = useCallback(() => {
    isPlaying ? worker?.postMessage([{
      method: "pause",
    }] satisfies MessageToWorker) : worker?.postMessage([{
      method: "play",
    }] satisfies MessageToWorker);

    setStore(p => ({ ...p, isPlaying: !p.isPlaying }));
  }, [worker, isPlaying]);

  const handleStep = useCallback(() => {
    setStore(p => ({ ...p, isPlaying: false }));
    worker?.postMessage([
      { method: "pause" },
      { method: "step" },
      { method: "render" },
    ] satisfies MessageToWorker);
  }, [worker]);

  const handleReset = useCallback(() => {
    setStore(p => ({ ...p, isPlaying: false }));
    worker?.postMessage([
      { method: "pause" },
      { method: "initializeData" },
      { method: "render" },
    ] satisfies MessageToWorker);
  }, [worker]);

  const handleSweep = useCallback(() => {
    if (isPlaying) {
      worker?.postMessage([{
        method: "pause",
      }] satisfies MessageToWorker)
      setStore(p => ({ ...p, isPlaying: false }));
    } else {
      setStore(p => ({ ...p, isPlaying: true }));

      setStore(p => {
        p.worker?.postMessage([
          { method: "pause" },
          { method: "initializeData" },
          { method: "sweep" }
        ] satisfies MessageToWorker)

        return { ...p, T: 2 }
      })
    }
  }, [worker, isPlaying]);

  return (
    <div className="btn-group">
      <button className={`btn ${isPlaying ? "stop" : "start"}`} onClick={handlePlay}>{isPlaying ? "Stop" : "Start"}</button>
      <button className="btn step" onClick={handleSweep}>Sweep</button>
      <button className="btn step" onClick={handleStep}>Step</button>
      <button className="btn reset" onClick={handleReset}>Reset</button>
    </div>
  )
}

type MCMethods = "Metropolis" | "SwendsenWang" | "Wolff";

function MethodSelect() {
  const [worker] = useStore(store => store.worker)
  const [method, setMethod] = useState<MCMethods>("Metropolis");

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if ("Metropolis" === e.target.value || "SwendsenWang" === e.target.value || "Wolff" === e.target.value) {
      setMethod(e.target.value);
      worker?.postMessage([{
        method: "setStep",
        parameters: [e.target.value]
      }] satisfies MessageToWorker);
    }
  }, [worker]);

  return <select className="step-method" value={method} onChange={handleChange}>
    <option value="Metropolis">Metropolis Algorithm</option>
    <option value="SwendsenWang">SwendsenWang Algorithm</option>
    <option value="Wolff">Wolff Algorithm</option>
  </select>
}

export default function Controls() {
  return (
    <div className='controls'>
      <Colorwheel />
      <Sliders />
      <MethodSelect />
      <Buttons />
    </div>
  )
}
