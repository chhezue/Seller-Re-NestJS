import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { RiKakaoTalkFill } from 'react-icons/ri';
import { SiNaver } from 'react-icons/si';


import './LoginPage.css';

interface Props {
    onLogin: (email: string, password: string) => void | Promise<void>;
    errorMessage: React.ReactNode;
    isLocked: boolean;
    email: string;
    password: string;
    setEmail: (val: string) => void;
    setPassword: (val: string) => void;
    failCount?: number;

    // 잠금 해제 관련
    unlockSubmitting?: boolean;
    unlockMessage?: string;
    onRequestUnlock?: () => Promise<void> | void;
    onVerifyUnlock?: (email: string, code: string) => Promise<void> | void;

    // 메인 에러 초기화(잠금 해제 성공 시 호출)
    onClearError?: () => void;
}

const LoginForm: React.FC<Props> = ({
    onLogin,
    errorMessage,
    isLocked,
    email,
    password,
    setEmail,
    setPassword,
    failCount = 0,
    unlockSubmitting = false,
    unlockMessage = '',
    onRequestUnlock,
    onVerifyUnlock,
    onClearError,
}) => {
    const [code, setCode] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [localUnlockMsg, setLocalUnlockMsg] = useState<string>('');
    const [resendUsed, setResendUsed] = useState(false); // 재전송 1회 제한
    const [successMsg, setSuccessMsg] = useState<string>(''); // 잠금 해제 성공 안내

    // ✅ 로그인/자동로그인 제출 중 상태(이 동안 잠금 CTA 숨김)
    const [isSubmitting, setIsSubmitting] = useState(false);

    const hasErrorText = !!errorMessage && String(errorMessage).trim().length > 0;
    const isLockMessage = hasErrorText && /잠금/.test(String(errorMessage));

    const maybeAwait = async (ret: void | Promise<void>) => {
        if (ret && typeof (ret as any).then === 'function') {
            await (ret as Promise<void>);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await maybeAwait(onLogin(email, password));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSubmit();
    };

    const handleAutoLogin = async () => {
        setIsSubmitting(true);
        try {
            const randomNumber = Math.floor(Math.random() * 50) + 1;
            const randomEmail = `user${randomNumber}@dummyUser.com`;
            const randomPassword = `user${randomNumber}`;
            setEmail(randomEmail);
            setPassword(randomPassword);
            await maybeAwait(onLogin(randomEmail, randomPassword));
        } finally {
            setIsSubmitting(false);
        }
    };

    // 🔓 모달 오픈 + 이메일 전송
    const handleOpenUnlockModal = async () => {
        if (!email) {
            setLocalUnlockMsg('이메일을 먼저 입력해 주세요.');
            setIsModalOpen(true);
            return;
        }
        try {
            setLocalUnlockMsg('');
            await onRequestUnlock?.();
            setLocalUnlockMsg('인증 코드가 이메일로 발송되었습니다. 받은 6자리 코드를 입력하세요.');
        } catch (e: any) {
            setLocalUnlockMsg(e?.message || '잠금 해제 요청에 실패했습니다.');
        } finally {
            setIsModalOpen(true);
            setCode('');
            setResendUsed(false);
        }
    };

    // ✅ 확인(검증) 성공 시: 모달 닫기 + 메인 안내 + 부모 에러 초기화
    const handleVerify = async () => {
        try {
            await onVerifyUnlock?.(email, code);
            setIsModalOpen(false);
            setCode('');
            setLocalUnlockMsg('');
            onClearError?.();
            setSuccessMsg('잠금이 해제되었습니다. 이메일로 받은 임시 비밀번호로 로그인해 주세요.');
        } catch (e: any) {
            setLocalUnlockMsg(e?.message || '인증 코드 확인에 실패했습니다.');
        }
    };

    const handleResend = async () => {
        if (resendUsed) return;
        setResendUsed(true);
        try {
            await onRequestUnlock?.();
            setLocalUnlockMsg('인증 코드를 다시 보냈습니다. 메일함을 확인해 주세요. (재전송 1회 완료)');
        } catch (e: any) {
            setLocalUnlockMsg(e?.message || '코드 재전송에 실패했습니다.');
        }
    };

    const combinedUnlockMsg = unlockMessage || localUnlockMsg;

    // ✅ onLogin이 동기적으로 끝나는 경우 대비:
    // isLocked 또는 errorMessage 변경이 감지되면 제출 중 상태 해제
    useEffect(() => {
        if (isSubmitting) {
            setIsSubmitting(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLocked, errorMessage]);

    // 🎟️ 소셜 로그인 (UI만) — 클릭 시 "준비중입니다" 안내
    const handleSocialClick = (provider: 'google' | 'kakao' | 'naver') => {
        // UI만, 실제 연동 전까지 안내만 표시
        alert('준비중입니다.');
    };

    return (
        <div className="login-container" aria-busy={isSubmitting}>
            <div className="login-box fade-in">
                <h2 className="login-title">로그인</h2>

                {/* 잠금 해제 성공 안내 배너 */}
                {successMsg && (
                    <p
                        className="unlock-message"
                        aria-live="polite"
                        style={{ color: '#2563eb', marginTop: -4, marginBottom: 10 }}
                    >
                        {successMsg}
                    </p>
                )}

                {/* 에러가 있을 때만 에러/힌트 표시, 잠금 메시지일 땐 힌트 숨김 */}
                {hasErrorText && (
                    <div className="login-error-row">
                        <p className="login-error-message" aria-live="polite">
                            {errorMessage}
                        </p>
                        {!isLockMessage && (
                            <span className="login-fail-count" aria-live="polite">
                                5회 이상 틀릴 시 계정이 잠깁니다
                            </span>
                        )}
                    </div>
                )}

                <div className="input-container">
                    <label htmlFor="email">이메일</label>
                    <input
                        id="email"
                        type="email"
                        placeholder="이메일"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={false}
                        autoComplete="username"
                    />
                </div>

                <div className="input-container">
                    <label htmlFor="password">비밀번호</label>
                    <input
                        id="password"
                        type="password"
                        placeholder="비밀번호"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLocked}
                        autoComplete="current-password"
                    />
                </div>

                <button
                    className="login-button"
                    onClick={handleSubmit}
                    disabled={isLocked || isSubmitting}
                >
                    {isSubmitting ? '로그인 중…' : '로그인'}
                </button>

                {/* 🔒 잠금일 때만 노출 + 제출 중에는 숨김 */}
                {isLocked && !isSubmitting && (
                    <div className="unlock-cta">
                        <button
                            type="button"
                            className="unlock-request-button fancy"
                            onClick={handleOpenUnlockModal}
                            disabled={unlockSubmitting || !email || isSubmitting}
                            title={!email ? '이메일을 입력하세요' : '이메일로 인증 코드를 받습니다'}
                        >
                            {unlockSubmitting ? '요청 중...' : '이메일로 인증 코드 받기'}
                        </button>
                    </div>
                )}

                {/* ─────────────── 소셜 로그인 (UI 전용) ─────────────── */}
                <div className="social-login">
                    <div className="divider" aria-hidden="true">
                        <span>또는</span>
                    </div>

                    <div className="social-buttons icon-only">
                        {/* Google - 풀컬러 */}
                        <button
                            type="button"
                            className="social-btn google"
                            onClick={() => handleSocialClick('google')}
                            disabled={isLocked || isSubmitting}
                            aria-label="Google로 계속"
                            title="Google"
                        >
                            <FcGoogle className="social-ic gogle" aria-hidden />
                            <span className="sr-only">Google로 계속</span>
                        </button>

                        {/* KakaoTalk - 아이콘 교체 (RiKakaoTalkFill) */}
                        <button
                            type="button"
                            className="social-btn kakao"
                            onClick={() => handleSocialClick('kakao')}
                            disabled={isLocked || isSubmitting}
                            aria-label="카카오로 계속"
                            title="Kakao"
                        >
                            <RiKakaoTalkFill className="social-ic kakao" aria-hidden />
                            <span className="sr-only">카카오로 계속</span>
                        </button>

                        {/* Naver - 추가 */}
                        <button
                            type="button"
                            className="social-btn naver"
                            onClick={() => handleSocialClick('naver')}
                            disabled={isLocked || isSubmitting}
                            aria-label="네이버로 계속"
                            title="Naver"
                        >
                            <SiNaver className="social-ic naver" aria-hidden />
                            <span className="sr-only">네이버로 계속</span>
                        </button>
                    </div>
                </div>

                <p className="signup-link">
                    아이디가 없으신가요? <Link to="/register">회원가입</Link>
                    <button
                        className="auto-login-button"
                        onClick={handleAutoLogin}
                        disabled={isLocked || isSubmitting}
                    >
                        {isSubmitting ? '자동 입력 중…' : '자동 로그인'}
                    </button>
                </p>
            </div>

            {/* 인증코드 모달 (밖 클릭해도 닫히지 않음) */}
            {isModalOpen && (
                <div className="modal-backdrop">
                    <div
                        className="modal"
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>계정 잠금 해제</h3>
                            <button
                                className="modal-close"
                                aria-label="닫기"
                                onClick={() => setIsModalOpen(false)}
                                disabled={unlockSubmitting}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <p className="modal-desc">
                                6자리 인증 코드를 입력해 주세요.<br />
                                <small style={{ color: '#666' }}>{email}</small>
                            </p>

                            <div className="input-container">
                                <label htmlFor="unlock-code">인증 코드</label>
                                <input
                                    id="unlock-code"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="\d{6}"
                                    maxLength={6}
                                    placeholder="예: 123456"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                    disabled={unlockSubmitting}
                                />
                            </div>

                            {combinedUnlockMsg && (
                                <p className="unlock-message" aria-live="polite">{combinedUnlockMsg}</p>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={handleResend}
                                disabled={unlockSubmitting || !email || resendUsed}
                                title={
                                    !email
                                        ? '이메일을 입력하세요'
                                        : (resendUsed ? '재전송은 1회만 가능합니다' : '인증 코드를 다시 보냅니다')
                                }
                            >
                                {resendUsed ? '재전송 완료' : '코드 재전송'}
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleVerify}
                                disabled={unlockSubmitting || code.length !== 6}
                            >
                                {unlockSubmitting ? '확인 중...' : '잠금 해제 확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginForm;
