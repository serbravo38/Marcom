import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Agreements from "./pages/Agreements";
import Inventory from "./pages/Inventory";
import WorkOrders from "./pages/WorkOrders";
import Users from "./pages/Users";
import Quotations from "./pages/Quotations";

import Portada from "./pages/Portada";
import Contacto from "./pages/Contacto";
import Catalog from "./pages/Catalog";
import AdminMonitores from "./pages/AdminMonitores";
import SalesControl from "./pages/SalesControl";
import Facturacion from "./pages/Facturacion";

// Main Layout Wrapper for authenticated sections
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  
  // Dynamic header title matching routing paths
  const getTitle = () => {
    switch (location.pathname) {
      case "/":
      case "/dashboard":
        return "Panel Principal (Dashboard)";
      case "/agreements":
        return "Convenios de Clientes";
      case "/quotations":
        return "Cotizaciones para Clientes en Convenio";
      case "/users":
        return "Gestión de Usuarios y Cuentas";
      case "/inventory":
        return "Gestión de Inventario y Bodegas";
      case "/work-orders":
        return "Órdenes de Trabajo y Evidencias";
      case "/admin/monitores":
        return "Gestión de Monitores a la Venta";
      case "/ventas":
        return "Control de Ventas";
      case "/facturacion":
        return "Control de Facturación";
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
        {/* Public Landing & Auth Routes */}
        <Route path="/" element={<Portada />} />
        <Route path="/portada" element={<Portada />} />
        <Route path="/catalogo" element={<Catalog />} />
        <Route path="/catalogo-monitores" element={<Catalog />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/login" element={<Login />} />

        {/* Private Protected Routes with Granular RBAC */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/agreements" 
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "JEFE_BODEGA", "CLIENTE_CONVENIO"]}>
              <Layout>
                <Agreements />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/quotations" 
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "JEFE_BODEGA", "CLIENTE_CONVENIO", "CLIENTE_ESTANDAR"]}>
              <Layout>
                <Quotations />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/inventory" 
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "JEFE_BODEGA", "TECNICO_TERRENO", "CLIENTE_CONVENIO"]}>
              <Layout>
                <Inventory />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/work-orders" 
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "JEFE_BODEGA", "TECNICO_TERRENO", "CLIENTE_CONVENIO"]}>
              <Layout>
                <WorkOrders />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/users" 
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <Layout>
                <Users />
              </Layout>
            </ProtectedRoute>
          } 
        />
        {/* Gestión de Catálogo de Monitores - Exclusivo ADMIN */}
        <Route 
          path="/admin/monitores" 
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <Layout>
                <AdminMonitores />
              </Layout>
            </ProtectedRoute>
          } 
        />
        {/* Control de Ventas de Monitores - Exclusivo ADMIN */}
        <Route 
          path="/ventas" 
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <Layout>
                <SalesControl />
              </Layout>
            </ProtectedRoute>
          } 
        />
        {/* Control General de Facturación y Libro de Ventas CSV - Exclusivo ADMIN */}
        <Route 
          path="/facturacion" 
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <Layout>
                <Facturacion />
              </Layout>
            </ProtectedRoute>
          } 
        />
        {/* Fallback Catch-all Route: Any unknown URL leads gracefully to Portada */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
