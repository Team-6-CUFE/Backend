import { buildPaginationResponse } from './pagination.util';

describe('buildPaginationResponse', () => {
  const data = ['a', 'b', 'c'];

  it('should return data and pagination object', () => {
    const result = buildPaginationResponse(data, 30, 1, 10);

    expect(result.data).toBe(data);
    expect(result.pagination).toEqual({
      currentPage: 1,
      totalPages: 3,
      totalCount: 30,
      limit: 10,
    });
  });

  it('should calculate totalPages correctly using ceiling', () => {
    const result = buildPaginationResponse([], 21, 1, 10);

    expect(result.pagination.totalPages).toBe(3);
  });

  it('should return totalPages 1 when total equals limit', () => {
    const result = buildPaginationResponse(data, 10, 1, 10);

    expect(result.pagination.totalPages).toBe(1);
  });

  it('should return totalPages 0 when total is 0', () => {
    const result = buildPaginationResponse([], 0, 1, 10);

    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.totalCount).toBe(0);
  });

  it('should reflect the correct currentPage', () => {
    const result = buildPaginationResponse(data, 100, 5, 20);

    expect(result.pagination.currentPage).toBe(5);
    expect(result.pagination.totalPages).toBe(5);
  });

  it('should work with generic typed data', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const result = buildPaginationResponse(items, 2, 1, 10);

    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('should preserve limit in pagination', () => {
    const result = buildPaginationResponse([], 50, 2, 25);

    expect(result.pagination.limit).toBe(25);
  });
});
