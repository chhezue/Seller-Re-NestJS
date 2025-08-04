import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import LoginPage from './features/auth/routes/LoginPage';
import RegisterPage from './features/auth/routes/RegisterPage';
import WelcomePage from './features/auth/routes/WelcomePage';
import HomePage from './features/products/routes/HomePage';
import useAuth from './features/auth/hooks/useAuth';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* 비로그인 상태 */}
      {!isAuthenticated ? (
        <>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* 보호된 경로 접근 시 강제 로그인 이동 */}
          <Route path="/homepage" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <>
          {/* 로그인된 상태 */}
          <Route path="/homepage" element={<HomePage />} />
          {/* 로그인 후 다른 경로 접근 시 자동 홈 이동 */}
          <Route path="/" element={<Navigate to="/homepage" replace />} />
          <Route path="/login" element={<Navigate to="/homepage" replace />} />
          <Route path="/register" element={<Navigate to="/homepage" replace />} />
          <Route path="*" element={<Navigate to="/homepage" replace />} />
        </>
      )}
    </Routes>
  );
};

const App = () => {
  const { initialized } = useAuth();

  if (!initialized) {
    return null; // 또는 로딩 화면 출력
  }

  return (
    <Router>
      <AppRoutes />
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />
    </Router>
  );
};

export default App;
