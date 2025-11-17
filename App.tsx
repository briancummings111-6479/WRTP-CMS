import React, { useEffect } from 'react'; // Added useEffect
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
import { initializeAuth } from './src/lib/firebase'; // <-- CORRECTED PATH: ./src/lib/firebase

function App() {

  // Added this hook to initialize Firebase on app load
  useEffect(() => {
    // This function will handle sign-in (anonymous or custom token)
    // We will add this function to firebase.js in the next step.
    const unsubscribe = initializeAuth((user) => {
      if (user) {
        console.log("Firebase Auth initialized, user:", user.uid);
      } else {
        console.log("Firebase Auth initialized, no user.");
      }
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []); // Empty array ensures this runs only once

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