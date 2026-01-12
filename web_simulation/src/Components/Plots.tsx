import Plot from 'react-plotly.js';

const config = {
  responsive: true,
  displaylogo: false,
  showTips: false,
  toImageButtonOptions: {
    format: 'svg',
    filename: 'image'
  }
} satisfies Partial<Plotly.Config>;

const layout = {
  xaxis: { title: { text: "k_B T / J" }, mirror: true, ticks: 'outside', showline: true, showgrid: true, zeroline: false, color: "#FFF" },
  yaxis: { title: { text: "" }, range: [0, 102], mirror: true, ticks: 'outside', tick0: 0, showline: true, showgrid: true, showticksuffix: 'all', ticksuffix: "%", zeroline: false, color: "#FFF", rangemode: 'nonnegative' },
  margin: { l: 55, r: 25, b: 70, t: 50, pad: 4 },
  showlegend: false,
  hovermode: "x",
  dragmode: false,
  hoverlabel: { bgcolor: "#181c2d" },
  plot_bgcolor: "#AAA1",
  paper_bgcolor: "#AAA1",
  width: 650,
  height: 350,
  title: {text: "Magnetization", font: {color: "#FFF"}}
} satisfies Partial<Plotly.Layout>;

const traceconfig = {
  name: "",
  mode: 'lines',
  fill: 'tozeroy',
  fillcolor: '#3472D540',
  line: {
    color: '#3472D5',
    width: 2
  },
  hovertemplate: "<b> %{y:.2f}% <br> %{x:.0f} <br>"
} satisfies Partial<Plotly.Data>;

const trace = {
  x: [1, 2, 3],
  y: [1, 4, 9],
  ...traceconfig
} satisfies Partial<Plotly.Data>;


export default function Plots() {
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
