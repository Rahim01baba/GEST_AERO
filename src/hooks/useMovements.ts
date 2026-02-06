import { useState, useEffect, useCallback } from 'react';
import { MovementsService } from '../services/movementsService';
import type { MovementWithStand, MovementFilters, PaginatedResponse } from '../types';
import { logger } from '../lib/logger';
import { PAGINATION } from '../constants/app';

interface UseMovementsOptions {
  autoLoad?: boolean;
  filters?: MovementFilters;
  pageSize?: number;
}

export function useMovements(options: UseMovementsOptions = {}) {
  const {
    autoLoad = true,
    filters: initialFilters,
    pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  } = options;

  const [movements, setMovements] = useState<MovementWithStand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MovementFilters | undefined>(initialFilters);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: PaginatedResponse<MovementWithStand> = await MovementsService.getMovements(
        filters,
        page,
        pageSize
      );

      setMovements(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
      logger.error('Failed to load movements', { error: err });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    if (autoLoad) {
      loadMovements();
    }
  }, [autoLoad, loadMovements]);

  const refetch = useCallback(() => {
    loadMovements();
  }, [loadMovements]);

  const updateFilters = useCallback((newFilters: MovementFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  }, [page, totalPages]);

  const previousPage = useCallback(() => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  }, [page]);

  const goToPage = useCallback((pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setPage(pageNumber);
    }
  }, [totalPages]);

  return {
    movements,
    loading,
    error,
    filters,
    page,
    totalPages,
    total,
    refetch,
    updateFilters,
    nextPage,
    previousPage,
    goToPage,
  };
}
