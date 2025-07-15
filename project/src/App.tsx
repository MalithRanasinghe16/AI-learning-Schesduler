import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Layout/Navbar';
import Dashboard from './components/Dashboard/Dashboard';
import AdaptiveSchedulePage from './components/Dashboard/AdaptiveSchedulePage';
import Subjects from './components/Dashboard/Subjects';
import Analytics from './components/Dashboard/Analytics';
import UserProfile from './components/Dashboard/UserProfile';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';


const LoginWithNavigate = () => {
  const navigate = useNavigate();
  return <LoginForm onSwitchToRegister={() => navigate('/register')} />;
};

const RegisterWithNavigate = () => {
  const navigate = useNavigate();
  return <RegisterForm onSwitchToLogin={() => navigate('/login')} />;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-gray-900 to-indigo-900 test-css">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="flex-grow bg-gradient-to-b from-gray-900 to-indigo-900 test-css">
        {children}
      </main>
    </>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-indigo-900 test-css">
        <Routes>
          <Route path="/login" element={<LoginWithNavigate />} />
          <Route path="/register" element={<RegisterWithNavigate />} />
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/schedule" element={<AdaptiveSchedulePage />} />
                  <Route path="/subjects" element={<Subjects />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/profile" element={<UserProfile />} />
                </Routes>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
