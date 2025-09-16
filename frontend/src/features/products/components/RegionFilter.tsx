// features/products/components/RegionFilter.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import useAuth, { RegionItem } from '../../auth/hooks/useAuth';
import CategoryDropdown from '../routes/CategoryDropdown';
import './RegionFilters.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

const API_BASE = 'http://127.0.0.1:3000';
const REGION_STORE_KEY = 'filters:selectedRegion';

export type RegionChange = {
    /** 서버 전송용: district 우선, 없으면 city */
    region?: string;
    /** UI 표시 라벨 */
    regionLabel?: string;
    /** 내부 상태 공유용 */
    cityId?: string;
    districtId?: string;
};

type RightMode = 'SALE' | 'SHARE';
type DeliveryType = 'DIRECT' | 'PARCEL' | null;
export type SortKey = 'latest' | 'popular' | 'lowPrice' | 'highPrice';

type Props = {
    onChange?: (payload: RegionChange) => void;
    /** 검색바 등에 보여줄 텍스트 갱신 */
    onRegionTextChange?: (text: string) => void;
    /** 외부에서 지역을 초기화해야 할 때(optional) */
    externalResetSignal?: number;

    /** ✅ 오른쪽 탭(판매/나눔) & 거래 방식(직거래/택배) 제어 */
    rightMode?: RightMode;
    onRightModeChange?: (m: RightMode) => void;
    deliveryType?: DeliveryType;
    onDeliveryTypeChange?: (t: DeliveryType) => void;

    /** ✅ 정렬 드롭다운 (최신순 등) */
    sortKey?: SortKey;
    onSortChange?: (s: SortKey) => void;

    /** ✅ 새로고침 버튼 (상단 바의 갱신) */
    onRefresh?: () => void;
};

const RegionFilter: React.FC<Props> = ({
    onChange,
    onRegionTextChange,
    externalResetSignal,

    rightMode = 'SALE',
    onRightModeChange,
    deliveryType = null,
    onDeliveryTypeChange,

    sortKey = 'latest',
    onSortChange,

    onRefresh,
}) => {
    const { getRegions, authFetch, isAuthenticated } = useAuth() as {
        getRegions: () => Promise<RegionItem[]>;
        authFetch: (
            input: RequestInfo | URL,
            init?: RequestInit,
            opts?: { requireAuth?: boolean }
        ) => Promise<Response>;
        isAuthenticated: boolean;
    };

    const [regions, setRegions] = useState<RegionItem[]>([]);
    const [regionLoading, setRegionLoading] = useState(false);
    const [regionError, setRegionError] = useState('');

    const [selectedCityId, setSelectedCityId] = useState('');
    const [selectedDistrictId, setSelectedDistrictId] = useState('');

    // ----- fetch regions -----
    const getRegionsRef = useRef(getRegions);
    useEffect(() => { getRegionsRef.current = getRegions; }, [getRegions]);

    const fetchRegions = async () => {
        setRegionLoading(true);
        setRegionError('');
        try {
            const data = await getRegionsRef.current();
            setRegions(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setRegionError(e?.message ?? '지역 정보를 불러오지 못했습니다.');
        } finally {
            setRegionLoading(false);
        }
    };

    useEffect(() => {
        let aborted = false;
        (async () => {
            setRegionLoading(true);
            setRegionError('');
            try {
                const data = await getRegionsRef.current();
                if (!aborted) setRegions(Array.isArray(data) ? data : []);
            } catch (e: any) {
                if (!aborted) setRegionError(e?.message ?? '지역 정보를 불러오지 못했습니다.');
            } finally {
                if (!aborted) setRegionLoading(false);
            }
        })();
        return () => { aborted = true; };
    }, []);

    // ----- helpers -----
    const cities = useMemo(() => regions.filter(r => r.parentId === null), [regions]);
    const districts = useMemo(() => {
        if (!selectedCityId) return [];
        const city = regions.find(r => r.id === selectedCityId);
        if (city?.children?.length) return city.children;
        return regions.filter(r => r.parentId === selectedCityId);
    }, [regions, selectedCityId]);

    const flattenRegions = (list: RegionItem[]): RegionItem[] => {
        if (!list?.length) return [];
        if (!list.some(n => Array.isArray(n.children) && n.children.length)) return list;
        const flat: RegionItem[] = [];
        const stack = [...list];
        while (stack.length) {
            const n = stack.pop()!;
            flat.push({ id: n.id, name: n.name, parentId: n.parentId });
            if (n.children?.length) stack.push(...n.children);
        }
        return flat;
    };

    const saveRegion = (data: { regionId?: string; cityId?: string; districtId?: string; label?: string }) => {
        try { localStorage.setItem(REGION_STORE_KEY, JSON.stringify(data)); } catch {}
    };
    const loadRegion = () => {
        try {
            const raw = localStorage.getItem(REGION_STORE_KEY);
            if (!raw) return null;
            const obj = JSON.parse(raw);
            return {
                regionId: obj?.regionId != null ? String(obj.regionId) : undefined,
                cityId: obj?.cityId != null ? String(obj.cityId) : undefined,
                districtId: obj?.districtId != null ? String(obj.districtId) : undefined,
                label: typeof obj?.label === 'string' ? obj.label : undefined,
            } as { regionId?: string; cityId?: string; districtId?: string; label?: string };
        } catch { return null; }
    };

    const emit = (payload: RegionChange) => {
        onChange?.(payload);
        onRegionTextChange?.(payload.regionLabel ?? '');
    };

    // ----- initial restore: localStorage > profile -----
    const initOnceRef = useRef(false);
    useEffect(() => {
        if (initOnceRef.current) return;
        if (regionLoading || !regions.length) return;
        initOnceRef.current = true;

        const flat = flattenRegions(regions);
        const stored = loadRegion();

        if (stored) {
            const cityId = stored.cityId ?? '';
            const districtId = stored.districtId ?? '';
            const labelStored = stored.label ?? '';

            // 전체
            if (cityId === '' && districtId === '') {
                setSelectedCityId('');
                setSelectedDistrictId('');
                emit({ region: undefined, regionLabel: undefined, cityId: '', districtId: '' });
                return;
            }
            // 시/도만
            if (cityId && !districtId) {
                setSelectedCityId(cityId);
                setSelectedDistrictId('');
                const cityName = flat.find(n => n.id === cityId)?.name ?? '';
                const label = labelStored || cityName || '';
                emit({ region: cityId, regionLabel: label || undefined, cityId, districtId: '' });
                return;
            }
            // 시/도 + 구
            if (cityId && districtId) {
                setSelectedCityId(cityId);
                setSelectedDistrictId(districtId);
                const cityName = flat.find(n => n.id === cityId)?.name ?? '';
                const distName = flat.find(n => n.id === districtId)?.name ?? '';
                const label = labelStored || (cityName && distName ? `${cityName} ${distName}` : (distName || cityName || ''));
                emit({ region: districtId, regionLabel: label || undefined, cityId, districtId });
                return;
            }
        }

        // no stored: profile default
        if (isAuthenticated) {
            (async () => {
                try {
                    const res = await authFetch(`${API_BASE}/api/users/me`, { method: 'GET' }, { requireAuth: true });
                    if (!res.ok) return;
                    const me = await res.json();
                    const regionId: string | undefined = me?.region?.id ?? me?.region_id ?? undefined;
                    if (!regionId) return;

                    const node = flat.find(n => n.id === regionId);
                    if (!node) return;

                    if (node.parentId) {
                        const parent = flat.find(n => n.id === node.parentId);
                        if (parent) {
                            setSelectedCityId(parent.id);
                            setSelectedDistrictId(node.id);
                            const label = `${parent.name} ${node.name}`;
                            emit({ region: node.id, regionLabel: label, cityId: parent.id, districtId: node.id });
                            saveRegion({ cityId: parent.id, districtId: node.id, label, regionId: node.id });
                        }
                    } else {
                        setSelectedCityId(node.id);
                        setSelectedDistrictId('');
                        const label = node.name;
                        emit({ region: node.id, regionLabel: label, cityId: node.id, districtId: '' });
                        saveRegion({ cityId: node.id, districtId: '', label, regionId: node.id });
                    }
                } catch { /* ignore */ }
            })();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [regionLoading, regions, isAuthenticated, authFetch]);

    // ----- external reset (optional) -----
    useEffect(() => {
        if (externalResetSignal == null) return;
        setSelectedCityId('');
        setSelectedDistrictId('');
        emit({ region: undefined, regionLabel: undefined, cityId: '', districtId: '' });
        try { localStorage.removeItem(REGION_STORE_KEY); } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [externalResetSignal]);

    // ----- handlers -----
    const handleCitySelect = (id: string) => {
        setSelectedCityId(id);
        setSelectedDistrictId('');

        const cityName = cities.find(c => c.id === id)?.name || undefined;
        emit({ region: id || undefined, regionLabel: cityName, cityId: id || '', districtId: '' });
        saveRegion({ regionId: id || '', cityId: id || '', districtId: '', label: cityName ?? '' });
    };

    const handleDistrictSelect = (id: string) => {
        setSelectedDistrictId(id);

        const cityName = cities.find(c => c.id === selectedCityId)?.name || '';
        const distName = districts.find(d => d.id === id)?.name || '';
        const label = (cityName && distName) ? `${cityName} ${distName}` : (distName || cityName || '');

        emit({ region: id || selectedCityId || undefined, regionLabel: label || undefined, cityId: selectedCityId || '', districtId: id || '' });
        saveRegion({ regionId: id || selectedCityId || '', cityId: selectedCityId || '', districtId: id || '', label });
    };

    const handleRefresh = async () => {
        onRefresh?.();
        setSelectedCityId('');
        setSelectedDistrictId('');
        try { localStorage.removeItem(REGION_STORE_KEY); } catch {}
        emit({ region: undefined, regionLabel: undefined, cityId: '', districtId: '' });
        await fetchRegions();
    };

    /** ✅ 정렬 아이템: useProducts.SortKey와 1:1 매칭 */
    const sortItems = [
        { id: 'latest', name: '최신순' },
        { id: 'lowPrice', name: '낮은 가격순' },
        { id: 'highPrice', name: '높은 가격순' },
        { id: 'popular', name: '인기순' },
    ];

    const handleSortSelect = (id: string) => {
        const allowed: SortKey[] = ['latest', 'lowPrice', 'highPrice', 'popular'];
        const next = (allowed.includes(id as SortKey) ? (id as SortKey) : 'latest');
        onSortChange?.(next);
    };

    return (
        <div className="rf-toolbar">
            {/* 왼쪽: 새로고침 + 위치 아이콘 + 지역 선택 + 정렬 */}
            <div className="rf-left">
                <button
                    type="button"
                    className="rf-refresh"
                    onClick={handleRefresh}
                    aria-label="새로고침"
                    title="새로고침"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M21 12a9 9 0 1 1-2.64-6.36" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21 3v6h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                {/* ← 여기 아이콘 추가 */}
                <span className="rf-inputwrap">
                    <i className="rf-icon" aria-hidden="true">
                        <FontAwesomeIcon icon={faMapMarkerAlt} />
                    </i>
                    <CategoryDropdown
                        className="region-select rf-dd rf-dd--withicon"
                        items={[{ id: '', name: '전체 지역' }, ...cities]}
                        value={selectedCityId}
                        onChange={handleCitySelect}
                        disabled={regionLoading}
                        loading={regionLoading}
                        placeholder="시/도 선택"
                        ariaLabel="시/도 선택"
                    />
                </span>

                <CategoryDropdown
                    className="region-select rf-dd"
                    items={selectedCityId ? [{ id: '', name: '상세 지역' }, ...districts] : []}
                    value={selectedDistrictId}
                    onChange={handleDistrictSelect}
                    disabled={regionLoading || !selectedCityId}
                    loading={regionLoading}
                    placeholder={selectedCityId ? '구 선택' : '상세 지역'}
                    ariaLabel="구 선택"
                />

                {/* 정렬 드롭다운 */}
                <CategoryDropdown
                    className="rf-dd rf-sort"
                    items={sortItems}
                    value={sortKey}
                    onChange={handleSortSelect}
                    disabled={false}
                    loading={false}
                    placeholder="정렬"
                    ariaLabel="정렬"
                />
            </div>

            {/* 오른쪽: 판매/나눔 + 직거래/택배 탭 */}
            <div className="rf-right" role="tablist" aria-label="판매 유형 및 거래 방식">
                <button
                    type="button"
                    className={`rf-tab ${rightMode === 'SALE' ? 'active' : ''}`}
                    role="tab"
                    aria-selected={rightMode === 'SALE'}
                    onClick={() => onRightModeChange?.('SALE')}
                >
                    판매
                </button>
                <button
                    type="button"
                    className={`rf-tab ${rightMode === 'SHARE' ? 'active' : ''}`}
                    role="tab"
                    aria-selected={rightMode === 'SHARE'}
                    onClick={() => onRightModeChange?.('SHARE')}
                >
                    나눔
                </button>

                <span className="rf-split" aria-hidden="true">|</span>

                <button
                    type="button"
                    className={`rf-tab ${deliveryType === 'DIRECT' ? 'active' : ''}`}
                    onClick={() => onDeliveryTypeChange?.(deliveryType === 'DIRECT' ? null : 'DIRECT')}
                    aria-pressed={deliveryType === 'DIRECT'}
                >
                    직거래
                </button>
                <button
                    type="button"
                    className={`rf-tab ${deliveryType === 'PARCEL' ? 'active' : ''}`}
                    onClick={() => onDeliveryTypeChange?.(deliveryType === 'PARCEL' ? null : 'PARCEL')}
                    aria-pressed={deliveryType === 'PARCEL'}
                >
                    택배
                </button>
            </div>

            {regionError && <p className="error-text" style={{ marginTop: 6 }}>{regionError}</p>}
        </div>
    );
};

export default RegionFilter;
