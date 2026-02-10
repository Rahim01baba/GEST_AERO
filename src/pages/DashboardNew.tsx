/**
 * Dashboard visuel refondé - 100% cliquable avec drill-down
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { FilterBar } from '../components/dashboard/FilterBar';
import { KpiCard } from '../components/dashboard/KpiCard';
import { TopCard } from '../components/dashboard/TopCard';
import { TopDestinationsCard } from '../components/dashboard/TopDestinationsCard';
import { DetailsDrawer } from '../components/dashboard/DetailsDrawer';
import { supabase } from '../lib/supabase';
import { toUserMessage } from '../lib/errorHandler';
import { logger } from '../lib/logger';
import {
  buildDashboardFiltersFromUrl,
  updateUrlFilters,
  buildNavigationUrl,
  type DashboardFilters,
  type TopMetric,
  type DestinationDirection
} from '../lib/dashboardFilters';
import {
  getMovementsStats,
  getTrafficTimeseries,
  getBillingStats,
  getRevenueTimeseries,
  getTopDestinations,
  getTopAirlines,
  getParkingStats,
  getTopOverdueInvoices,
  type MovementsStats,
  type BillingStats,
  type ParkingStats,
  type TrafficDataPoint,
  type RevenueDataPoint,
  type TopDestination,
  type TopAirline,
  type OverdueInvoice
} from '../lib/dashboardStats';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatXOF } from '../lib/billing';

interface Airport {
  id: string;
  name: string;
  iata_code: string;
}

interface Airline {
  code: string;
  name: string;
}

export function DashboardNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Filtres
  const [filters, setFilters] = useState<DashboardFilters>(() => buildDashboardFiltersFromUrl(searchParams));
  const [airports, setAirports] = useState<Airport[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);

  // Stats
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movementsStats, setMovementsStats] = useState<MovementsStats | null>(null);
  const [billingStats, setBillingStats] = useState<BillingStats | null>(null);
  const [parkingStats, setParkingStats] = useState<ParkingStats | null>(null);

  // Séries temporelles
  const [trafficData, setTrafficData] = useState<TrafficDataPoint[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);

  // Tops
  const [destinationsMetric, setDestinationsMetric] = useState<TopMetric>('FLIGHTS');
  const [destinationsDirection, setDestinationsDirection] = useState<DestinationDirection>('DEPARTURES');
  const [topDestinations, setTopDestinations] = useState<TopDestination[]>([]);
  const [topAirlines, setTopAirlines] = useState<TopAirline[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);

  // Drawer
  const [drawerOpen] = useState(false);
  const [drawerContent] = useState<{ title: string; content: string } | null>(null);

  // Charger airports et airlines au montage
  useEffect(() => {
    loadReferentials();
  }, []);

  // Charger données quand filtres changent
  useEffect(() => {
    loadDashboardData();
  }, [filters, destinationsMetric, destinationsDirection]);

  // Synchroniser filtres avec URL
  const handleFiltersChange = (newFilters: DashboardFilters) => {
    setFilters(newFilters);
    updateUrlFilters((url) => navigate(url, { replace: true }), newFilters);
  };

  const loadReferentials = async () => {
    try {
      const [airportsRes, airlinesRes] = await Promise.all([
        supabase.from('airports').select('id, name, iata_code').order('name'),
        supabase.from('aircraft_movements').select('airline_code, airline_name').limit(1000)
      ]);

      if (airportsRes.data) {
        setAirports(airportsRes.data);
      }

      // Extraire les compagnies uniques
      if (airlinesRes.data) {
        const uniqueAirlines = new Map<string, string>();
        airlinesRes.data.forEach((m) => {
          if (m.airline_code && !uniqueAirlines.has(m.airline_code)) {
            uniqueAirlines.set(m.airline_code, m.airline_name || m.airline_code);
          }
        });
        setAirlines(
          Array.from(uniqueAirlines.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => a.code.localeCompare(b.code))
        );
      }
    } catch (err) {
      logger.error('Error loading referentials', { error: err });
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        movements,
        billing,
        parking,
        traffic,
        revenue,
        destinations,
        airlines,
        overdue
      ] = await Promise.all([
        getMovementsStats(filters),
        getBillingStats(filters),
        getParkingStats(filters),
        getTrafficTimeseries(filters),
        getRevenueTimeseries(filters),
        getTopDestinations(filters, destinationsMetric, destinationsDirection, 5),
        getTopAirlines(filters, 'FLIGHTS', 5),
        getTopOverdueInvoices(filters, 10)
      ]);

      setMovementsStats(movements);
      setBillingStats(billing);
      setParkingStats(parking);
      setTrafficData(traffic);
      setRevenueData(revenue);
      setTopDestinations(destinations);
      setTopAirlines(airlines);
      setOverdueInvoices(overdue);
    } catch (err: unknown) {
      const msg = toUserMessage(err);
      setError(msg);
      logger.error('Error loading dashboard data', { error: err });
    } finally {
      setLoading(false);
    }
  };

  // Navigation vers page avec filtres
  const navigateToPage = (path: string, additionalParams?: Record<string, string | undefined>) => {
    const url = buildNavigationUrl(path, filters, additionalParams);
    navigate(url);
  };

  // Handlers drill-down
  const handleMovementsClick = () => navigateToPage('/movements');
  const handleBillingClick = () => navigateToPage('/billing');
  const handleParkingClick = () => navigateToPage('/parking', { occupied: 'true' });

  const handleDestinationClick = (code: string, direction: DestinationDirection) => {
    const param: Record<string, string | undefined> = direction === 'DEPARTURES'
      ? { destination: code, origin: undefined }
      : { origin: code, destination: undefined };
    navigateToPage('/movements', param);
  };

  const handleAirlineClick = (airlineCode: string) => {
    navigateToPage('/movements', { airline_code: airlineCode });
  };

  const handleOverdueClick = (invoiceId: string) => {
    navigate(`/billing/${invoiceId}`);
  };

  if (!user) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          Veuillez vous connecter
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px 0' }}>
            Dashboard Opérationnel
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', margin: 0 }}>
            Vue d'ensemble des opérations, du trafic et de la facturation
          </p>
        </div>

        {/* Filtres */}
        <FilterBar
          filters={filters}
          airports={airports}
          airlines={airlines}
          onFiltersChange={handleFiltersChange}
          loading={loading}
        />

        {/* Erreur */}
        {error && (
          <div
            style={{
              padding: '20px',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              color: '#ef4444',
              marginBottom: '24px',
              border: '1px solid #fecaca'
            }}
          >
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '32px'
          }}
        >
          {/* Mouvements total */}
          <KpiCard
            title="Mouvements total"
            value={movementsStats?.total || 0}
            icon="✈️"
            status="ok"
            loading={loading}
            onClick={handleMovementsClick}
          />

          {/* Arrivées */}
          <KpiCard
            title="Arrivées"
            value={movementsStats?.arrivals || 0}
            icon="🛬"
            status="ok"
            loading={loading}
            onClick={() => navigateToPage('/movements', { ad: 'ARR' })}
          />

          {/* Départs */}
          <KpiCard
            title="Départs"
            value={movementsStats?.departures || 0}
            icon="🛫"
            status="ok"
            loading={loading}
            onClick={() => navigateToPage('/movements', { ad: 'DEP' })}
          />

          {/* Régularité */}
          <KpiCard
            title="Régularité"
            subtitle="Mouvements à l'heure (±15 min)"
            value={`${(movementsStats?.onTimeRate || 0).toFixed(1)}%`}
            icon="⏱️"
            status={
              (movementsStats?.onTimeRate || 0) >= 80
                ? 'ok'
                : (movementsStats?.onTimeRate || 0) >= 70
                ? 'warning'
                : 'danger'
            }
            loading={loading}
            onClick={handleMovementsClick}
          />

          {/* Retard moyen */}
          <KpiCard
            title="Retard moyen"
            value={`${Math.abs(movementsStats?.delayAvg || 0).toFixed(0)} min`}
            icon="⏳"
            status={(movementsStats?.delayAvg || 0) > 30 ? 'warning' : 'ok'}
            loading={loading}
          />

          {/* Annulations */}
          <KpiCard
            title="Annulations"
            value={movementsStats?.cancellations || 0}
            icon="❌"
            status={(movementsStats?.cancellations || 0) > 5 ? 'danger' : 'ok'}
            loading={loading}
            onClick={() => navigateToPage('/movements', { status: 'CANCELLED' })}
          />

          {/* MTOW moyen */}
          <KpiCard
            title="MTOW moyen"
            subtitle="Masse décollage moyenne"
            value={`${((movementsStats?.mtowAvg || 0) / 1000).toFixed(1)}t`}
            icon="⚖️"
            status="ok"
            loading={loading}
          />

          {/* Parking occupé */}
          <KpiCard
            title="Parkings occupés"
            value={`${parkingStats?.occupied || 0} / ${parkingStats?.capacity || 0}`}
            icon="🅿️"
            status={(parkingStats?.occupancyRate || 0) > 90 ? 'warning' : 'ok'}
            loading={loading}
            onClick={handleParkingClick}
          />

          {/* CA facturé */}
          <KpiCard
            title="CA Facturé"
            value={formatXOF(billingStats?.billedTotal || 0)}
            icon="💰"
            status="ok"
            loading={loading}
            onClick={handleBillingClick}
          />

          {/* CA encaissé */}
          <KpiCard
            title="CA Encaissé"
            value={formatXOF(billingStats?.collectedTotal || 0)}
            icon="✅"
            status="ok"
            loading={loading}
            onClick={() => navigateToPage('/billing', { invoice_status: 'PAID' })}
          />

          {/* Taux recouvrement */}
          <KpiCard
            title="Taux recouvrement"
            value={`${(billingStats?.recoveryRate || 0).toFixed(1)}%`}
            icon="📊"
            status={
              (billingStats?.recoveryRate || 0) >= 80
                ? 'ok'
                : (billingStats?.recoveryRate || 0) >= 60
                ? 'warning'
                : 'danger'
            }
            loading={loading}
            onClick={handleBillingClick}
          />

          {/* Impayés */}
          <KpiCard
            title="Impayés total"
            value={formatXOF(billingStats?.overdueTotal || 0)}
            icon="⚠️"
            status={(billingStats?.overdueTotal || 0) > 1000000 ? 'danger' : 'ok'}
            loading={loading}
            onClick={() => navigateToPage('/billing', { invoice_status: 'OVERDUE' })}
          />
        </div>

        {/* Graphiques */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '24px',
            marginBottom: '32px'
          }}
        >
          {/* Graphique Trafic */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '20px' }}>
              Trafic quotidien
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Bar dataKey="arrivals" fill="#10b981" name="Arrivées" />
                <Bar dataKey="departures" fill="#3b82f6" name="Départs" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Graphique CA */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '20px' }}>
              Chiffre d'affaires
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                  formatter={(value: unknown) => formatXOF(Number(value))}
                />
                <Legend />
                <Line type="monotone" dataKey="billed" stroke="#f59e0b" name="Facturé" strokeWidth={2} />
                <Line type="monotone" dataKey="collected" stroke="#10b981" name="Encaissé" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tops et Alertes */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px'
          }}
        >
          {/* Top Destinations */}
          <TopDestinationsCard
            destinations={topDestinations}
            loading={loading}
            onMetricChange={setDestinationsMetric}
            onDirectionChange={setDestinationsDirection}
            onDestinationClick={handleDestinationClick}
          />

          {/* Top Compagnies */}
          <TopCard
            title="Top Compagnies"
            icon="🏢"
            items={topAirlines.map((a) => ({
              label: a.airline_name || a.airline,
              code: a.airline,
              value: a.value,
              share: a.share,
              onClick: () => handleAirlineClick(a.airline)
            }))}
            loading={loading}
            valueFormatter={(v) => v.toFixed(0)}
          />

          {/* Impayés à relancer */}
          <TopCard
            title="Impayés à relancer"
            icon="⚠️"
            items={overdueInvoices.map((inv) => ({
              label: `${inv.invoice_number} - ${inv.customer_name || 'Client inconnu'}`,
              code: inv.invoice_id,
              value: inv.amount,
              share: (inv.amount / (billingStats?.overdueTotal || 1)) * 100,
              onClick: () => handleOverdueClick(inv.invoice_id)
            }))}
            loading={loading}
            emptyMessage="Aucun impayé"
            valueFormatter={(v) => formatXOF(v)}
          />
        </div>
      </div>

      {/* Drawer (optionnel pour drill-down rapide - non utilisé pour l'instant) */}
      {drawerContent && drawerOpen && (
        <DetailsDrawer
          isOpen={drawerOpen}
          onClose={() => {
            // setDrawerOpen(false);
          }}
          title={drawerContent.title}
        >
          <div>{drawerContent.content}</div>
        </DetailsDrawer>
      )}
    </Layout>
  );
}
