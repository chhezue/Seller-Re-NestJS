// auth/routes/RegisterPage.tsx
import React, { useState } from 'react';
import RegisterForm from '../components/RegisterForm';
import { useNavigate } from 'react-router-dom';
import '../components/RegisterPage.css';
import { toast } from 'react-toastify';
import useAuth from '../hooks/useAuth';  // ✅ 추가

const RegisterPage = () => {
    const [region, setRegion] = useState({ city: '', district: '', dong: '' });
    const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
    const [showMismatch, setShowMismatch] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [profileImage, setProfileImage] = useState('');
    const navigate = useNavigate();

    const { registerUser } = useAuth();  // ✅ 훅에서 주입받기

    const handleBlur = (field: string, value: string) => {
        setErrors((prev) => ({
            ...prev,
            [field]: value.trim() === '',
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

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
            return;
        }

        const phoneInput = document.querySelector<HTMLInputElement>('input[name="phone"]');
        const phoneValue = phoneInput?.value || '';
        const phoneRegex = /^01[016789]-\d{3,4}-\d{4}$/;

        if (!phoneRegex.test(phoneValue)) {
            toast.error('유효한 전화번호 형식이 아닙니다. 예: 010-1234-5678');
            return;
        }

        // ✅ RegisterForm에서 제공하는 hidden input (구의 id)
        const regionIdInput = document.querySelector<HTMLInputElement>('input[name="region_id"]');
        const regionId = regionIdInput?.value || '';
        if (!regionId) {
            toast.error('주소를 검색하고 구/군까지 선택해주세요.');
            return;
        }

        const userData = {
            username: nicknameValue,
            email: emailValue,
            password,
            profileImage,
            phoneNumber: phoneValue,
            region_id: regionId,  // ✅ 구 id 그대로
        };

        try {
            await registerUser(userData);  // ✅ 훅으로 위임
            toast.success('회원가입 성공! 로그인 페이지로 이동합니다.');
            navigate('/login');
        } catch (err: any) {
            console.error('회원가입 요청 오류:', err);
            toast.error(`회원가입 실패: ${err?.message || '서버 오류'}`);
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
        />
    );
};

export default RegisterPage;
