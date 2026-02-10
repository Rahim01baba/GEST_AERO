/**
 * TopCard - Carte pour afficher des Top X (destinations, compagnies, etc.)
 */

import { CSSProperties } from 'react';

export interface TopItem {
  label: string;
  value: number;
  share: number; // Pourcentage
  code?: string;
  onClick?: () => void;
}

export interface TopCardProps {
  title: string;
  items: TopItem[];
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  onTitleClick?: () => void;
  icon?: string;
  valueFormatter?: (value: number) => string;
}

export function TopCard({
  title,
  items,
  loading,
  error,
  emptyMessage = 'Aucune donnée',
  onTitleClick,
  icon,
  valueFormatter = (v) => v.toString()
}: TopCardProps) {
  const cardStyle: CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
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
          {icon && <span style={{ fontSize: '20px' }}>{icon}</span>}
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
            {title}
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

        {!loading && !error && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            {emptyMessage}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map((item, index) => (
              <TopItem
                key={item.code || item.label || index}
                item={item}
                index={index}
                valueFormatter={valueFormatter}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Un item du Top
 */
function TopItem({
  item,
  index,
  valueFormatter
}: {
  item: TopItem;
  index: number;
  valueFormatter: (v: number) => string;
}) {
  const isClickable = !!item.onClick;

  const itemStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
    cursor: isClickable ? 'pointer' : 'default',
    transition: 'all 0.2s ease'
  };

  const hoverStyle: CSSProperties = {
    ...itemStyle,
    backgroundColor: '#f3f4f6',
    transform: 'translateX(4px)'
  };

  // Couleur du badge selon le rang
  const badgeColor = index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : index === 2 ? '#f59e0b' : '#6b7280';

  return (
    <div
      style={itemStyle}
      onMouseEnter={(e) => {
        if (isClickable) Object.assign(e.currentTarget.style, hoverStyle);
      }}
      onMouseLeave={(e) => {
        if (isClickable) Object.assign(e.currentTarget.style, itemStyle);
      }}
      onClick={item.onClick}
    >
      {/* Première ligne : Badge + Label + Valeur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: badgeColor,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 600,
            flexShrink: 0
          }}
        >
          {index + 1}
        </div>
        <div style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>
          {item.label}
          {item.code && <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: '6px' }}>({item.code})</span>}
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a' }}>{valueFormatter(item.value)}</div>
      </div>

      {/* Barre de progression */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            flex: 1,
            height: '6px',
            backgroundColor: '#e5e7eb',
            borderRadius: '3px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${item.share}%`,
              height: '100%',
              backgroundColor: badgeColor,
              transition: 'width 0.5s ease'
            }}
          />
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, minWidth: '45px', textAlign: 'right' }}>
          {item.share.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
