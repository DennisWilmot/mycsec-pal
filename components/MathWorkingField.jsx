'use client';

import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';

const symbols = [
  { label: 'Multiply', display: '×', value: '×' },
  { label: 'Divide', display: '÷', value: '÷' },
  { label: 'Plus or minus', display: '±', value: '±' },
  { label: 'Square root', display: '√', value: 'sqrt( )', caretBack: 1 },
  { label: 'Power', display: 'xⁿ', value: '^( )', caretBack: 1 },
  { label: 'Fraction', display: 'a/b', value: '( )/( )', caretBack: 5 },
  { label: 'Pi', display: 'π', value: 'π' },
  { label: 'Theta', display: 'θ', value: 'θ' },
  { label: 'Degrees', display: '°', value: '°' },
  { label: 'Less than or equal to', display: '≤', value: '≤' },
  { label: 'Greater than or equal to', display: '≥', value: '≥' },
  { label: 'Not equal to', display: '≠', value: '≠' },
  { label: 'Approximately equal to', display: '≈', value: '≈' },
];

export default function MathWorkingField({ value = [], onChange, label = 'Show your working and answer', minimumLines = 4 }) {
  const [activeLine, setActiveLine] = useState(0);
  const fields = useRef([]);
  const lines = Array.from({ length: Math.max(minimumLines, value.length || 0) }, (_, index) => value[index] || '');

  const updateLine = (index, nextValue) => {
    const next = [...lines];
    next[index] = nextValue;
    onChange(next);
  };
  const insert = (symbol) => {
    const field = fields.current[activeLine];
    const currentValue = lines[activeLine] || '';
    const start = field?.selectionStart ?? currentValue.length;
    const end = field?.selectionEnd ?? start;
    const nextValue = `${currentValue.slice(0, start)}${symbol.value}${currentValue.slice(end)}`;
    updateLine(activeLine, nextValue);
    requestAnimationFrame(() => {
      field?.focus();
      const caret = start + symbol.value.length - (symbol.caretBack || 0);
      field?.setSelectionRange(caret, caret);
    });
  };
  const addLine = () => {
    onChange([...lines, '']);
    setActiveLine(lines.length);
    requestAnimationFrame(() => fields.current[lines.length]?.focus());
  };

  return <div className="paper2-response-field math-working-field">
    <span>{label}</span>
    <div className="maths-symbol-toolbar" aria-label="Mathematical symbols">
      <small>Insert notation</small>
      <div>{symbols.map((symbol) => <button key={symbol.label} type="button" title={`${symbol.label}: inserts ${symbol.value}`} aria-label={`Insert ${symbol.label}`} onMouseDown={(event) => event.preventDefault()} onClick={() => insert(symbol)}>{symbol.display}</button>)}</div>
    </div>
    <div className="math-working-lines">
      {lines.map((line, index) => <input key={index} ref={(node) => { fields.current[index] = node; }} value={line} onFocus={() => setActiveLine(index)} onChange={(event) => updateLine(index, event.target.value)} aria-label={`Working line ${index + 1}`} placeholder={index === 0 ? 'Enter your working…' : ''} />)}
    </div>
    <p className="notation-hint">Powers use <b>10^(4)</b>, roots use <b>sqrt(25)</b>, and fractions use <b>(3)/(5)</b>.</p>
    <button className="add-working-line" type="button" onClick={addLine}><Plus size={15} />Add another working line</button>
  </div>;
}
