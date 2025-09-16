// auth/routes/RegisterPage.tsx
import React, { useState } from 'react';
import RegisterForm from '../components/RegisterForm';
import { useNavigate } from 'react-router-dom';
import '../components/RegisterPage.css';
import { toast } from 'react-toastify';
import useAuth, { RegisterPayload } from '../hooks/useAuth';

const RegisterPage = () => {
    const [region, setRegion] = useState({ city: '', district: '', dong: '' });
    const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
    const [showMismatch, setShowMismatch] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const navigate = useNavigate();
    const { registerUser } = useAuth();

    const OPTIONAL_FIELDS = new Set(['city', 'district', 'dong', 'region', 'region_id']);

    const handleBlur = (field: string, value: string) => {
        if (OPTIONAL_FIELDS.has(field)) {
            setErrors((prev) => ({ ...prev, [field]: false }));
            return;
        }
        setErrors((prev) => ({ ...prev, [field]: value.trim() === '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]');
        const emailValue = emailInput?.value || '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const nicknameInput = document.querySelector<HTMLInputElement>('input[name="nickname"]');
        const nicknameValue = nicknameInput?.value || '';

        if (!nicknameValue) return toast.error('닉네임을 입력해주세요.');
        if (!emailRegex.test(emailValue)) return toast.error('유효한 이메일 형식이 아닙니다. 예: user@example.com');
        if (password !== confirmPassword) {
            setShowMismatch(true);
            return toast.error('비밀번호가 일치하지 않습니다.');
        }

        const phoneInput = document.querySelector<HTMLInputElement>('input[name="phone"]');
        const phoneValue = phoneInput?.value || '';
        const phoneRegex = /^01[016789]-\d{3,4}-\d{4}$/;
        if (!phoneRegex.test(phoneValue)) return toast.error('유효한 전화번호 형식이 아닙니다. 예: 010-1234-5678');

        const regionIdInput = document.querySelector<HTMLInputElement>('input[name="region_id"]');
        const regionId = regionIdInput?.value || '';

        // ✅ 폼에서 임시 이미지 id 읽기
        const piInput = document.querySelector<HTMLInputElement>('input[name="profileImageId"]');
        const profileImageId = piInput?.value || '';

        try {
            setSubmitting(true);

            const userData: RegisterPayload = {
                username: nicknameValue,
                email: emailValue,
                password,
                phoneNumber: phoneValue,
                ...(regionId ? { region_id: regionId } : {}),
                ...(profileImageId ? { profileImageId } : {}), // ✅ 이걸 보냅니다
            };

            await registerUser(userData);
            toast.success('회원가입 성공! 로그인 페이지로 이동합니다.');
            navigate('/login');
        } catch (err: any) {
        console.error('회원가입 요청 오류:', err);

        const code = (err?.errorCode || err?.code || '').toString();
        const msg = (err?.message || '').toString();

        if (code === 'USERNAME_ALREADY_EXISTS' || /USERNAME_ALREADY_EXISTS/.test(msg)) {
            return toast.error('이미 가입되어 있는 닉네임 입니다.');
        }

        if (code === 'EMAIL_ALREADY_EXISTS' || /EMAIL_ALREADY_EXISTS/.test(msg)) {
            return toast.error('이미 사용 중인 이메일입니다.');
        }

        toast.error(`회원가입 실패: ${msg || '서버 오류'}`);
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
        />
    );
};

export default RegisterPage;
