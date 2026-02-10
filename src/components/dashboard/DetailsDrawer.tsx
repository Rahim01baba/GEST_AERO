/**
 * DetailsDrawer - Drawer réutilisable pour drill-down rapide
 */

import { CSSProperties, ReactNode } from 'react';

export interface DetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function DetailsDrawer({ isOpen, onClose, title, children }: DetailsDrawerProps) {
  if (!isOpen) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease'
  };

  const drawerStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '600px',
    maxWidth: '90vw',
    backgroundColor: 'white',
    boxShadow: '-4px 0 12px rgba(0,0,0,0.15)',
    zIndex: 1001,
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInRight 0.3s ease'
  };

  const headerStyle: CSSProperties = {
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    padding: '24px',
    overflow: 'auto'
  };

  const closeButtonStyle: CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  };

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={drawerStyle}>
        <div style={headerStyle}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            {title}
          </h2>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            ×
          </button>
        </div>
        <div style={contentStyle}>{children}</div>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}
      </style>
    </>
  );
}
