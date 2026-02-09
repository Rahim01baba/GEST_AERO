import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockSelect,
  mockOrder,
  mockGte,
  mockLte,
  mockEq,
  mockIlike,
  mockRange,
  mockMaybeSingle,
  mockFrom,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockRpc
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockOrder: vi.fn(),
  mockGte: vi.fn(),
  mockLte: vi.fn(),
  mockEq: vi.fn(),
  mockIlike: vi.fn(),
  mockRange: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table);
      return {
        select: mockSelect,
      };
    },
  },
  SupabaseClient: {
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    rpc: mockRpc,
  },
}));

import { MovementsService } from '../movementsService';

vi.mock('../../lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('MovementsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({
      order: mockOrder,
      eq: mockEq,
    });

    mockOrder.mockReturnValue({
      gte: mockGte,
      lte: mockLte,
      eq: mockEq,
      ilike: mockIlike,
      range: mockRange,
    });

    mockGte.mockReturnValue({
      lte: mockLte,
      eq: mockEq,
      ilike: mockIlike,
      range: mockRange,
    });

    mockLte.mockReturnValue({
      eq: mockEq,
      ilike: mockIlike,
      range: mockRange,
    });

    mockEq.mockReturnValue({
      eq: mockEq,
      ilike: mockIlike,
      range: mockRange,
      maybeSingle: mockMaybeSingle,
    });

    mockIlike.mockReturnValue({
      ilike: mockIlike,
      range: mockRange,
    });

    mockRange.mockResolvedValue({
      data: [],
      error: null,
      count: 0,
    });

    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });
  });

  describe('getMovements', () => {
    it('fetches movements without filters', async () => {
      const mockMovements = [
        {
          id: '1',
          registration: 'TEST123',
          stands: { name: 'A1' },
        },
      ];

      mockRange.mockResolvedValue({
        data: mockMovements,
        error: null,
        count: 1,
      });

      const result = await MovementsService.getMovements({}, 1, 50);

      expect(mockFrom).toHaveBeenCalledWith('aircraft_movements');
      expect(mockSelect).toHaveBeenCalled();
      expect(mockOrder).toHaveBeenCalledWith('scheduled_time', { ascending: true });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].stand_name).toBe('A1');
      expect(result.total).toBe(1);
    });

    it('applies date filters', async () => {
      mockRange.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      await MovementsService.getMovements({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(mockGte).toHaveBeenCalledWith('scheduled_time', '2026-01-01');
      expect(mockLte).toHaveBeenCalledWith('scheduled_time', '2026-01-31');
    });

    it('applies movement type filter', async () => {
      mockRange.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      await MovementsService.getMovements({ movementType: 'ARR' });

      expect(mockEq).toHaveBeenCalledWith('movement_type', 'ARR');
    });

    it('applies registration filter with ilike', async () => {
      mockRange.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      await MovementsService.getMovements({ registration: 'TEST' });

      expect(mockIlike).toHaveBeenCalledWith('registration', '%TEST%');
    });

    it('calculates pagination correctly', async () => {
      mockRange.mockResolvedValue({
        data: [],
        error: null,
        count: 100,
      });

      const result = await MovementsService.getMovements({}, 2, 20);

      expect(mockRange).toHaveBeenCalledWith(20, 39);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(5);
    });

    it('throws error on database error', async () => {
      const dbError = new Error('Database error');
      mockRange.mockResolvedValue({
        data: null,
        error: dbError,
        count: 0,
      });

      await expect(MovementsService.getMovements({})).rejects.toThrow('Database error');
    });
  });

  describe('getMovementById', () => {
    it('fetches movement by ID successfully', async () => {
      const mockMovement = {
        id: '1',
        registration: 'TEST123',
        stands: { name: 'A1' },
      };

      mockMaybeSingle.mockResolvedValue({
        data: mockMovement,
        error: null,
      });

      const result = await MovementsService.getMovementById('1');

      expect(mockFrom).toHaveBeenCalledWith('aircraft_movements');
      expect(mockEq).toHaveBeenCalledWith('id', '1');
      expect(result.stand_name).toBe('A1');
    });

    it('throws error when movement not found', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(MovementsService.getMovementById('nonexistent')).rejects.toThrow('Movement not found');
    });

    it('throws error on database error', async () => {
      const dbError = new Error('Database error');
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(MovementsService.getMovementById('1')).rejects.toThrow('Database error');
    });
  });

  describe('createMovement', () => {
    it('creates movement successfully', async () => {
      const mockMovement = { registration: 'TEST123' };
      mockInsert.mockResolvedValue([{ id: '1', ...mockMovement }]);

      const result = await MovementsService.createMovement(mockMovement);

      expect(mockInsert).toHaveBeenCalledWith(
        'aircraft_movements',
        mockMovement,
        'Creating movement'
      );
      expect(result.id).toBe('1');
    });
  });

  describe('updateMovement', () => {
    it('updates movement successfully', async () => {
      const mockUpdates = { status: 'Arrived' as const };
      mockUpdate.mockResolvedValue({ id: '1', status: 'Arrived' });

      const result = await MovementsService.updateMovement('1', mockUpdates);

      expect(mockUpdate).toHaveBeenCalledWith(
        'aircraft_movements',
        '1',
        mockUpdates,
        'Updating movement'
      );
      expect(result.status).toBe('Arrived');
    });
  });

  describe('deleteMovement', () => {
    it('deletes movement successfully', async () => {
      mockDelete.mockResolvedValue(undefined);

      await MovementsService.deleteMovement('1');

      expect(mockDelete).toHaveBeenCalledWith(
        'aircraft_movements',
        '1',
        'Deleting movement'
      );
    });
  });
});
