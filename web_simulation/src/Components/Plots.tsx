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
  xaxis: { title: { text: "$T$" }, range: [-0.05, 2.05], mirror: true, ticks: 'outside', showline: true, showgrid: true, zeroline: false, color: isDark ? "#d4d4d6" : "#323232", gridcolor: "#8888", ...restProps.xaxis },
  yaxis: { mirror: true, ticks: 'outside', showline: true, showgrid: true, zeroline: false, color: isDark ? "#d4d4d6" : "#323232", rangemode: 'nonnegative', gridcolor: "#8888", ...restProps.yaxis },
  margin: { l: 65, r: 25, b: 70, t: 50, pad: 4 },
  showlegend: false,
  hovermode: "x",
  dragmode: false,
  hoverlabel: { bgcolor: "#d1d5e6" },
  plot_bgcolor: isDark ? "#2c2c34" : "#f9f9f9",
  paper_bgcolor: isDark ? "#2c2c34" : "#f9f9f9",
  width: 650,
  height: 372,
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
  hovertemplate: "(x: %{x:.2f}, y: %{y:.3g})"
} satisfies Partial<Plotly.Data>;


function AverageObs() {
  const [isDark] = useStore(store => store.isDark);
  const [obs_data] = useStore(store => store.observable);
  const [obs_label] = useStore(store => store.obs_label);

  const trace = useMemo(() => ({
    ...obs_data,
    ...traceconfig
  } satisfies Partial<Plotly.Data>), [obs_data]);

  const layout = useMemo(() => getLayout({
    title: { text: obs_label },
    yaxis: { title: { text: `$\\langle ${obs_label === "Magnetization" ? "M" : "E"} \\rangle/N$` }, range: obs_label === "Magnetization" ? [-0.05, 1.05] : [-2.05, 0.05] },
    isDark
  }), [isDark, obs_label]);

  return (
    <Plot
      data={[trace]}
      config={config}
      layout={layout}
      className="plot"
    />
  )
}

function VarianceObs() {
  const [isDark] = useStore(store => store.isDark);
  const [var_data] = useStore(store => store.variance);
  const [obs_label] = useStore(store => store.obs_label);

  const trace = useMemo(() => ({
    ...var_data,
    ...traceconfig
  } satisfies Partial<Plotly.Data>), [var_data]);

  const layout = useMemo(() => getLayout({
    title: { text: obs_label === "Magnetization" ? "Susceptibility" : "Specific Heat" },
    yaxis: { title: obs_label === "Magnetization" ? "$\\chi$" : "$c$" },
    isDark
  }), [isDark, obs_label]);

  return (
    <Plot
      data={[trace]}
      config={config}
      layout={layout}
      className="plot"
    />
  )
}


export default function Plots() {
  return (<div>
    <AverageObs />
    <VarianceObs />
  </div>
  )
}
