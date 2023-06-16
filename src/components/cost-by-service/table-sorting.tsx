import { useState } from 'react';

type SortConfigType<T> = {
  column: keyof T;
  order: 'asc' | 'desc';
};

export function useTableHeaderSorting<RowType> (
  tableData: RowType[], 
  initialSortConfig: SortConfigType<RowType> = { column: undefined, order: 'asc' }
) {
  const [ sortConfig, setSortConfig ] = useState<SortConfigType<RowType>>(initialSortConfig);

  function sortDataTable () {
    const { column, order } = sortConfig;
    if (!column) return tableData;

    const sortedData = [...tableData].sort((a, b) => {
      if (a[column] < b[column]) return order === 'asc' ? -1 : 1;
      if (a[column] > b[column]) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return sortedData;
  }

  function handleHeaderClick (column: keyof RowType) {
    if (sortConfig.column === column) {
      setSortConfig({
        ...sortConfig,
        order: sortConfig.order === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setSortConfig({ column, order: 'asc' });
    }
  }

  return { handleHeaderClick, sortDataTable };
}