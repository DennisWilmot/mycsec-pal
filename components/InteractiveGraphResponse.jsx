'use client';

import { RotateCcw, Trash2 } from 'lucide-react';

const left = 58; const right = 552; const top = 30; const bottom = 300;
const px = (value, domain) => left + ((value - domain[0]) / (domain[1] - domain[0])) * (right - left);
const py = (value, domain) => bottom - ((value - domain[0]) / (domain[1] - domain[0])) * (bottom - top);

export default function InteractiveGraphResponse({ spec, points = [], onChange }) {
  const xDomain = spec.xDomain || [0, 10];
  const yDomain = spec.yDomain || [0, 10];
  const xTicks = spec.xTicks || Array.from({ length: 11 }, (_, index) => xDomain[0] + ((xDomain[1] - xDomain[0]) * index) / 10);
  const yTicks = spec.yTicks || Array.from({ length: 11 }, (_, index) => yDomain[0] + ((yDomain[1] - yDomain[0]) * index) / 10);
  const ordered = [...points].sort((a, b) => a.x - b.x);
  const path = ordered.map((point, index) => `${index ? 'L' : 'M'} ${px(point.x, xDomain)} ${py(point.y, yDomain)}`).join(' ');

  const plot = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - bounds.left) / bounds.width) * 600;
    const viewY = ((event.clientY - bounds.top) / bounds.height) * 370;
    if (viewX < left || viewX > right || viewY < top || viewY > bottom) return;
    const rawX = xDomain[0] + ((viewX - left) / (right - left)) * (xDomain[1] - xDomain[0]);
    const rawY = yDomain[1] - ((viewY - top) / (bottom - top)) * (yDomain[1] - yDomain[0]);
    const x = Math.round(rawX / (spec.xSnap || 1)) * (spec.xSnap || 1);
    const y = Math.round(rawY / (spec.ySnap || 1)) * (spec.ySnap || 1);
    onChange([...points.filter((point) => point.x !== x), { x, y }]);
  };

  return <div className="interactive-graph-response">
    <div className="graph-instructions"><span>Click the grid to plot each point. Points are joined automatically.</span><div><button type="button" disabled={!points.length} onClick={() => onChange(points.slice(0, -1))}><RotateCcw size={15} />Undo</button><button type="button" disabled={!points.length} onClick={() => onChange([])}><Trash2 size={15} />Clear</button></div></div>
    <svg className="question-svg interactive-question-svg" viewBox="0 0 600 370" role="application" aria-label="Interactive coordinate graph" onClick={plot}>
      {xTicks.map((value, index) => <g key={`x-${index}`}><line className="diagram-grid" x1={px(value, xDomain)} y1={top} x2={px(value, xDomain)} y2={bottom} /><text className="diagram-tick" x={px(value, xDomain)} y="318" textAnchor="middle">{value}</text></g>)}
      {yTicks.map((value, index) => <g key={`y-${index}`}><line className="diagram-grid" x1={left} y1={py(value, yDomain)} x2={right} y2={py(value, yDomain)} /><text className="diagram-tick" x="49" y={py(value, yDomain)+4} textAnchor="end">{value}</text></g>)}
      <line className="diagram-axis" x1={left} y1={bottom} x2={560} y2={bottom} /><line className="diagram-axis" x1={left} y1={310} x2={left} y2={25} />
      {path && <path className="student-graph-curve" d={path} />}
      {ordered.map((point) => <g key={`${point.x}-${point.y}`}><circle className="student-graph-point" cx={px(point.x, xDomain)} cy={py(point.y, yDomain)} r="6" /><text className="student-point-label" x={px(point.x, xDomain) + 8} y={py(point.y, yDomain) - 8}>{point.x}, {point.y}</text></g>)}
      <text className="diagram-label graph-axis-title" x="305" y="355" textAnchor="middle">{spec.axisLabels?.[0] || 'x'}</text><text className="diagram-label graph-y-axis-title" x="66" y="20">{spec.axisLabels?.[1] || 'y'}</text>
    </svg>
    <p className="plotted-points-summary">{points.length ? `Plotted: ${ordered.map((point) => `(${point.x}, ${point.y})`).join(' · ')}` : 'No points plotted yet.'}</p>
  </div>;
}
