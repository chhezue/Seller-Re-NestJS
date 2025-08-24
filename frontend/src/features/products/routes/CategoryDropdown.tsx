// CategoryDropdown.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

type Item = { id: string; name: string };

type Props = {
    items: Item[];
    value: string;
    onChange: (id: string) => void;
    disabled?: boolean;
    loading?: boolean;
    placeholder?: string;
    ariaLabel?: string;
    className?: string; // ★ 추가
};

const CategoryDropdown: React.FC<Props> = ({
    items,
    value,
    onChange,
    disabled,
    loading,
    placeholder = '-- 선택 --',
    ariaLabel = '카테고리 선택',
    className
}) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number>(-1);

    const selectedIndex = useMemo(() => items.findIndex((i) => i.id === value), [items, value]);
    const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : null;

    useEffect(() => {
        const onDoc = (e: MouseEvent | TouchEvent) => {
            if (!rootRef.current) return;
            if (!rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('touchstart', onDoc);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('touchstart', onDoc);
        };
    }, []);

    useEffect(() => {
        if (!open) return;
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
        requestAnimationFrame(() => ensureActiveVisible());
    }, [open]); // eslint-disable-line

    useEffect(() => {
        if (open) setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }, [items, selectedIndex]); // eslint-disable-line

    const ensureActiveVisible = () => {
        if (!listRef.current || activeIndex < 0) return;
        const opt = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
        opt?.scrollIntoView({ block: 'nearest' });
    };

    const selectAt = (idx: number) => {
        const it = items[idx];
        if (!it) return;
        onChange(it.id);
        setOpen(false);
        requestAnimationFrame(() => toggleRef.current?.focus());
    };

    const onToggleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled || loading) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!open) setOpen(true);
            else {
                setActiveIndex((i) => Math.min(items.length - 1, i < 0 ? 0 : i + 1));
                requestAnimationFrame(ensureActiveVisible);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) setOpen(true);
            else {
                setActiveIndex((i) => Math.max(0, i < 0 ? 0 : i - 1));
                requestAnimationFrame(ensureActiveVisible);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(items.length - 1, i + 1));
            requestAnimationFrame(ensureActiveVisible);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(0, i - 1));
            requestAnimationFrame(ensureActiveVisible);
        } else if (e.key === 'Home') {
            e.preventDefault();
            setActiveIndex(0);
            requestAnimationFrame(ensureActiveVisible);
        } else if (e.key === 'End') {
            e.preventDefault();
            setActiveIndex(items.length - 1);
            requestAnimationFrame(ensureActiveVisible);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (activeIndex >= 0) selectAt(activeIndex);
        } else if (e.key === 'Escape') {
            setOpen(false);
            requestAnimationFrame(() => toggleRef.current?.focus());
        }
    };

    return (
        <div ref={rootRef} className={`dropdown ${className || ''} ${disabled ? 'is-disabled' : ''}`}>
            <button
                ref={toggleRef}
                type="button"
                className="dropdown-toggle"
                onClick={() => !disabled && !loading && setOpen((v) => !v)}
                onKeyDown={onToggleKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
                disabled={disabled || loading}
            >
                <span className={`dropdown-value ${!selectedItem ? 'is-placeholder' : ''}`}>
                    {loading ? '불러오는 중...' : (selectedItem ? selectedItem.name : placeholder)}
                </span>
                <svg className={`dropdown-arrow ${open ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </button>

            {open && !loading && (
                <div ref={listRef} className="dropdown-list" role="listbox" tabIndex={-1} onKeyDown={onListKeyDown}>
                    {items.length === 0 && <div className="dropdown-empty">항목이 없습니다</div>}
                    {items.map((it, idx) => {
                        const selected = value === it.id;
                        const active = idx === activeIndex;
                        return (
                            <div
                                key={it.id}
                                role="option"
                                aria-selected={selected}
                                data-idx={idx}
                                className={`dropdown-option ${selected ? 'selected' : ''} ${active ? 'active' : ''}`}
                                onMouseEnter={() => setActiveIndex(idx)}
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); selectAt(idx); }}
                            >
                                <span className="option-label">{it.name}</span>
                                {selected && <span className="option-check">✓</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CategoryDropdown;
