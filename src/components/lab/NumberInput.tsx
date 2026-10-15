import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { fmtInput, parseNumber } from '../../lib/math/format';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onValueChange: (value: number) => void;
}

/** Keep incomplete keyboard input local; only finite numbers enter a calculation. */
export function NumberInput({ value, onValueChange, onBlur, ...props }: NumberInputProps) {
  const [draft, setDraft] = useState(() => fmtInput(value));
  const lastSent = useRef(value);
  useEffect(() => {
    if (!Object.is(value, lastSent.current)) {
      lastSent.current = value;
      setDraft(fmtInput(value));
    }
  }, [value]);
  return <input {...props} type="number" inputMode="decimal" value={draft}
    onChange={e => {
      const next = e.target.value;
      setDraft(next);
      const parsed = parseNumber(next);
      if (parsed !== null) {
        lastSent.current = parsed;
        onValueChange(parsed);
      }
    }}
    onBlur={e => {
      setDraft(fmtInput(value));
      onBlur?.(e);
    }} />;
}
