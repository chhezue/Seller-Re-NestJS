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
          minHeight: 'calc(100vh - 180px)'
        }}>
        <AppRoutes />
      </main>

      <Footer /> {/* 항상 보이게! */}

      <ToastContainer position="top-center" autoClose={2000} hideProgressBar />
    </Router>
  );
};

export default App;
