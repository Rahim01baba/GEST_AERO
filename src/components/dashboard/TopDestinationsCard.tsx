/**
 * TopDestinationsCard - Carte Top Destinations avec toggles métrique et direction
 */

import { useState } from 'react';
import type { TopDestination } from '../../lib/dashboardStats';
import type { TopMetric, DestinationDirection } from '../../lib/dashboardFilters';

export interface TopDestinationsCardProps {
  destinations: TopDestination[];
  loading?: boolean;
  error?: string;
  onMetricChange: (metric: TopMetric) => void;
  onDirectionChange: (direction: DestinationDirection) => void;
  onTitleClick?: () => void;
  onDestinationClick?: (code: string, direction: DestinationDirection) => void;
}

export function TopDestinationsCard({
  destinations,
  loading,
  error,
  onMetricChange,
  onDirectionChange,
  onTitleClick,
  onDestinationClick
}: TopDestinationsCardProps) {
  const [metric, setMetric] = useState<TopMetric>('FLIGHTS');
  const [direction, setDirection] = useState<DestinationDirection>('DEPARTURES');

  const handleMetricChange = (newMetric: TopMetric) => {
    setMetric(newMetric);
    onMetricChange(newMetric);
  };

  const handleDirectionChange = (newDirection: DestinationDirection) => {
    setDirection(newDirection);
    onDirectionChange(newDirection);
  };

  const getMetricLabel = (m: TopMetric): string => {
    switch (m) {
      case 'FLIGHTS':
        return 'Vols';
      case 'PAX':
        return 'Passagers';
      case 'REVENUE':
        return 'CA';
    }
  };

  const formatValue = (value: number, m: TopMetric): string => {
    switch (m) {
      case 'FLIGHTS':
        return value.toFixed(0);
      case 'PAX':
        return value.toFixed(0);
      case 'REVENUE':
        return `${(value / 1000).toFixed(1)}k XOF`;
    }
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const
  };

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🌍</span>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1a1a1a',
              margin: 0,
              cursor: onTitleClick ? 'pointer' : 'default'
            }}
            onClick={onTitleClick}
          >
            Top Destinations
          </h3>
        </div>
        {onTitleClick && (
          <button
            onClick={onTitleClick}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              color: '#3b82f6',
              backgroundColor: 'transparent',
              border: '1px solid #3b82f6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Voir tout
          </button>
        )}
      </div>

      {/* Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {/* Direction toggle */}
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, marginBottom: '6px' }}>
            Sens
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <ToggleButton
              label="Destinations"
              active={direction === 'DEPARTURES'}
              onClick={() => handleDirectionChange('DEPARTURES')}
            />
            <ToggleButton
              label="Provenances"
              active={direction === 'ARRIVALS'}
              onClick={() => handleDirectionChange('ARRIVALS')}
            />
          </div>
        </div>

        {/* Metric toggle */}
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, marginBottom: '6px' }}>
            Métrique
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <ToggleButton
              label={getMetricLabel('FLIGHTS')}
              active={metric === 'FLIGHTS'}
              onClick={() => handleMetricChange('FLIGHTS')}
            />
            <ToggleButton
              label={getMetricLabel('PAX')}
              active={metric === 'PAX'}
              onClick={() => handleMetricChange('PAX')}
            />
            <ToggleButton
              label={getMetricLabel('REVENUE')}
              active={metric === 'REVENUE'}
              onClick={() => handleMetricChange('REVENUE')}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            Chargement...
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {!loading && !error && destinations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            Aucune destination
          </div>
        )}

        {!loading && !error && destinations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {destinations.map((dest, index) => (
              <DestinationItem
                key={dest.code}
                destination={dest}
                index={index}
                metric={metric}
                formatValue={formatValue}
                onClick={() => onDestinationClick?.(dest.code, direction)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Toggle button
 */
function ToggleButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const style = {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: active ? '#3b82f6' : '#f3f4f6',
    color: active ? 'white' : '#6b7280'
  };

  return (
    <button style={style} onClick={onClick}>
      {label}
    </button>
  );
}

/**
 * Un item de destination
 */
function DestinationItem({
  destination,
  index,
  metric,
  formatValue,
  onClick
}: {
  destination: TopDestination;
  index: number;
  metric: TopMetric;
  formatValue: (value: number, metric: TopMetric) => string;
  onClick?: () => void;
}) {
  const isClickable = !!onClick;

  const itemStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    padding: '14px',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
    cursor: isClickable ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    border: '2px solid transparent'
  };

  const hoverStyle = {
    ...itemStyle,
    backgroundColor: '#f3f4f6',
    borderColor: '#3b82f6',
    transform: 'translateX(4px)'
  };

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
  const color = colors[index % colors.length];

  return (
    <div
      style={itemStyle}
      onMouseEnter={(e) => {
        if (isClickable) Object.assign(e.currentTarget.style, hoverStyle);
      }}
      onMouseLeave={(e) => {
        if (isClickable) Object.assign(e.currentTarget.style, itemStyle);
      }}
      onClick={onClick}
    >
      {/* Code + Nom + Valeur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: color,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 700,
            flexShrink: 0
          }}
        >
          {index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>
            {destination.code}
          </div>
          {destination.name && (
            <div
              style={{
                fontSize: '12px',
                color: '#6b7280',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {destination.name}
            </div>
          )}
        </div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a', textAlign: 'right' }}>
          {formatValue(destination.value, metric)}
        </div>
      </div>

      {/* Barre de progression */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            flex: 1,
            height: '8px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${destination.share}%`,
              height: '100%',
              backgroundColor: color,
              transition: 'width 0.5s ease'
            }}
          />
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#6b7280',
            fontWeight: 600,
            minWidth: '50px',
            textAlign: 'right'
          }}
        >
          {destination.share.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
