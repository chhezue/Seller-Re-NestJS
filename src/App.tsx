import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './features/auth/routes/LoginPage';
import RegisterPage from './features/auth/routes/RegisterPage';
import WelcomePage from './features/auth/routes/WelcomePage';

import HomePage from './features/products/routes/HomePage';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/homepage" element={<HomePage />} />
      </Routes>

      {/* ✅ 토스트 컨테이너는 전역으로 한 번만 선언 */}
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
