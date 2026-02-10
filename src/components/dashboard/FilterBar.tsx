/**
 * FilterBar - Bandeau de filtres sticky synchronisé avec l'URL
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type {
  DashboardFilters,
  MovementDirection,
  InvoiceStatus,
  DateRangePreset
} from '../../lib/dashboardFilters';
import { getDefaultFilters, getDateRangeLabel } from '../../lib/dashboardFilters';

interface Airport {
  id: string;
  name: string;
  iata_code: string;
}

interface Airline {
  code: string;
  name: string;
}

interface FilterBarProps {
  filters: DashboardFilters;
  airports: Airport[];
  airlines: Airline[];
  onFiltersChange: (filters: DashboardFilters) => void;
  loading?: boolean;
}

export function FilterBar({ filters, airports, airlines, onFiltersChange, loading }: FilterBarProps) {
  const [preset, setPreset] = useState<DateRangePreset>(filters.preset || 'MONTH');
  const [customDateFrom, setCustomDateFrom] = useState(format(new Date(filters.date_from), 'yyyy-MM-dd'));
  const [customDateTo, setCustomDateTo] = useState(format(new Date(filters.date_to), 'yyyy-MM-dd'));
  const [showCustomDates, setShowCustomDates] = useState(preset === 'CUSTOM');

  useEffect(() => {
    setShowCustomDates(preset === 'CUSTOM');
  }, [preset]);

  const handlePresetChange = (newPreset: DateRangePreset) => {
    setPreset(newPreset);
    if (newPreset !== 'CUSTOM') {
      onFiltersChange({ ...filters, preset: newPreset });
    } else {
      setShowCustomDates(true);
    }
  };

  const handleCustomDateApply = () => {
    if (customDateFrom && customDateTo) {
      onFiltersChange({
        ...filters,
        date_from: new Date(customDateFrom + 'T00:00:00').toISOString(),
        date_to: new Date(customDateTo + 'T23:59:59').toISOString(),
        preset: 'CUSTOM'
      });
    }
  };

  const handleReset = () => {
    const defaults = getDefaultFilters();
    setPreset('MONTH');
    setShowCustomDates(false);
    setCustomDateFrom(format(new Date(defaults.date_from), 'yyyy-MM-dd'));
    setCustomDateTo(format(new Date(defaults.date_to), 'yyyy-MM-dd'));
    onFiltersChange(defaults);
  };

  const filterBarStyle = {
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderTop: '4px solid #3b82f6'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'white',
    color: '#1a1a1a',
    outline: 'none'
  };

  const buttonStyle = {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '6px',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.5 : 1,
    transition: 'all 0.2s ease',
    border: 'none'
  };

  return (
    <div style={filterBarStyle}>
      {/* Titre */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 4px 0' }}>
          Filtres du Dashboard
        </h3>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
          {getDateRangeLabel(preset, filters.date_from, filters.date_to)}
        </p>
      </div>

      {/* Grille de filtres */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Aéroport */}
        {airports.length > 1 && (
          <div>
            <label style={labelStyle}>Aéroport</label>
            <select
              style={inputStyle}
              value={filters.airport_id || ''}
              onChange={(e) => onFiltersChange({ ...filters, airport_id: e.target.value || undefined })}
              disabled={loading}
            >
              <option value="">Tous</option>
              {airports.map((airport) => (
                <option key={airport.id} value={airport.id}>
                  {airport.iata_code} - {airport.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Période */}
        <div>
          <label style={labelStyle}>Période</label>
          <select
            style={inputStyle}
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value as DateRangePreset)}
            disabled={loading}
          >
            <option value="TODAY">Aujourd'hui</option>
            <option value="7DAYS">7 derniers jours</option>
            <option value="MONTH">Mois en cours</option>
            <option value="CUSTOM">Personnalisée...</option>
          </select>
        </div>

        {/* A/D */}
        <div>
          <label style={labelStyle}>Type mouvement</label>
          <select
            style={inputStyle}
            value={filters.ad}
            onChange={(e) => onFiltersChange({ ...filters, ad: e.target.value as MovementDirection })}
            disabled={loading}
          >
            <option value="ALL">Tous (A+D)</option>
            <option value="ARR">Arrivées uniquement</option>
            <option value="DEP">Départs uniquement</option>
          </select>
        </div>

        {/* Compagnie */}
        {airlines.length > 0 && (
          <div>
            <label style={labelStyle}>Compagnie</label>
            <select
              style={inputStyle}
              value={filters.airline_code || ''}
              onChange={(e) => onFiltersChange({ ...filters, airline_code: e.target.value || undefined })}
              disabled={loading}
            >
              <option value="">Toutes</option>
              {airlines.map((airline) => (
                <option key={airline.code} value={airline.code}>
                  {airline.code} - {airline.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Statut facture */}
        <div>
          <label style={labelStyle}>Statut facture</label>
          <select
            style={inputStyle}
            value={filters.invoice_status}
            onChange={(e) => onFiltersChange({ ...filters, invoice_status: e.target.value as InvoiceStatus })}
            disabled={loading}
          >
            <option value="ALL">Tous</option>
            <option value="DRAFT">Brouillon</option>
            <option value="ISSUED">Émise</option>
            <option value="PAID">Payée</option>
            <option value="OVERDUE">En retard</option>
          </select>
        </div>

        {/* Zone parking */}
        <div>
          <label style={labelStyle}>Zone parking</label>
          <input
            type="text"
            style={inputStyle}
            placeholder="Ex: A, B, C..."
            value={filters.parking_zone || ''}
            onChange={(e) => onFiltersChange({ ...filters, parking_zone: e.target.value || undefined })}
            disabled={loading}
          />
        </div>
      </div>

      {/* Dates personnalisées */}
      {showCustomDates && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px'
          }}
        >
          <div>
            <label style={labelStyle}>Date début</label>
            <input
              type="date"
              style={inputStyle}
              value={customDateFrom}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label style={labelStyle}>Date fin</label>
            <input
              type="date"
              style={inputStyle}
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              disabled={loading}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={handleCustomDateApply}
              disabled={loading}
              style={{
                ...buttonStyle,
                backgroundColor: '#3b82f6',
                color: 'white',
                width: '100%'
              }}
            >
              Appliquer
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={handleReset}
          disabled={loading}
          style={{
            ...buttonStyle,
            backgroundColor: '#f3f4f6',
            color: '#374151'
          }}
        >
          Réinitialiser
        </button>
      </div>
    </div>
  );
}
