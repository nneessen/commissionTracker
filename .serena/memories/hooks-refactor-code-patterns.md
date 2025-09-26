# Code Patterns for Hook Refactoring

## Template for List Hook (useEntities)
```typescript
export function useEntities(): UseEntitiesResult {
  const [entities, setEntities] = useLocalStorageState<Entity[]>(STORAGE_KEY, []);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Parse dates if needed
  useEffect(() => {
    // Date parsing logic
    setIsLoading(false);
  }, [refreshKey]);

  // Apply filtering
  const { filteredData, filters, setFilters, clearFilters, filterCount } = 
    useFilter<Entity>(entities);

  // Apply sorting  
  const { sortedData, sortConfig, setSortConfig, toggleSort, clearSort } = 
    useSort<Entity>(filteredData, {
      initialSort: { field: 'createdAt', direction: 'desc' }
    });

  // Apply pagination
  const { paginatedData, pagination, goToPage, nextPage, previousPage, setPageSize } = 
    usePagination<Entity>(sortedData, {
      initialPageSize: 10,
      pageSizeOptions: [10, 25, 50, 100]
    });

  return {
    entities: sortedData,
    paginatedEntities: paginatedData,
    isLoading,
    // ... pagination, filter, sort returns
  };
}
```

## Template for Create Hook
```typescript
export function useCreateEntity(): UseCreateEntityResult {
  const [entities, setEntities] = useLocalStorageState<Entity[]>(STORAGE_KEY, []);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEntity = (formData: NewEntityForm): Entity | null => {
    setIsCreating(true);
    setError(null);

    try {
      // Validation logic
      // Check duplicates
      // Create entity with uuidv4()
      
      setEntities(prev => [...prev, newEntity]);
      setIsCreating(false);
      return newEntity;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
      setIsCreating(false);
      return null;
    }
  };

  const clearError = () => setError(null);

  return { createEntity, isCreating, error, clearError };
}
```

## Testing Pattern
```typescript
describe('useEntities', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('should handle pagination correctly', () => {
    // Create large dataset
    const manyEntities = Array.from({ length: 35 }, (_, i) => ({
      ...mockEntity,
      id: `entity-${i}`,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
    }));

    localStorageMock.setItem('storage-key', JSON.stringify(manyEntities));
    const { result } = renderHook(() => useEntities());

    // Test pagination
    expect(result.current.paginatedEntities).toHaveLength(10);
    expect(result.current.totalPages).toBe(4);
  });
});
```

## Key Rules
1. NO useCallback or useMemo
2. Simple function definitions
3. Default page size: 10
4. Always include error handling
5. Always include clearError function
6. Use uuidv4() for IDs
7. Parse dates when loading from localStorage