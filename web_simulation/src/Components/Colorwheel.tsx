import { InlineMath } from 'react-katex';

export default function Colorwheel() {
  return <div className="color-wheel">
    <div className="gradient-wheel"></div>
    <span className="right"><InlineMath math="0\pi" /></span>
    <span className="top"><InlineMath math="\frac{\pi}{2}" /></span>
    <span className="left"><InlineMath math="\pi" /></span>
    <span className="bottom"><InlineMath math="\frac{3\pi}{2}" /></span>
  </div>
}
