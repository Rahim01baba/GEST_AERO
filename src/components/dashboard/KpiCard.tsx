/**
 * KpiCard - Carte KPI cliquable avec variation et sparkline
 */

import { CSSProperties } from 'react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: string;
  variation?: number; // Pourcentage de variation vs période précédente
  trend?: 'up' | 'down' | 'neutral';
  status?: 'ok' | 'warning' | 'danger';
  sparklineData?: number[];
  loading?: boolean;
  onClick?: () => void;
  subtitle?: string;
}

export function KpiCard({
  title,
  value,
  icon,
  variation,
  trend,
  status = 'ok',
  sparklineData,
  loading,
  onClick,
  subtitle
}: KpiCardProps) {
  // Couleurs selon status
  const statusColors = {
    ok: { border: '#10b981', bg: '#f0fdf4', icon: '#10b981' },
    warning: { border: '#f59e0b', bg: '#fffbeb', icon: '#f59e0b' },
    danger: { border: '#ef4444', bg: '#fef2f2', icon: '#ef4444' }
  };

  const colors = statusColors[status];
  const isClickable = !!onClick;

  const cardStyle: CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderLeft: `4px solid ${colors.border}`,
    cursor: isClickable ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden'
  };

  const hoverStyle: CSSProperties = isClickable
    ? {
        ...cardStyle,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transform: 'translateY(-2px)'
      }
    : cardStyle;

  if (loading) {
    return (
      <div style={cardStyle}>
        <div
          style={{
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTopColor: colors.border,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        if (isClickable) {
          Object.assign(e.currentTarget.style, hoverStyle);
        }
      }}
      onMouseLeave={(e) => {
        if (isClickable) {
          Object.assign(e.currentTarget.style, cardStyle);
        }
      }}
      onClick={onClick}
    >
      {/* Header avec icône */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '12px', color: '#9ca3af' }}>{subtitle}</div>}
        </div>
        {icon && (
          <div
            style={{
              fontSize: '24px',
              width: '48px',
              height: '48px',
              backgroundColor: colors.bg,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Valeur principale */}
      <div style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px' }}>{value}</div>

      {/* Variation et sparkline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        {variation !== undefined && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '14px',
              fontWeight: 600,
              color: trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280'
            }}
          >
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trend === 'neutral' && '→'}
            <span>{Math.abs(variation).toFixed(1)}%</span>
          </div>
        )}

        {sparklineData && sparklineData.length > 0 && (
          <div style={{ flex: 1, maxWidth: '100px', height: '30px', marginLeft: 'auto' }}>
            <MiniSparkline data={sparklineData} color={colors.border} />
          </div>
        )}
      </div>

      {/* Indicateur clickable */}
      {isClickable && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '12px',
            fontSize: '12px',
            color: '#9ca3af',
            fontWeight: 500
          }}
        >
          Cliquer pour détails →
        </div>
      )}
    </div>
  );
}

/**
 * Mini sparkline SVG
 */
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
