// auth/routes/RegisterPage.tsx
import React, { useState } from 'react';
import RegisterForm from '../components/RegisterForm';
import { useNavigate } from 'react-router-dom';
import '../components/RegisterPage.css';
import { toast } from 'react-toastify';
import useAuth, { RegisterPayload } from '../hooks/useAuth';  // ✅ 타입도 함께

const RegisterPage = () => {
    const [region, setRegion] = useState({ city: '', district: '', dong: '' });
    const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
    const [showMismatch, setShowMismatch] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [profileImage, setProfileImage] = useState('');
    const [submitting, setSubmitting] = useState(false);           // ✅ 중복 제출 방지
    const navigate = useNavigate();

    const { registerUser } = useAuth();                            // ✅ 훅에서 주입받기

    // ✅ 지역 관련 필드는 선택 사항이므로 에러로 취급하지 않음
    const OPTIONAL_FIELDS = new Set(['city', 'district', 'dong', 'region', 'region_id']);

    const handleBlur = (field: string, value: string) => {
        if (OPTIONAL_FIELDS.has(field)) {
            setErrors((prev) => ({ ...prev, [field]: false }));
            return;
        }
        setErrors((prev) => ({
            ...prev,
            [field]: value.trim() === '',
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]');
        const emailValue = emailInput?.value || '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const nicknameInput = document.querySelector<HTMLInputElement>('input[name="nickname"]');
        const nicknameValue = nicknameInput?.value || '';

        if (!nicknameValue) {
            toast.error('닉네임을 입력해주세요.');
            return;
        }

        if (!emailRegex.test(emailValue)) {
            toast.error('유효한 이메일 형식이 아닙니다. 예: user@example.com');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('비밀번호가 일치하지 않습니다.');
            setShowMismatch(true);
            return;
        }

        const phoneInput = document.querySelector<HTMLInputElement>('input[name="phone"]');
        const phoneValue = phoneInput?.value || '';
        const phoneRegex = /^01[016789]-\d{3,4}-\d{4}$/;

        if (!phoneRegex.test(phoneValue)) {
            toast.error('유효한 전화번호 형식이 아닙니다. 예: 010-1234-5678');
            return;
        }

        // ✅ 지역은 "선택" 사항: 있으면 보내고, 없으면 생략
        const regionIdInput = document.querySelector<HTMLInputElement>('input[name="region_id"]');
        const regionId = regionIdInput?.value || '';

        const userData: RegisterPayload = {
            username: nicknameValue,
            email: emailValue,
            password,
            phoneNumber: phoneValue,
            ...(regionId ? { region_id: regionId } : {}),
            ...(profileImage ? { profileImage } : {}),
        };

        try {
            setSubmitting(true);
            await registerUser(userData); // 필요 시 { autoLogin: true } 옵션 사용 가능
            toast.success('회원가입 성공! 로그인 페이지로 이동합니다.');
            navigate('/login');
        } catch (err: any) {
            console.error('회원가입 요청 오류:', err);
            toast.error(`회원가입 실패: ${err?.message || '서버 오류'}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <RegisterForm
            region={region}
            setRegion={setRegion}
            errors={errors}
            onBlur={handleBlur}
            onSubmit={handleSubmit}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            showMismatch={showMismatch}
            setShowMismatch={setShowMismatch}
            phone={phone}
            setPhone={setPhone}
            profileImage={profileImage}
            setProfileImage={setProfileImage}
            // 필요하면 RegisterForm 내부에서 제출 버튼 disabled={submitting} 처리
        />
    );
};

export default RegisterPage;
