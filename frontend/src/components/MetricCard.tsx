import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  color?: "primary" | "secondary" | "success" | "warning" | "copec" | "cyan";
  trend?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  description, 
  color = "primary",
  trend
}) => {
  return (
    <div className={`metric-card glass-panel animate-fade-in card-color-${color}`}>
      <div className="metric-card-header">
        <span className="metric-title">{title}</span>
        <div className={`metric-icon-wrapper ${color}`}>
          {icon}
        </div>
      </div>
      <div className="metric-card-body">
        <h3 className="metric-value">{value}</h3>
        {description && <p className="metric-desc">{description}</p>}
        {trend && <span className="metric-trend">{trend}</span>}
      </div>
    </div>
  );
};
export default MetricCard;
