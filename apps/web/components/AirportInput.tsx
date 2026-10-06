'use client';

import { airportByIata, searchAirports, type Airport } from '@lowfare/core';
import { useId, useMemo, useState } from 'react';

const label = (a: Airport) => `${a.city} (${a.iata})`;

/** Accessible combobox (WAI-ARIA 1.2 pattern) that submits an IATA code via a hidden input. */
export function AirportInput(props: {
  name: string;
  label: string;
  defaultIata?: string;
  placeholder?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const initial = props.defaultIata ? airportByIata(props.defaultIata) : undefined;
  const [text, setText] = useState(initial ? label(initial) : (props.defaultIata ?? ''));
  const [iata, setIata] = useState(props.defaultIata ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const options = useMemo(() => (open ? searchAirports(text) : []), [open, text]);

  const choose = (a: Airport) => {
    setText(label(a));
    setIata(a.iata);
    setOpen(false);
  };

  const onChange = (value: string) => {
    setText(value);
    setOpen(true);
    setActive(0);
    // Allow any raw 3-letter code; the starter airport list isn't exhaustive.
    setIata(/^[a-z]{3}$/i.test(value.trim()) ? value.trim().toUpperCase() : '');
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-xs text-fg-3">
        {props.label}
      </label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        required
        value={text}
        placeholder={props.placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => {
          setOpen(false);
          if (!iata && options[0]) choose(options[0]);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && open && options[active]) {
            e.preventDefault();
            choose(options[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className="w-full border-0 border-b border-line bg-transparent py-2 text-lg font-semibold tracking-tight outline-none placeholder:font-normal placeholder:text-fg-3 focus:border-fg"
      />
      <input type="hidden" name={props.name} value={iata} />
      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${props.label} suggestions`}
          className="absolute left-0 right-0 z-20 mt-1 border border-fg bg-bg"
        >
          {options.map((a, i) => (
            <li
              key={a.iata}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(a);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-baseline justify-between px-3 py-2 text-sm ${
                i === active ? 'bg-fg text-bg' : ''
              }`}
            >
              <span>
                {a.city} <span className={i === active ? '' : 'text-fg-3'}>· {a.name}</span>
              </span>
              <span className="nums font-semibold">{a.iata}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
