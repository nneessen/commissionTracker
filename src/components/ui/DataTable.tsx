import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { DataTableProps, DataTableColumn } from '../../types';

export function DataTable<T>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as any)[sortConfig.key];
      const bValue = (b as any)[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="empty-message">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={column.sortable ? 'sortable' : ''}
                onClick={column.sortable ? () => handleSort(String(column.key)) : undefined}
              >
                <div className="header-content">
                  <span>{column.header}</span>
                  {column.sortable && (
                    <div className="sort-indicators">
                      <ChevronUp
                        size={12}
                        className={
                          sortConfig?.key === column.key && sortConfig.direction === 'asc'
                            ? 'sort-active'
                            : 'sort-inactive'
                        }
                      />
                      <ChevronDown
                        size={12}
                        className={
                          sortConfig?.key === column.key && sortConfig.direction === 'desc'
                            ? 'sort-active'
                            : 'sort-inactive'
                        }
                      />
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, index) => (
            <tr
              key={index}
              className={onRowClick ? 'clickable-row' : ''}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            >
              {columns.map((column) => (
                <td key={String(column.key)}>
                  {column.accessor
                    ? column.accessor(item)
                    : String((item as any)[column.key] || '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}