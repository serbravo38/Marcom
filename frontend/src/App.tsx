import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Agreements from "./pages/Agreements";
import Inventory from "./pages/Inventory";
import WorkOrders from "./pages/WorkOrders";
import Users from "./pages/Users";

// Main Layout Wrapper for authenticated sections
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  
  // Dynamic header title matching routing paths
  const getTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Panel Principal (Dashboard)";
      case "/agreements":
        return "Convenios de Clientes";
      case "/users":
        return "Gestión de Usuarios y Cuentas";
      case "/inventory":
        return "Gestión de Inventario y Bodegas";
      case "/work-orders":
        return "Órdenes de Trabajo y Evidencias";
      default:
        return "MARCOM";
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Header title={getTitle()} />
        <div style={{ marginTop: "24px" }}>
          {children}
        </div>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Private Protected Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/agreements" 
          element={
            <ProtectedRoute>
              <Layout>
                <Agreements />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/inventory" 
          element={
            <ProtectedRoute>
              <Layout>
                <Inventory />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/work-orders" 
          element={
            <ProtectedRoute>
              <Layout>
                <WorkOrders />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/users" 
          element={
            <ProtectedRoute>
              <Layout>
                <Users />
              </Layout>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
};

export default App;
