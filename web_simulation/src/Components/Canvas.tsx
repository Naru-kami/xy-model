import { useEffect, useRef } from "react"
import { useStore } from "./Store";
import type { MessageFromWorker, MessageToWorker } from "./Worker";

export default function Canvas() {
  const [_, setStore] = useStore(store => store.worker)
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setStore(p => {
      if (!ref.current || p.worker) return p;

      const offscreen = ref.current!.transferControlToOffscreen();

      p.worker = new Worker(new URL("./Worker.ts", import.meta.url), { type: "module" });

      p.worker.postMessage([{
        canvas: offscreen,
        width: p.N,
        height: p.N,
      }] satisfies MessageToWorker, [offscreen]);

      p.worker.onmessage = (e: MessageEvent<MessageFromWorker>) => {
        const { magnetization, susceptibility } = e.data;
        setStore(p => {
          if (magnetization) {
            p.magnetization.y = magnetization;
          }
          if (susceptibility) {
            p.susceptibility.y = susceptibility;
          }
          return {
            ...p,
            magnetization: { ...p.magnetization },
            susceptibility: { ...p.susceptibility }
          }
        })
      }

      return { ...p }
    })
  }, []);

  return <canvas ref={ref} width={512} height={512} />
}
