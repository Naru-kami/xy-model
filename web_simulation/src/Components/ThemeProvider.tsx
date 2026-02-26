import React, { useLayoutEffect } from 'react'
import { useStore } from './Store';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [_, setStore] = useStore(store => store.isDark);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", (evt) => setStore(p => ({ ...p, isDark: evt.matches })));
  }, []);

  return children
}
