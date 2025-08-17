import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import Header from './components/shared/Header';
import Footer from './components/shared/Footer';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  return (
    <Router>
      <Header /> {/* 항상 보이게! */}

      <main style={{
          minHeight: 'calc(100vh - 180px)',
          background: 'linear-gradient(135deg, #e8e8e8, #f4f4f4)'
        }}>
        <AppRoutes />
      </main>

      <Footer /> {/* 항상 보이게! */}

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
