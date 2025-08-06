import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/routes/LoginPage';
import RegisterPage from './features/auth/routes/RegisterPage';
import WelcomePage from './features/auth/routes/WelcomePage';
import HomePage from './features/products/routes/HomePage';
import NewProductPage from './features/products/routes/NewProductPage';
import ProductDetailPage  from './features/products/routes/ProductDetailPage';
import UpdateProductPage  from './features/products/routes/UpDateProductPage';


import useAuth from './features/auth/hooks/useAuth';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {!isAuthenticated ? (
        <>
          {/* 비로그인 상태 */}
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* 보호된 경로는 로그인 페이지로 강제 이동 */}
          <Route path="/homepage" element={<Navigate to="/login" replace />} />
          <Route path="/post" element={<Navigate to="/login" replace />} />

          {/* 그 외 모든 경로 → 로그인 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <>
          {/* 로그인 상태 */}
          <Route path="/homepage" element={<HomePage />} />
          <Route path="/NewProductPage" element={<NewProductPage />} />
          <Route path="/item/:id" element={<ProductDetailPage />} />
          <Route path="/UpDateProductPage/:id" element={<UpdateProductPage />} />

          {/* 로그인 후 /, /login 등 접근 시 homepage로 리다이렉트 */}
          <Route path="/" element={<Navigate to="/homepage" replace />} />
          <Route path="/login" element={<Navigate to="/homepage" replace />} />
          <Route path="/register" element={<Navigate to="/homepage" replace />} />

          {/* 그 외 모든 경로 → homepage */}
          <Route path="*" element={<Navigate to="/homepage" replace />} />
        </>
      )}
    </Routes>
  );
};

export default AppRoutes;
