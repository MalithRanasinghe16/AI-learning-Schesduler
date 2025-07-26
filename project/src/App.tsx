import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ScheduleProvider } from "./contexts/ScheduleContext";
import Navbar from "./components/Layout/Navbar";
import DashboardPage from "./pages/DashboardPage";
import SchedulePage from "./pages/SchedulePage";
import SubjectPage from "./pages/SubjectPage";
import UserProfile from "./components/Dashboard/UserProfile";
import LoginForm from "./components/Auth/LoginForm";
import RegisterForm from "./components/Auth/RegisterForm";
import ChatWidget from "./components/Chat/ChatWidget";
import ErrorBoundary from "./components/Common/ErrorBoundary";
import { chatStorage } from "./services/chatbot";

const LoginWithNavigate = () => {
  const navigate = useNavigate();
  return <LoginForm onSwitchToRegister={() => navigate("/register")} />;
};

const RegisterWithNavigate = () => {
  const navigate = useNavigate();
  return <RegisterForm onSwitchToLogin={() => navigate("/login")} />;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(() => {
    // Load chat widget state from localStorage
    return chatStorage.getWidgetState();
  });

  // Persist chat widget state to localStorage
  useEffect(() => {
    chatStorage.setWidgetState(isChatOpen);
  }, [isChatOpen]);

  const toggleChat = () => {
    setIsChatOpen((prev) => !prev);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-gray-900 to-indigo-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="flex-grow bg-gradient-to-b from-gray-900 to-indigo-900">
        {children}
      </main>
      <ErrorBoundary>
        <ChatWidget isOpen={isChatOpen} onToggle={toggleChat} />
      </ErrorBoundary>
    </>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <ScheduleProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-indigo-900">
          <Routes>
            <Route path="/login" element={<LoginWithNavigate />} />
            <Route path="/register" element={<RegisterWithNavigate />} />
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/schedule" element={<SchedulePage />} />
                    <Route path="/subjects" element={<SubjectPage />} />
                    <Route path="/profile" element={<UserProfile />} />
                  </Routes>
                </ProtectedRoute>
              }
            />
          </Routes>

          {/* Toast Container */}
          <ToastContainer
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </BrowserRouter>
    </ScheduleProvider>
  </AuthProvider>
);

export default App;
