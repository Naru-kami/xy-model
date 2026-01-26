import 'katex/dist/katex.min.css';
import Controls from "./Components/Controls";
import Canvas from "./Components/Canvas";
import Provider from "./Components/Store";
import Plots from './Components/Plots';
import ThemeProvider from './Components/ThemeProvider';

export default function App() {
  return (
    <Provider>
      <ThemeProvider>
        <div className="app">
          <div>
            <Controls />
            <Canvas />
          </div>
          <Plots />
        </div>
      </ThemeProvider>
    </Provider>
  )
}
