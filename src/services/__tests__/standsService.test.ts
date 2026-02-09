import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockSelect,
  mockOrder,
  mockEq,
  mockGte,
  mockFrom,
  mockQuery,
  mockQuerySingle,
  mockInsert,
  mockUpdate,
  mockDelete
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockOrder: vi.fn(),
  mockEq: vi.fn(),
  mockGte: vi.fn(),
  mockFrom: vi.fn(),
  mockQuery: vi.fn(),
  mockQuerySingle: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
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
    query: mockQuery,
    querySingle: mockQuerySingle,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

import { StandsService } from '../standsService';

vi.mock('../../lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('StandsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({
      order: mockOrder,
      eq: mockEq,
    });

    mockOrder.mockReturnValue({
      eq: mockEq,
      gte: mockGte,
    });

    mockEq.mockReturnValue({
      eq: mockEq,
      gte: mockGte,
      order: mockOrder,
    });

    mockGte.mockReturnValue({
      order: mockOrder,
    });
  });

  describe('getStands', () => {
    it('fetches all stands without airport filter', async () => {
      const mockStands = [
        { id: '1', name: 'A1', airport_id: 'airport1' },
        { id: '2', name: 'A2', airport_id: 'airport1' },
      ];

      mockQuery.mockResolvedValue(mockStands);

      const result = await StandsService.getStands();

      expect(mockFrom).toHaveBeenCalledWith('stands');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('name', { ascending: true });
      expect(mockQuery).toHaveBeenCalled();
      expect(result).toEqual(mockStands);
    });

    it('fetches stands filtered by airport ID', async () => {
      const mockStands = [
        { id: '1', name: 'A1', airport_id: 'airport1' },
      ];

      mockQuery.mockResolvedValue(mockStands);

      const result = await StandsService.getStands('airport1');

      expect(mockEq).toHaveBeenCalledWith('airport_id', 'airport1');
      expect(result).toEqual(mockStands);
    });
  });

  describe('getStandById', () => {
    it('fetches stand by ID successfully', async () => {
      const mockStand = { id: '1', name: 'A1' };

      mockQuerySingle.mockResolvedValue(mockStand);

      const result = await StandsService.getStandById('1');

      expect(mockFrom).toHaveBeenCalledWith('stands');
      expect(mockEq).toHaveBeenCalledWith('id', '1');
      expect(mockQuerySingle).toHaveBeenCalled();
      expect(result).toEqual(mockStand);
    });
  });

  describe('createStand', () => {
    it('creates stand successfully', async () => {
      const newStand = { name: 'A1', airport_id: 'airport1', max_mtow_kg: 50000 };
      const createdStand = { id: '1', ...newStand };

      mockInsert.mockResolvedValue([createdStand]);

      const result = await StandsService.createStand(newStand);

      expect(mockInsert).toHaveBeenCalledWith(
        'stands',
        newStand,
        'Creating stand'
      );
      expect(result).toEqual(createdStand);
    });
  });

  describe('updateStand', () => {
    it('updates stand successfully', async () => {
      const updates = { name: 'A1-Updated' };
      const updatedStand = { id: '1', name: 'A1-Updated' };

      mockUpdate.mockResolvedValue(updatedStand);

      const result = await StandsService.updateStand('1', updates);

      expect(mockUpdate).toHaveBeenCalledWith(
        'stands',
        '1',
        updates,
        'Updating stand'
      );
      expect(result).toEqual(updatedStand);
    });
  });

  describe('deleteStand', () => {
    it('deletes stand successfully', async () => {
      mockDelete.mockResolvedValue(undefined);

      await StandsService.deleteStand('1');

      expect(mockDelete).toHaveBeenCalledWith(
        'stands',
        '1',
        'Deleting stand'
      );
    });
  });

  describe('getAvailableStands', () => {
    it('fetches available stands with filters', async () => {
      const mockAvailableStands = [
        { id: '1', name: 'A1', max_mtow_kg: 75000, is_blocked: false },
        { id: '2', name: 'A2', max_mtow_kg: 100000, is_blocked: false },
      ];

      mockQuery.mockResolvedValue(mockAvailableStands);

      const result = await StandsService.getAvailableStands(
        'airport1',
        50000,
        '2026-02-09T10:00:00Z'
      );

      expect(mockEq).toHaveBeenCalledWith('airport_id', 'airport1');
      expect(mockEq).toHaveBeenCalledWith('is_blocked', false);
      expect(mockGte).toHaveBeenCalledWith('max_mtow_kg', 50000);
      expect(mockOrder).toHaveBeenCalledWith('name', { ascending: true });
      expect(result).toEqual(mockAvailableStands);
    });
  });
});
