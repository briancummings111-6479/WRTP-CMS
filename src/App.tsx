import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ClientDashboardPage from './pages/ClientDashboardPage';
import ReportsPage from './pages/ReportsPage';
import DataExportPage from './pages/DataExportPage';
import KioskIntakePage from './pages/KioskIntakePage';
import DataImportPage from './pages/DataImportPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SignUpPage from './pages/SignUpPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import UsersPage from './pages/UsersPage';
import ToDoPage from './pages/ToDoPage';


// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    console.log("ProtectedRoute: No user, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  console.log("ProtectedRoute: User role:", user.role);

  // Redirect pending users to the pending approval page
  if (user.role === 'pending') {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
};

// Admin Route Component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/kiosk" element={<KioskIntakePage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />

          {/* Authenticated Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout><HomePage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/clients/:clientId" element={
            <ProtectedRoute>
              <Layout><ClientDashboardPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <Layout><ReportsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/todo" element={
            <ProtectedRoute>
              <Layout><ToDoPage /></Layout>
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route
            path="/users"
            element={
              <AdminRoute>
                <Layout><UsersPage /></Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/export"
            element={
              <AdminRoute>
                <Layout><DataExportPage /></Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/import"
            element={
              <AdminRoute>
                <Layout><DataImportPage /></Layout>
              </AdminRoute>
            }
          />

        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;