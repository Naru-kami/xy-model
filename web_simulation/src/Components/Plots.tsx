import Plot from 'react-plotly.js';
import { useStore } from './Store';
import { useMemo } from 'react';

const config = {
  responsive: true,
  displaylogo: false,
  showTips: false,
  toImageButtonOptions: {
    format: 'svg',
    filename: 'image'
  }
} satisfies Partial<Plotly.Config>;

const getLayout = ({ isDark = true, ...restProps }: { isDark: boolean } & Partial<Plotly.Layout>) => ({
  xaxis: { title: { text: "$k_BT/J$" }, range: [-0.05, 2.05], mirror: true, ticks: 'outside', showline: true, showgrid: true, zeroline: false, color: isDark ? "#d4d4d6" : "#323232", gridcolor: "#8888", ...restProps.xaxis },
  yaxis: { mirror: true, ticks: 'outside', showline: true, showgrid: true, zeroline: false, color: isDark ? "#d4d4d6" : "#323232", rangemode: 'nonnegative', gridcolor: "#8888", ...restProps.yaxis },
  margin: { l: 65, r: 25, b: 70, t: 50, pad: 4 },
  showlegend: false,
  hovermode: "x",
  dragmode: false,
  hoverlabel: { bgcolor: "#d1d5e6" },
  plot_bgcolor: isDark ? "#2c2c34" : "#f9f9f9",
  paper_bgcolor: isDark ? "#2c2c34" : "#f9f9f9",
  width: 650,
  height: 370,
  title: { font: { color: isDark ? "#d4d4d6" : "#323232" }, ...(!restProps.title || typeof restProps.title === "string" ? {} : restProps.title) },
  modebar: { bgcolor: "#0000", color: isDark ? "#FFF6" : "#0006", activecolor: isDark ? "#d4d4d6" : "#323232" }
} satisfies Partial<Plotly.Layout>);

const traceconfig = {
  name: "",
  mode: "markers",
  line: {
    color: 'dodgerblue',
    width: 4
  },
  hovertemplate: "(x: %{x:.2f}, y: %{y:.2f})"
} satisfies Partial<Plotly.Data>;


function Magnetizaion() {
  const [isDark] = useStore(store => store.isDark);
  const [magnetization] = useStore(store => store.magnetization)

  const trace = useMemo(() => ({
    ...magnetization,
    ...traceconfig
  } satisfies Partial<Plotly.Data>), [magnetization]);

  const layout = useMemo(() => getLayout({
    title: { text: "Magnetization" },
    yaxis: { title: { text: "$\\langle M \\rangle/N$" }, range: [-0.05, 1.05] },
    isDark
  }), [isDark]);

  return (
    // @ts-expect-error
    <Plot.default
      data={[trace]}
      config={config}
      layout={layout}
      className="plot"
    />
  )
}

function Susceptibility() {
  const [isDark] = useStore(store => store.isDark);
  const [susceptibility] = useStore(store => store.susceptibility);

  const trace = useMemo(() => ({
    ...susceptibility,
    ...traceconfig
  } satisfies Partial<Plotly.Data>), [susceptibility]);

  const layout = useMemo(() => getLayout({
    title: "Susceptibility",
    yaxis: { title: "$\\chi$" },
    isDark
  }), [isDark]);

  return (
    // @ts-expect-error
    <Plot.default
      data={[trace]}
      config={config}
      layout={layout}
      className="plot"
    />
  )
}


export default function Plots() {
  return (<div>
    <Magnetizaion />
    <Susceptibility />
  </div>
  )
}
