'use client';

const sx = (value, domain, start = 58, end = 552) => start + ((value - domain[0]) / (domain[1] - domain[0])) * (end - start);
const sy = (value, domain, start = 300, end = 30) => start - ((value - domain[0]) / (domain[1] - domain[0])) * (start - end);

function Frame({ children, label, height = 340 }) {
  return <svg className="question-svg" viewBox={`0 0 600 ${height}`} role="img" aria-label={label || 'Mathematics diagram'}>{children}</svg>;
}

function Grid({ xDomain = [0, 10], yDomain = [0, 10], xTicks, yTicks, showAxisLetters = true }) {
  const xs = xTicks || Array.from({ length: 11 }, (_, index) => xDomain[0] + ((xDomain[1] - xDomain[0]) * index) / 10);
  const ys = yTicks || Array.from({ length: 11 }, (_, index) => yDomain[0] + ((yDomain[1] - yDomain[0]) * index) / 10);
  const xZero = Math.max(xDomain[0], Math.min(0, xDomain[1]));
  const yZero = Math.max(yDomain[0], Math.min(0, yDomain[1]));
  return <>
    {xs.map((value, index) => <g key={`x-${index}`}><line className="diagram-grid" x1={sx(value,xDomain)} y1="30" x2={sx(value,xDomain)} y2="300" /><text className="diagram-tick" x={sx(value,xDomain)} y="318" textAnchor="middle">{value}</text></g>)}
    {ys.map((value, index) => <g key={`y-${index}`}><line className="diagram-grid" x1="58" y1={sy(value,yDomain)} x2="552" y2={sy(value,yDomain)} /><text className="diagram-tick" x="49" y={sy(value,yDomain)+4} textAnchor="end">{value}</text></g>)}
    <line className="diagram-axis" x1="58" y1={sy(yZero,yDomain)} x2="560" y2={sy(yZero,yDomain)} />
    <line className="diagram-axis" x1={sx(xZero,xDomain)} y1="310" x2={sx(xZero,xDomain)} y2="25" />
    {showAxisLetters && <><text className="diagram-label" x="558" y={sy(yZero,yDomain)-7}>x</text><text className="diagram-label" x={sx(xZero,xDomain)+7} y="26">y</text></>}
  </>;
}

function GraphVisual({ spec }) {
  const xDomain = spec.xDomain || [0,10]; const yDomain = spec.yDomain || [0,10];
  return <Frame label={spec.altText || 'Coordinate graph'} height={spec.axisLabels ? 370 : 340}><Grid xDomain={xDomain} yDomain={yDomain} xTicks={spec.xTicks} yTicks={spec.yTicks} showAxisLetters={!spec.axisLabels}/>
    {spec.shade && <polygon className="diagram-shade" points={spec.shade.map(([x,y])=>`${sx(x,xDomain)},${sy(y,yDomain)}`).join(' ')} />}
    {(spec.lines || []).map((line,index)=><g key={index}><polyline className="diagram-line" points={line.points.map(([x,y])=>`${sx(x,xDomain)},${sy(y,yDomain)}`).join(' ')} />{line.label&&<text className="diagram-label" x={sx(line.points.at(-1)[0],xDomain)-16} y={sy(line.points.at(-1)[1],yDomain)-8}>{line.label}</text>}</g>)}
    {(spec.points || []).map((point)=><g key={point.label}><circle className="diagram-point" cx={sx(point.x,xDomain)} cy={sy(point.y,yDomain)} r="5"/><text className="diagram-label" x={sx(point.x,xDomain)+8} y={sy(point.y,yDomain)-8}>{point.label}</text></g>)}
    {spec.axisLabels&&<><text className="diagram-label graph-axis-title" x="305" y="355" textAnchor="middle">{spec.axisLabels[0]}</text><text className="diagram-label graph-y-axis-title" x="66" y="20">{spec.axisLabels[1]}</text></>}
  </Frame>;
}

function PolygonVisual({ spec }) {
  const point = (name) => spec.points[name];
  return <Frame label={spec.altText || 'Geometry diagram'}>
    {spec.shade && <polygon className="diagram-shade" points={spec.shade.map((name)=>`${point(name)[0]*6},${point(name)[1]*3.4}`).join(' ')} />}
    {spec.segments.map(([a,b])=><line className="diagram-line" key={`${a}-${b}`} x1={point(a)[0]*6} y1={point(a)[1]*3.4} x2={point(b)[0]*6} y2={point(b)[1]*3.4}/>) }
    {Object.entries(spec.points).map(([name,[x,y]])=><g key={name}><circle className="diagram-point" cx={x*6} cy={y*3.4} r="4"/><text className="diagram-label" x={x*6+7} y={y*3.4-7}>{name}</text></g>)}
    {spec.labels.map(({at,text})=><text className="diagram-label" key={`${at}-${text}`} x={at[0]*6} y={at[1]*3.4}>{text}</text>)}
  </Frame>;
}

function VennVisual({ spec }) {
  return <Frame label={`Venn diagram for ${spec.labels.join(' and ')}`}><rect className="diagram-outline" x="45" y="35" width="510" height="270"/><ellipse className="diagram-set" cx="250" cy="170" rx="135" ry="105"/><ellipse className="diagram-set" cx="360" cy="170" rx="135" ry="105"/>
    {spec.shade==='intersection'&&<ellipse className="diagram-shade" cx="305" cy="170" rx="78" ry="93"/>}
    <text className="diagram-label" x="150" y="85">{spec.labels[0]}</text><text className="diagram-label" x="445" y="85">{spec.labels[1]}</text>
    {spec.values&&<><text className="diagram-value" x="202" y="174">{spec.values.left}</text><text className="diagram-value" x="301" y="174">{spec.values.intersection}</text><text className="diagram-value" x="402" y="174">{spec.values.right}</text><text className="diagram-value" x="510" y="280">{spec.values.outside}</text></>}
  </Frame>;
}

function CircleVisual({ spec }) {
  return <Frame label="Concentric circular regions"><circle className="diagram-shade" cx="300" cy="170" r={spec.rings[0].radius*3}/><circle className="diagram-cutout" cx="300" cy="170" r={spec.rings[1].radius*3}/><line className="diagram-line" x1="300" y1="170" x2={300+spec.rings[0].radius*3} y2="170"/><line className="diagram-line" x1="300" y1="170" x2="300" y2={170-spec.rings[1].radius*3}/><text className="diagram-label" x="382" y="160">{spec.rings[0].label}</text><text className="diagram-label" x="310" y="105">{spec.rings[1].label}</text></Frame>;
}

function BearingVisual({ spec }) {
  const angle = (spec.bearing - 90) * Math.PI / 180; const x=300+Math.cos(angle)*145; const y=190+Math.sin(angle)*145;
  return <Frame label={`Bearing of ${spec.bearing} degrees from ${spec.from} to ${spec.to}`}><line className="diagram-axis" x1="300" y1="300" x2="300" y2="35"/><text className="diagram-label" x="312" y="48">N</text><line className="diagram-line" x1="300" y1="190" x2={x} y2={y}/><circle className="diagram-point" cx="300" cy="190" r="5"/><circle className="diagram-point" cx={x} cy={y} r="5"/><text className="diagram-label" x="282" y="215">{spec.from}</text><text className="diagram-label" x={x+8} y={y-8}>{spec.to}</text><text className="diagram-label" x={(300+x)/2+8} y={(190+y)/2}>{spec.distance}</text><path className="diagram-arc" d={`M 300 110 A 80 80 0 ${spec.bearing>180?1:0} 1 ${300+Math.cos(angle)*80} ${190+Math.sin(angle)*80}`}/><text className="diagram-label" x="325" y="115">{spec.bearing}°</text></Frame>;
}

function MatrixVisual({ spec }) {
  return <div className="question-matrix" role="img" aria-label={`Matrix ${spec.label || ''}`}><span>{spec.label && `${spec.label} =`}</span><div className="matrix-brackets">{spec.values.map((row,index)=><div key={index}>{row.map((value,item)=><b key={item}>{value}</b>)}</div>)}</div></div>;
}

function TransformationGrid({ spec }) {
  const xDomain=[-5,5],yDomain=[-5,5]; const poly=(points)=>points.map(([x,y])=>`${sx(x,xDomain)},${sy(y,yDomain)}`).join(' ');
  return <Frame label="Coordinate transformation diagram"><Grid xDomain={xDomain} yDomain={yDomain}/><polygon className="diagram-shape" points={poly(spec.original)}/><polygon className="diagram-shape image" points={poly(spec.image)}/></Frame>;
}

function SimpleVisual({ spec }) {
  if(spec.type==='compositeShapes') return <Frame label="Rectangle and square"><rect className="diagram-shape" x="70" y="95" width="250" height="105"/><rect className="diagram-shape image" x="410" y="110" width="100" height="100"/><text className="diagram-label" x="175" y="85">3x</text><text className="diagram-label" x="50" y="155">x</text><text className="diagram-label" x="450" y="100">y</text></Frame>;
  if(spec.type==='similarTriangles') return <Frame label="Two similar triangles"><polygon className="diagram-shape" points="55,270 290,270 180,55"/><polygon className="diagram-shape image" points="365,270 515,270 440,135"/><text className="diagram-label" x="142" y="290">{spec.largerArea}</text><text className="diagram-label" x="420" y="290">scale 1 : 2</text></Frame>;
  if(spec.type==='circleTriangle') return <Frame label="Triangle inscribed in a circle"><circle className="diagram-set" cx="300" cy="170" r="125"/><line className="diagram-line" x1="175" y1="170" x2="425" y2="170"/><line className="diagram-line" x1="175" y1="170" x2="330" y2="49"/><line className="diagram-line" x1="330" y1="49" x2="425" y2="170"/><text className="diagram-label" x="155" y="170">A</text><text className="diagram-label" x="435" y="170">B</text><text className="diagram-label" x="330" y="38">C</text></Frame>;
  if(spec.type==='matrixMapping') return <div className="matrix-mapping"><span>A</span><b>×</b><span className="column-vector">{spec.input.join('\n')}</span><b>=</b><span className="column-vector">{spec.output.join('\n')}</span></div>;
  if(spec.type==='vectorOptions') return <Frame label="Four vector addition diagrams">{[['A',75,85],['B',360,85],['C',75,235],['D',360,235]].map(([label,x,y],i)=><g key={label}><text className="diagram-label" x={x-35} y={y}>{label}</text><line className="diagram-line" x1={x} y1={y+35} x2={x+75} y2={y-25}/><line className="diagram-line" x1={x+75} y1={y-25} x2={x+145} y2={i===1?y+35:y+5}/><line className="diagram-line" x1={x} y1={y+35} x2={x+145} y2={i===1?y+35:y+5}/></g>)}</Frame>;
  if(spec.type==='graphOptions') return <Frame label="Four graph options">{[['A',85,65,'M0,0 L80,70'],['B',350,65,'M0,70 Q40,-20 80,70'],['C',85,220,'M0,70 L80,0'],['D',350,220,'M0,65 Q45,20 80,5']].map(([label,x,y,d])=><g transform={`translate(${x} ${y})`} key={label}><text className="diagram-label" x="-28" y="35">{label}</text><line className="diagram-grid" x1="0" y1="35" x2="90" y2="35"/><line className="diagram-grid" x1="40" y1="0" x2="40" y2="75"/><path className="diagram-line" d={d}/></g>)}</Frame>;
  if(spec.type==='numberLineOptions') return <Frame label="Four number line options">{['A','B','C','D'].map((label,index)=><g transform={`translate(100 ${65+index*75})`} key={label}><text className="diagram-label" x="-45" y="5">{label}</text><line className="diagram-axis" x1="0" y1="0" x2="390" y2="0"/>{Array.from({length:8},(_,i)=>i-4).map((n)=><g key={n}><line className="diagram-grid" x1={40+(n+4)*45} y1="-7" x2={40+(n+4)*45} y2="7"/><text className="diagram-tick" x={36+(n+4)*45} y="22">{n}</text></g>)}<line className="diagram-line" x1={130} y1="0" x2={355} y2="0"/><circle className={index===0?'diagram-point':'diagram-open-point'} cx="130" cy="0" r="7"/><circle className="diagram-open-point" cx="355" cy="0" r="7"/></g>)}</Frame>;
  return null;
}

export default function QuestionVisual({ spec }) {
  if (!spec) return null;
  if (spec.type === 'table') return <figure className="question-table-figure"><table><caption>{spec.caption}</caption><thead><tr>{spec.headers.map((cell)=><th key={cell}>{cell}</th>)}</tr></thead><tbody>{spec.rows.map((row,index)=><tr key={index}>{row.map((cell,item)=><td key={item}>{cell}</td>)}</tr>)}</tbody></table></figure>;
  if (spec.type === 'graph') return <GraphVisual spec={spec}/>;
  if (spec.type === 'polygon') return <PolygonVisual spec={spec}/>;
  if (spec.type === 'venn') return <VennVisual spec={spec}/>;
  if (spec.type === 'circle') return <CircleVisual spec={spec}/>;
  if (spec.type === 'bearing') return <BearingVisual spec={spec}/>;
  if (spec.type === 'matrix') return <MatrixVisual spec={spec}/>;
  if (spec.type === 'transformationGrid') return <TransformationGrid spec={spec}/>;
  return <SimpleVisual spec={spec}/>;
}
