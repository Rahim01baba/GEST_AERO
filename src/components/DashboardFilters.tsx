import { useState, useEffect } from 'react'
import { startOfMonth, endOfMonth, format } from 'date-fns'

interface DashboardFiltersProps {
  onApply: (filters: FilterValues) => void
  airports?: Array<{ id: string; name: string; iata_code: string }>
  userAirportId?: string
  isAdmin?: boolean
}

export interface FilterValues {
  startDate: string
  endDate: string
  airportId?: string
}

export function DashboardFilters({ onApply, airports, userAirportId, isAdmin }: DashboardFiltersProps) {
  const today = new Date()
  const defaultStart = startOfMonth(today)
  const defaultEnd = endOfMonth(today)

  const [startDate, setStartDate] = useState(format(defaultStart, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(defaultEnd, 'yyyy-MM-dd'))
  const [selectedAirport, setSelectedAirport] = useState(userAirportId || '')
  const [error, setError] = useState('')

  useEffect(() => {
    handleApply()
  }, [])

  const handleApply = () => {
    if (!startDate || !endDate) {
      setError('Les deux dates sont requises')
      return
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('La date de fin doit être après la date de début')
      return
    }

    setError('')

    const filters: FilterValues = {
      startDate: new Date(startDate + 'T00:00:00').toISOString(),
      endDate: new Date(endDate + 'T23:59:59').toISOString()
    }

    if (selectedAirport) {
      filters.airportId = selectedAirport
    }

    onApply(filters)
  }

  const handleReset = () => {
    setStartDate(format(defaultStart, 'yyyy-MM-dd'))
    setEndDate(format(defaultEnd, 'yyyy-MM-dd'))
    setSelectedAirport(userAirportId || '')
    setError('')

    setTimeout(() => {
      onApply({
        startDate: defaultStart.toISOString(),
        endDate: new Date(format(defaultEnd, 'yyyy-MM-dd') + 'T23:59:59').toISOString(),
        airportId: userAirportId || undefined
      })
    }, 0)
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '32px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 600,
        marginBottom: '20px',
        color: '#1a1a1a'
      }}>
        Filtres
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isAdmin && airports ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
        gap: '16px',
        marginBottom: '16px'
      }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 500,
            marginBottom: '8px',
            color: '#374151'
          }}>
            Date de début
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 500,
            marginBottom: '8px',
            color: '#374151'
          }}>
            Date de fin
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        {isAdmin && airports && airports.length > 1 && (
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '8px',
              color: '#374151'
            }}>
              Aéroport
            </label>
            <select
              value={selectedAirport}
              onChange={(e) => setSelectedAirport(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="">Tous les aéroports</option>
              {airports.map((airport) => (
                <option key={airport.id} value={airport.id}>
                  {airport.iata_code} - {airport.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderRadius: '6px',
          fontSize: '14px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleApply}
          style={{
            padding: '10px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Appliquer
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '10px 24px',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Réinitialiser
        </button>
      </div>
    </div>
  )
}
