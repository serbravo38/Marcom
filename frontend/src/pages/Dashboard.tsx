import React, { useState, useEffect } from "react";
import { 
  FileText, 
  MapPin, 
  Boxes, 
  Shuffle, 
  TrendingUp, 
  AlertCircle 
} from "lucide-react";
import { authService } from "../services/auth";
import { inventoryService } from "../services/inventory";
import { workOrdersService } from "../services/workOrders";
import { MetricCard } from "../components/MetricCard";

type StockMovement = {
  movimiento_id: string | number;
  motivo: string;
  creado_en: string | Date;
};

type DashboardWorkOrder = {
  orden_trabajo_id: string | number;
  numero_orden: string;
  fecha_programada: string | Date;
  estado: string;
};

export const Dashboard: React.FC = () => {
  const [agreements, setAgreements] = useState<unknown[]>([]);
  const [locations, setLocations] = useState<unknown[]>([]);
  const [products, setProducts] = useState<unknown[]>([]);
  const [assets, setAssets] = useState<unknown[]>([]);
  const [workOrders, setWorkOrders] = useState<DashboardWorkOrder[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setError(null);
        
        // Fetch all modular statistics concurrently
        const [
          agreementsData,
          locationsData,
          productsData,
          assetsData,
          workOrdersData,
          movementsData
        ] = await Promise.all([
          authService.getAgreements().catch(() => [] as unknown[]),
          inventoryService.getLocations().catch(() => [] as unknown[]),
          inventoryService.getProducts().catch(() => [] as unknown[]),
          inventoryService.getAssets().catch(() => [] as unknown[]),
          workOrdersService.getWorkOrders().catch(() => [] as DashboardWorkOrder[]),
          inventoryService.getMovements().catch(() => [] as StockMovement[])
        ]);

        setAgreements(agreementsData);
        setLocations(locationsData);
        setProducts(productsData);
        setAssets(assetsData);
        setWorkOrders(workOrdersData);
        setMovements(movementsData);
      } catch (err: any) {
        console.error("Dashboard Loading Error:", err);
        setError("Algunos servicios no respondieron. Mostrando datos parciales.");
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="dashboard-view">
      {error && (
        <div className="badge warning" style={{ width: "100%", padding: "12px", marginBottom: "25px", display: "flex", alignItems: "center", gap: "8px", borderRadius: "8px" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        <MetricCard 
          title="Convenios Activos" 
          value={agreements.length} 
          icon={<FileText size={20} />} 
          color="primary"
          description="Contratos corporativos vigentes"
        />
        <MetricCard 
          title="Bodegas e Instalaciones" 
          value={locations.length} 
          icon={<MapPin size={20} />} 
          color="secondary"
          description="Puntos de stock declarados"
        />
        <MetricCard 
          title="Catálogo de Equipos" 
          value={products.length} 
          icon={<Boxes size={20} />} 
          color="success"
          description="Modelos y marcas únicas"
        />
        <MetricCard 
          title="Total Activos Seriados" 
          value={assets.length} 
          icon={<TrendingUp size={20} />} 
          color="warning"
          description="Equipos físicos monitoreados"
        />
      </div>

      <div className="dashboard-grid">
        {/* Left Side: Recent Work Orders */}
        <div className="glass-panel card-container animate-fade-in">
          <div className="panel-title">
            <span>Órdenes de Trabajo Recientes</span>
            <span className="badge primary">{workOrders.length} Totales</span>
          </div>

          <div className="table-responsive">
            {workOrders.length === 0 ? (
              <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "20px" }}>
                No hay órdenes de trabajo registradas.
              </p>
            ) : (
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Programación</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.slice(0, 5).map((wo) => (
                    <tr key={wo.orden_trabajo_id}>
                      <td style={{ fontWeight: 600 }}>{wo.numero_orden}</td>
                      <td>{new Date(wo.fecha_programada).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${
                          wo.estado === "COMPLETADA" ? "success" : 
                          wo.estado === "CANCELADA" ? "error" : "warning"
                        }`}>
                          {wo.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Recent Movements */}
        <div className="glass-panel card-container animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="panel-title">
            <span>Movimientos de Stock</span>
            <Shuffle size={18} style={{ color: "hsl(var(--text-muted))" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {movements.length === 0 ? (
              <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "20px" }}>
                No hay movimientos de stock recientes.
              </p>
            ) : (
              movements.slice(0, 5).map((m) => (
                <div key={m.movimiento_id} style={{ display: "flex", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.02)", paddingBottom: "12px" }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center" }}>
                    <Shuffle size={16} style={{ color: "hsl(var(--secondary))" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: "0.85rem", fontWeight: 500 }}>{m.motivo}</p>
                    <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))" }}>
                      {new Date(m.creado_en).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
