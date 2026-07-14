'use client';
import { useState } from 'react';

export default function RadarChart({axes}){
 const [active,setActive]=useState(null);const cx=220,cy=188,radius=112,n=axes.length;
 const point=(index,distance)=>{const angle=-Math.PI/2+index*2*Math.PI/n;return[cx+distance*Math.cos(angle),cy+distance*Math.sin(angle)]};
 const polygon=(factor)=>axes.map((_,index)=>point(index,radius*factor).join(',')).join(' ');
 const data=axes.map((axis,index)=>point(index,radius*Math.max(0,Math.min(100,axis.value))/100).join(',')).join(' ');
 const status=(value)=>value>=70?'Strong':value<55?'Needs work':'Developing';
 const colour=(value)=>value>=70?'#4f9d69':value<55?'#c65c3c':'#c99621';
 const lines=(label)=>{const words=label.split(' '),result=[];let line='';for(const word of words){const next=line?`${line} ${word}`:word;if(next.length>20&&line){result.push(line);line=word}else line=next}if(line)result.push(line);return result.slice(0,3)};
 return <svg className="radar interactive-radar" viewBox="0 0 440 390" role="img" aria-label="Interactive performance radar chart">
  <polygon points={polygon(1)} fill="rgba(79,157,105,.10)" stroke="#cce0cf"/><polygon points={polygon(.7)} fill="rgba(244,193,68,.13)" stroke="#ead9a5"/><polygon points={polygon(.5)} fill="rgba(198,92,60,.10)" stroke="#edc9bf"/>
  {[.25,.5,.75,1].map((value)=><polygon key={value} points={polygon(value)} fill="none" stroke="#ded6c7" strokeWidth="1.15"/>)}
  {axes.map((_,index)=>{const[x,y]=point(index,radius);return <line key={index} x1={cx} y1={cy} x2={x} y2={y} stroke="#e6e0d4"/>})}
  <polygon className="radar-data-shape" points={data} fill="rgba(244,193,68,.28)" stroke="#1a1815" strokeWidth="3.4" strokeLinejoin="round"/>
  {axes.map((axis,index)=>{const[x,y]=point(index,radius*axis.value/100);return <g key={axis.label} tabIndex="0" role="button" aria-label={`${axis.label}: ${axis.value}%, ${status(axis.value)}`} onMouseEnter={()=>setActive(index)} onMouseLeave={()=>setActive(null)} onFocus={()=>setActive(index)} onBlur={()=>setActive(null)}><circle cx={x} cy={y} r="11" fill="transparent"/><circle cx={x} cy={y} r="5.5" fill="#fff" stroke={colour(axis.value)} strokeWidth="3.5"/></g>})}
  {axes.map((axis,index)=>{const[x,y]=point(index,radius+51);const anchor=Math.abs(x-cx)<20?'middle':x>cx?'start':'end';const labelLines=lines(axis.label);return <text key={axis.label} x={x} y={y-(labelLines.length-1)*9} textAnchor={anchor} className="radar-label">{labelLines.map((line,lineIndex)=><tspan key={line} x={x} dy={lineIndex===0?0:19}>{line}</tspan>)}</text>})}
  {active!==null&&(()=>{const axis=axes[active];const[x,y]=point(active,radius*axis.value/100);const tx=Math.min(342,Math.max(98,x));const ty=Math.max(48,y-48);return <g className="radar-tooltip" pointerEvents="none"><rect x={tx-88} y={ty-31} width="176" height="54" rx="10"/><text x={tx} y={ty-10} textAnchor="middle">{axis.label}</text><text x={tx} y={ty+11} textAnchor="middle">{axis.value}% · {status(axis.value)}</text></g>})()}
 </svg>;
}
