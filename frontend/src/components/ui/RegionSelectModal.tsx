import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import useAuth, { RegionItem } from '../../features/auth/hooks/useAuth';
// RegisterPage.css 안에 region-* 관련 공용 스타일이 있다고 하셨으니 재사용합니다.
import '../../features/auth/components/RegisterPage.css';

type RegionNode = RegionItem & { children?: RegionNode[] };

interface Props {
    open: boolean;
    onClose: () => void;
    onSelect: (path: { city: RegionNode; district: RegionNode }) => void;
}

const RegionSelectModal: React.FC<Props> = ({ open, onClose, onSelect }) => {
    const { getRegions } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [list, setList] = useState<RegionNode[]>([]);
    const [city, setCity] = useState<RegionNode | undefined>();

    // getRegions 1회 호출 가드
    const getRegionsRef = useRef(getRegions);
    useEffect(() => { getRegionsRef.current = getRegions; }, [getRegions]);
    const loadedRef = useRef(false);

    // 최상위(시/도)
    const cities = useMemo(
        () => list.filter((n) => n.parentId === null),
        [list]
    );

    // 선택된 시/도의 구/군 (서버가 children을 주면 사용, 아니면 parentId로 필터)
    const districts = useMemo(() => {
        if (!city) return [];
        if (city.children && city.children.length) return city.children as RegionNode[];
        return list.filter((n) => n.parentId === city.id);
    }, [list, city]);

    useEffect(() => {
        if (!open) return;
        if (loadedRef.current) return;

        let cancelled = false;
        (async () => {
            setLoading(true);
            setError('');
            try {
                const data = (await getRegionsRef.current()) as RegionNode[];
                if (!cancelled) {
                    setList(Array.isArray(data) ? data : []);
                    loadedRef.current = true;
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.message ?? '지역 정보를 불러오지 못했습니다.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [open]);

    // 모달 닫힐 때 단계 초기화
    useEffect(() => {
        if (!open) return;
        return () => setCity(undefined);
    }, [open]);

    if (!open) return null;

    return (
        <div className="region-backdrop" onClick={onClose}>
            <div
                className="region-dialog"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="region-select-title"
            >
                <h3 id="region-select-title" className="region-title">주소를 선택해주세요</h3>

                {error && <p className="error-text" style={{ marginTop: 8 }}>{error}</p>}

                {/* 단계 표시 + 뒤로가기 */}
                <div className="region-steps">
                    <button
                        type="button"
                        className="btn ghost"
                        onClick={() => { if (city) setCity(undefined); else onClose(); }}
                        aria-label="뒤로"
                        title="뒤로"
                    >
                        <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    <span>
                        {city?.name ?? '시/도 선택'}
                        {city ? ' > 구/군 선택' : ''}
                    </span>
                </div>

                {loading ? (
                    <div className="region-loading">불러오는 중...</div>
                ) : (
                    <div className="region-list">
                        {/* 1단계: 시/도 */}
                        {!city && cities.map((c) => (
                            <button key={c.id} className="region-item" onClick={() => setCity(c)}>
                                {c.name}
                            </button>
                        ))}

                        {/* 2단계: 구/군 */}
                        {city && districts.map((d) => (
                            <button
                                key={d.id}
                                className="region-item"
                                onClick={() => { onSelect({ city, district: d }); onClose(); }}
                            >
                                {d.name}
                            </button>
                        ))}

                        {city && districts.length === 0 && (
                            <p className="region-empty">해당 시/도에는 구/군 정보가 없습니다.</p>
                        )}
                    </div>
                )}

                <div className="region-actions">
                    <button className="btn ghost" onClick={onClose}>취소</button>
                </div>
            </div>
        </div>
    );
};

export default RegionSelectModal;
