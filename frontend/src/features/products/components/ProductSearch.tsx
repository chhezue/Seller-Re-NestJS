// features/products/components/ProductSearch.tsx
import React, { useEffect, useRef, useState } from 'react';
import './ProductSearch.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

interface ProductSearchProps {
    onSearch: (keyword: string) => void;
    /** 선택: 초기에 표시할 키워드가 있으면 전달 */
    initialKeyword?: string;
    /** 선택: 자동검색 디바운스(ms). 기본 300 */
    debounceMs?: number;
}

const ProductSearch: React.FC<ProductSearchProps> = ({
    onSearch,
    initialKeyword = '',
    debounceMs = 300,
}) => {
    const [searchTerm, setSearchTerm] = useState(initialKeyword);
    const lastSent = useRef<string>(initialKeyword);
    const timer = useRef<number | null>(null);

    // Enter 또는 버튼 클릭 시 명시적 검색
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = searchTerm.trim();
        if (q === lastSent.current) return;
        lastSent.current = q;
        onSearch(q);
    };

    // 입력 중 자동 검색 (디바운스)
    useEffect(() => {
        const q = searchTerm.trim();

        if (timer.current) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }

        timer.current = window.setTimeout(() => {
            if (q === lastSent.current) return;
            lastSent.current = q;
            onSearch(q);
        }, debounceMs);

        return () => {
            if (timer.current) {
                window.clearTimeout(timer.current);
            }
        };
    }, [searchTerm, onSearch, debounceMs]);

    const handleClear = () => {
        setSearchTerm('');
        lastSent.current = '';
        onSearch('');
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === 'Escape') {
            handleClear();
        }
    };

    return (
        <form className="search-form" onSubmit={handleSubmit} role="search">
            <input
                type="text"
                placeholder="상품명을 입력하세요..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="상품명 검색"
            />
            <button type="submit" className="search-button" aria-label="검색">
                <FontAwesomeIcon icon={faSearch} />
            </button>
        </form>
    );
};

export default ProductSearch;
