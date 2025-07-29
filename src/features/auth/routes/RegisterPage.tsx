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
  const navigate = useNavigate();

  const handleBlur = (field: string, value: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: value.trim() === '',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    toast.success('회원가입 요청 완료!');
    console.log('회원가입 요청:', { region, phone: phoneValue });

    navigate('/login');
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
