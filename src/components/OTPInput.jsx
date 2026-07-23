import React, { useState, useRef } from 'react';

export default function OTPInput({ onComplete, length = 4 }) {
  const [values, setValues] = useState(Array(length).fill(''));
  const refs = useRef([]);

  function handleChange(i, e) {
    const v = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...values];
    next[i] = v;
    setValues(next);
    if (v && i < length - 1) refs.current[i + 1].focus();
    if (next.every(ch => ch) && onComplete) onComplete(next.join(''));
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !values[i] && i > 0) refs.current[i - 1].focus();
  }

  return (
    <div className="flex justify-center gap-3 mb-4">
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-school focus:outline-none"
        />
      ))}
    </div>
  );
}
