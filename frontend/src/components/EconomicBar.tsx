import React, { useState, useEffect } from "react";
import { TrendingUp, RefreshCw, DollarSign, Landmark, Globe, Activity } from "lucide-react";
import { indicatorsService, type IndicadoresEconomicos } from "../services/indicators";

export const EconomicBar: React.FC = () => {
  const [data, setData] = useState<IndicadoresEconomicos | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    const result = await indicatorsService.getIndicators();
    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val?: number, decimals: number = 2) => {
    if (val === undefined || val === null) return "---";
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(val);
  };

  if (!data) return null;

  return (
    <div className="economic-indicators-bar animate-fade-in">
      <div className="eco-header-badge">
        <span className="eco-live-dot"></span>
        <Activity size={14} style={{ color: "#38bdf8" }} />
        <span>Indicadores Económicos</span>
      </div>

      <div className="eco-tickers-container">
        {/* UF (Crucial para cotizaciones y aranceles) */}
        <div className="eco-ticker-item" title="Unidad de Fomento oficial para contratos y cotizaciones">
          <div className="eco-icon-box gold">
            <Landmark size={14} />
          </div>
          <div className="eco-info">
            <span className="eco-label">UF</span>
            <span className="eco-value">{formatCurrency(data.uf?.valor, 2)}</span>
          </div>
        </div>

        {/* Dólar Observado */}
        <div className="eco-ticker-item" title="Dólar observado Banco Central de Chile">
          <div className="eco-icon-box cyan">
            <DollarSign size={14} />
          </div>
          <div className="eco-info">
            <span className="eco-label">Dólar (USD)</span>
            <span className="eco-value">{formatCurrency(data.dolar?.valor, 1)}</span>
          </div>
        </div>

        {/* Euro */}
        <div className="eco-ticker-item" title="Euro Banco Central de Chile">
          <div className="eco-icon-box blue">
            <Globe size={14} />
          </div>
          <div className="eco-info">
            <span className="eco-label">Euro (EUR)</span>
            <span className="eco-value">{formatCurrency(data.euro?.valor, 1)}</span>
          </div>
        </div>

        {/* UTM */}
        <div className="eco-ticker-item" title="Unidad Tributaria Mensual">
          <div className="eco-icon-box purple">
            <TrendingUp size={14} />
          </div>
          <div className="eco-info">
            <span className="eco-label">UTM</span>
            <span className="eco-value">{formatCurrency(data.utm?.valor, 0)}</span>
          </div>
        </div>

        {/* IPC */}
        {data.ipc && (
          <div className="eco-ticker-item" title="Índice de Precios al Consumidor mensual">
            <div className="eco-icon-box teal">
              <span style={{ fontSize: "0.7rem", fontWeight: 700 }}>%</span>
            </div>
            <div className="eco-info">
              <span className="eco-label">IPC</span>
              <span className="eco-value" style={{ color: data.ipc.valor >= 0 ? "#34d399" : "#f87171" }}>
                {data.ipc.valor > 0 ? `+${data.ipc.valor}%` : `${data.ipc.valor}%`}
              </span>
            </div>
          </div>
        )}
      </div>

      <button 
        className="eco-refresh-btn" 
        onClick={loadData} 
        disabled={loading}
        title="Actualizar valores oficiales desde mindicador.cl"
      >
        <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        <span>Actualizar</span>
      </button>
    </div>
  );
};

export default EconomicBar;
