import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import useAuth from './features/auth/hooks/useAuth';
import AppRoutes from './AppRoutes'; // 그대로 유지
import Header from './components/shared/Header';
import Footer from './components/shared/Footer';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  const { initialized, isAuthenticated } = useAuth();

  if (!initialized) {
    return null; // 로딩 중
  }

  return (
    <Router>
      {isAuthenticated && <Header />}  {/* ✅ 로그인 시만 보임 */}

      <main style={{ minHeight: 'calc(100vh - 120px)' }}>
        <AppRoutes />
      </main>

      {isAuthenticated && <Footer />}  {/* ✅ 로그인 시만 보임 */}

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
