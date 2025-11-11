
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ClientDashboardPage from './pages/ClientDashboardPage';
import ReportsPage from './pages/ReportsPage';
import DataExportPage from './pages/DataExportPage';
import AdminRoute from './components/AdminRoute';
import KioskIntakePage from './pages/KioskIntakePage';
import DataImportPage from './pages/DataImportPage';

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public Kiosk Route */}
          <Route path="/kiosk" element={<KioskIntakePage />} />
          
          {/* Authenticated Routes */}
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/clients/:clientId" element={<Layout><ClientDashboardPage /></Layout>} />
          <Route path="/reports" element={<Layout><ReportsPage /></Layout>} />
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