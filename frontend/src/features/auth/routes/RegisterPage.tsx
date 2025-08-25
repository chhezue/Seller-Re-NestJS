import React, { useState } from 'react';
import RegisterForm from '../components/RegisterForm';
import { useNavigate } from 'react-router-dom';
import '../components/RegisterPage.css';
import { toast } from 'react-toastify';

const RegisterPage = () => {
  const [region, setRegion] = useState({ city: '', district: '', dong: '' });
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  const [showMismatch, setShowMismatch] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState(''); // ✅ 프로필 이미지 base64
  const navigate = useNavigate();

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

    if (!region.city || !region.district || !region.dong) {
      toast.error('주소를 검색해주세요.');
      return;
    }

    const region_id = `${region.city}-${region.district}-${region.dong}`;

    const userData = {
      username: nicknameValue,
      email: emailValue,
      password,
      profileImage, 
      phoneNumber: phoneValue,
      region_id,
    };

    try {
      const response = await fetch('http://127.0.0.1:3000/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        toast.success('회원가입 성공! 로그인 페이지로 이동합니다.');
        navigate('/login');
      } else {
        const errorData = await response.json();
        toast.error(`회원가입 실패: ${errorData.message || '서버 오류'}`);
      }
    } catch (err) {
      console.error('회원가입 요청 오류:', err);
      toast.error('회원가입 요청 중 오류 발생. 다시 시도해주세요.');
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
      profileImage={profileImage}              // ✅ 추가
      setProfileImage={setProfileImage}        // ✅ 추가
    />
  );
};

export default RegisterPage;
