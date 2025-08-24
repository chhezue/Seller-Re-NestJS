// AppRoutes.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/routes/LoginPage';
import RegisterPage from './features/auth/routes/RegisterPage';
import WelcomePage from './features/auth/routes/WelcomePage';
import HomePage from './features/products/routes/HomePage';
import NewProductPage from './features/products/routes/NewProductPage';
import ProductDetailPage from './features/products/routes/ProductDetailPage';
import UpdateProductPage from './features/products/routes/UpDateProductPage';
import ProfilePage from './features/profile/routes/ProfilePage';
import EditProfilePage from './features/profile/routes/EditProFilePage';

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/homepage" replace />} />
            <Route path="/homepage" element={<HomePage />} />
            <Route path="/NewProductPage" element={<NewProductPage />} />
            <Route path="/item/:id" element={<ProductDetailPage />} />
            <Route path="/UpDateProductPage/:id" element={<UpdateProductPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />

            {/* 선택적으로 로그인/회원가입 경로 유지 */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/welcome" element={<WelcomePage />} />

            {/* 모든 알 수 없는 경로 → 홈페이지 */}
            <Route path="*" element={<Navigate to="/homepage" replace />} />
        </Routes>
    );
};

export default AppRoutes;
