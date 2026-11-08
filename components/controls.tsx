'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Eye, EyeOff } from 'lucide-react';
import './controls.css';

export function PasswordInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="password-control">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="password-toggle"
        aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        {visible ? (
          <EyeOff size={19} strokeWidth={1.7} />
        ) : (
          <Eye size={19} strokeWidth={1.7} />
        )}
      </button>
    </span>
  );
}

export function MenuPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; description?: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const choose = (at: number) => {
    if (options[at]) onChange(options[at].value);
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <div className="menu-picker" ref={root}>
      <span className="control-label" id={`${id}-label`}>
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        className="menu-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => {
          setIndex(
            Math.max(
              0,
              options.findIndex((o) => o.value === value),
            ),
          );
          setOpen(!open);
        }}
        onKeyDown={(e) => {
          if (
            ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(
              e.key,
            )
          ) {
            e.preventDefault();
            if (!open) {
              setOpen(true);
              setIndex(
                Math.max(
                  0,
                  options.findIndex((o) => o.value === value),
                ),
              );
            } else if (e.key === 'Enter' || e.key === ' ') choose(index);
            else
              setIndex(
                e.key === 'Home'
                  ? 0
                  : e.key === 'End'
                    ? options.length - 1
                    : (index +
                        (e.key === 'ArrowUp' ? -1 : 1) +
                        options.length) %
                      options.length,
              );
          }
          if (e.key === 'Escape' || e.key === 'Tab') setOpen(false);
        }}
      >
        <span id={`${id}-value`}>
          {selected?.label ?? 'Pilih menu'}
          {selected?.description && <small>{selected.description}</small>}
        </span>
        <ChevronDown size={18} className={open ? 'rotate' : ''} />
      </button>
      {open && (
        <div
          id={`${id}-list`}
          className="menu-picker-list glass"
          role="listbox"
          aria-labelledby={`${id}-label`}
          aria-activedescendant={`${id}-${index}`}
        >
          {options.map((option, at) => (
            <button
              id={`${id}-${at}`}
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              tabIndex={-1}
              className={at === index ? 'focused' : ''}
              onMouseEnter={() => setIndex(at)}
              onClick={() => choose(at)}
            >
              <span>
                {option.label}
                <small>{option.description}</small>
              </span>
              {option.value === value && <Check size={17} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
