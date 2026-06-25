import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import { GraduationCap } from 'lucide-react';

// Loading Component
const LoadingScreen = () => {
  const auth = useAuth();
  const darkMode = auth ? auth.darkMode : false;
  return (
    <div className={`min-h-screen flex flex-col justify-center items-center text-white transition-colors duration-300 ${
      darkMode ? 'bg-black' : 'bg-brand-teal'
    }`}>
      <div className="p-3 bg-brand-glass rounded-2xl border border-white/10 text-brand-emerald mb-4 animate-bounce">
        <GraduationCap className="w-10 h-10" />
      </div>
      <div className="text-sm font-bold tracking-widest uppercase opacity-75">Checking Session...</div>
    </div>
  );
};

// Route Guard: Student Only
const StudentRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.role !== 'STUDENT') {
    // If authenticated as admin, redirect to admin panel instead
    return <Navigate to="/admin" replace />;
  }
  
  return children;
};

const AdminRedirectFallback = () => {
  useEffect(() => {
    alert("Access denied: Administrative privileges required. Redirecting to student dashboard.");
  }, []);
  return <Navigate to="/student" replace />;
};

// Route Guard: Admin Only
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.role !== 'ADMIN') {
    return <AdminRedirectFallback />;
  }
  
  return children;
};

// Routing Wrapper to allow useAuth hook inside router context
function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/student'} replace /> : <Login />} 
      />
      <Route 
        path="/signup" 
        element={user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/student'} replace /> : <Signup />} 
      />

      {/* Protected Student Routes */}
      <Route 
        path="/student" 
        element={
          <StudentRoute>
            <Dashboard />
          </StudentRoute>
        } 
      />

      {/* Protected Admin Routes */}
      <Route 
        path="/admin" 
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } 
      />

      {/* Global Fallback Route */}
      <Route 
        path="*" 
        element={
          <Navigate to={user ? (user.role === 'ADMIN' ? '/admin' : '/student') : '/login'} replace />
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[#0b0f19]">
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
