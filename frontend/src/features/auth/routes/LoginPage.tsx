// features/auth/routes/LoginPage.tsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import '../components/LoginPage.css';
import useAuth from '../../auth/hooks/useAuth';

const LoginPage = () => {
    const [errorMessage, setErrorMessage] = useState<React.ReactNode>('');
    const [isLocked, setIsLocked] = useState(false);          // 서버 잠금(403)
    const [submitting, setSubmitting] = useState(false);       // 로그인 전송 중
    const [failCount, setFailCount] = useState<number>(0);

    // 🔓 잠금 해제 UI 상태
    const [unlockSubmitting, setUnlockSubmitting] = useState(false);
    const [unlockMessage, setUnlockMessage] = useState<string>('');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const { loginWithPassword, requestUnlock, verifyUnlock } = useAuth();
    const navigate = useNavigate();

    const handleLogin = useCallback(async (email: string, password: string) => {
        if (isLocked || submitting) return;

        setSubmitting(true);
        setErrorMessage('');

        try {
            await loginWithPassword(email, password);
            setFailCount(0);
            navigate('/homepage', { replace: true });
        } catch (err: any) {
            const serverCount = typeof err?.passwordFailedCount === 'number'
                ? err.passwordFailedCount
                : undefined;

            if (err?.status === 403 || err?.code === 'ACCOUNT_LOCKED') {
                // 🔒 계정 잠김
                setIsLocked(true);
                setErrorMessage('계정이 잠겼습니다. 잠금 해제를 진행하거나 관리자에게 문의하세요.');
                if (typeof serverCount === 'number') setFailCount(serverCount);
            } else if (err?.status === 401 || err?.code === 'INVALID_CREDENTIALS') {
                setErrorMessage('이메일과 비밀번호가 일치하지 않습니다.');
                setFailCount(prev => (typeof serverCount === 'number' ? serverCount : prev + 1));
                setPassword('');
            } else {
                setErrorMessage(err?.message || '로그인 중 오류가 발생했습니다.');
            }
        } finally {
            setSubmitting(false);
        }
    }, [isLocked, submitting, loginWithPassword, navigate]);

    const handleLoginRequest = useCallback((email: string, password: string) => {
        if (!email.trim() || !password.trim()) {
            setErrorMessage('이메일과 비밀번호를 모두 입력하세요.');
            return;
        }
        void handleLogin(email, password);
    }, [handleLogin]);

    // 🔓 잠금 해제 요청
    const handleRequestUnlock = useCallback(async (email: string) => {
        if (!email.trim()) {
            setUnlockMessage('이메일을 입력해 주세요.');
            return;
        }
        try {
            setUnlockSubmitting(true);
            setUnlockMessage('');
            await requestUnlock(email);
            setUnlockMessage('인증 코드가 이메일로 발송되었습니다. 받은 6자리 코드를 입력하세요.');
        } catch (e: any) {
            setUnlockMessage(e?.message || '잠금 해제 요청에 실패했습니다.');
        } finally {
            setUnlockSubmitting(false);
        }
    }, [requestUnlock]);

    // 🔓 잠금 해제 확인
    const handleVerifyUnlock = useCallback(async (email: string, code: string) => {
        try {
            setUnlockSubmitting(true);
            setUnlockMessage('');
            await verifyUnlock(email, code);
            setUnlockMessage('잠금이 해제되었습니다. 다시 로그인해 주세요.');
            setIsLocked(false);
            setFailCount(0);
        } catch (e: any) {
            setUnlockMessage(e?.message || '인증 코드 확인에 실패했습니다.');
        } finally {
            setUnlockSubmitting(false);
        }
    }, [verifyUnlock]);

    return (
        <LoginForm
            onLogin={handleLoginRequest}
            errorMessage={errorMessage}
            isLocked={isLocked}              // ✅ 계정 잠김일 때만 잠금 UI 노출
            failCount={failCount}
            email={email}
            password={password}
            setEmail={setEmail}
            setPassword={setPassword}
            unlockSubmitting={unlockSubmitting}
            unlockMessage={unlockMessage}
            onRequestUnlock={() => handleRequestUnlock(email)}
            onVerifyUnlock={handleVerifyUnlock}
            onClearError={() => setErrorMessage('')}
        />
    );
};

export default LoginPage;
