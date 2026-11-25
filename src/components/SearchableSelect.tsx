import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  searchText?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  emptyOptionLabel?: string;
  compact?: boolean;
  className?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Pesquisar...',
  emptyText = 'Nenhum resultado encontrado.',
  emptyOptionLabel,
  compact = false,
  className = 'w-full',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const hay = [opt.label, opt.sublabel ?? '', opt.searchText ?? '']
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  const displayLabel = selectedOption
    ? selectedOption.label
    : value === '' && emptyOptionLabel
      ? emptyOptionLabel
      : placeholder;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-[8px] border bg-white px-3 text-left text-[13px] outline-none transition ${
          compact ? 'h-[38px]' : 'h-[42px]'
        } ${
          open
            ? 'border-[#d64b19]'
            : 'border-[#e7e8e2] hover:border-[#cfd2c8]'
        }`}
      >
        <span
          className={`truncate ${
            selectedOption || emptyOptionLabel
              ? 'text-[#252824]'
              : 'text-[#73766e]'
          }`}
        >
          {displayLabel}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-[#73766e] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-40 mt-1.5 min-w-[220px] overflow-hidden rounded-[10px] border border-[#e7e8e2] bg-white shadow-lg">
          <div className="border-b border-[#e7e8e2] p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#73766e]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-[34px] w-full rounded-[6px] border border-[#e7e8e2] bg-[#f7f8f4] pl-8 pr-2.5 text-[12px] text-[#252824] outline-none focus:border-[#d64b19]"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {emptyOptionLabel && !query.trim() && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition hover:bg-[#f7f8f4] ${
                  value === ''
                    ? 'bg-[#fff0e7]/60 font-semibold text-[#d64b19]'
                    : 'text-[#252824]'
                }`}
              >
                <span className="truncate">{emptyOptionLabel}</span>
                {value === '' && <Check className="size-3.5 shrink-0" />}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-[12px] text-[#73766e]">
                {emptyText}
              </p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition hover:bg-[#f7f8f4] ${
                      isSelected
                        ? 'bg-[#fff0e7]/60 font-semibold text-[#d64b19]'
                        : 'text-[#252824]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate">{opt.label}</p>
                      {opt.sublabel && (
                        <p className="truncate text-[11px] font-normal text-[#73766e]">
                          {opt.sublabel}
                        </p>
                      )}
                    </div>
                    {isSelected && <Check className="size-3.5 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
