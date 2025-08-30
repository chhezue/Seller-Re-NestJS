// components/ui/MannerTemp.tsx
import React from 'react';
import './MannerTemp.css';

type Props = {
    /** 직접 온도(℃). 없으면 score5/count로 추정, 리뷰 없으면 36.5℃ */
    temp?: number;
    /** 0~5 점수(별점 대체 입력) */
    score5?: number;
    /** 평가/거래 수 (0 또는 미지정이면 기본 36.5℃ 사용) */
    count?: number;
    className?: string;
    style?: React.CSSProperties;
    /** true면 카운트 숨김 */
    compact?: boolean;
};

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

/** 색상 매핑 (20~60℃ 구간) */
const colorByTemp = (t: number) => {
    if (t < 28) return '#60a5fa';  // 차가움(블루)
    if (t < 40) return '#34d399';  // 보통(그린)
    if (t < 50) return '#f59e0b';  // 따뜻(오렌지)
    return '#ef4444';              // 높음(레드)
};

const BASE = 36.5; // 리뷰 없을 때 기본값
const MIN = 20;    // 표시 최소
const MAX = 60;    // 표시 최대

/** 0~5점을 20~60℃로 매핑 (리뷰 없으면 36.5℃) */
const deriveTemp = (temp?: number, score5?: number, count?: number) => {
    if (typeof temp === 'number' && !Number.isNaN(temp)) {
        return clamp(temp, MIN, MAX);
    }
    const hasReviews = typeof count === 'number' ? count > 0 : false;
    if (typeof score5 === 'number' && hasReviews) {
        const s = Math.min(Math.max(score5, 0), 5);
        const t = MIN + (s / 5) * (MAX - MIN); // 0→20℃, 5→60℃
        return Math.round(t * 10) / 10;
    }
    return BASE;
};

const MannerTemp: React.FC<Props> = ({
    temp,
    score5,
    count,
    className,
    style,
    compact,
}) => {
    const t = deriveTemp(temp, score5, count);
    const percent = clamp(((t - MIN) / (MAX - MIN)) * 100, 0, 100);
    const color = colorByTemp(t);

    const trackStyle = {
        ...(style || {}),
        // 게이지 폭/색 (CSS 변수)
        '--w': `${percent}%`,
        '--c': color,
    } as React.CSSProperties;

    return (
        <div
            className={`manner-row ${className || ''}`}
            aria-label={`매너온도 ${t.toFixed(1)}℃`}
        >
            <div className="thermo-track" style={trackStyle}>
                <div className="thermo-fill" />
            </div>
            <span className="manner-badge" style={{ ['--c' as any]: color }}>
                {t.toFixed(1)}℃
            </span>
        </div>
    );
};

export default MannerTemp;
