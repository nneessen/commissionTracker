// src/features/dashboard/components/DataTableDense.tsx
import React, { memo, useCallback, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  Filter,
  Download,
  MoreVertical,
  Eye,
  Edit,
  Trash,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface Column<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

interface DataTableDenseProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  actions?: {
    label: string;
    icon?: React.ElementType;
    onClick: (row: T) => void;
    variant?: "default" | "destructive";
  }[];
  searchable?: boolean;
  searchPlaceholder?: string;
  loading?: boolean;
  className?: string;
  height?: string;
  rowHeight?: number;
  virtualized?: boolean;
}

// Sort direction type
type SortDirection = "asc" | "desc" | null;

// Skeleton loader for table rows
const TableSkeleton = memo(({ columns }: { columns: Column<any>[] }) => (
  <>
    {[...Array(5)].map((_, i) => (
      <TableRow key={i}>
        {columns.map((col, j) => (
          <TableCell key={j} className="animate-pulse">
            <div className="h-3 bg-muted rounded w-3/4" />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
));

TableSkeleton.displayName = "TableSkeleton";

// Sort icon component
const SortIcon = memo(({ direction }: { direction: SortDirection }) => {
  if (direction === "asc") {
    return <ChevronUp className="w-3 h-3" />;
  }
  if (direction === "desc") {
    return <ChevronDown className="w-3 h-3" />;
  }
  return <ChevronsUpDown className="w-3 h-3 opacity-50" />;
});

SortIcon.displayName = "SortIcon";

export function DataTableDense<T extends Record<string, any>>({
  title,
  data,
  columns,
  onRowClick,
  actions,
  searchable = true,
  searchPlaceholder = "Search...",
  loading = false,
  className,
  height = "420px",
  rowHeight = 36,
  virtualized = true,
}: DataTableDenseProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchTerm) {
      result = result.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        if (aValue === bValue) return 0;

        const comparison = aValue < bValue ? -1 : 1;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchTerm, sortColumn, sortDirection]);

  // Handle sort toggle
  const handleSort = useCallback((columnKey: string) => {
    if (sortColumn === columnKey) {
      // Cycle through: null -> asc -> desc -> null
      setSortDirection((prev) =>
        prev === null ? "asc" : prev === "asc" ? "desc" : null
      );
      if (sortDirection === "desc") {
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  }, [sortColumn, sortDirection]);

  // Virtualizer setup
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: processedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Render table content
  const renderTableContent = () => {
    if (loading) {
      return <TableSkeleton columns={columns} />;
    }

    if (processedData.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={columns.length + (actions ? 1 : 0)}
            className="h-32 text-center text-muted-foreground"
          >
            No data available
          </TableCell>
        </TableRow>
      );
    }

    if (virtualized && processedData.length > 20) {
      return (
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: `${parseInt(height) - 120}px` }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualItems.map((virtualRow) => {
              const row = processedData[virtualRow.index];
              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <Table>
                    <TableBody>
                      <TableRow
                        className={cn(
                          "hover:bg-muted/50 transition-colors",
                          onRowClick && "cursor-pointer"
                        )}
                        onClick={() => onRowClick?.(row)}
                      >
                        {columns.map((column) => (
                          <TableCell
                            key={String(column.key)}
                            className={cn("text-sm py-2", column.className)}
                            style={{ width: column.width }}
                          >
                            {column.render
                              ? column.render(row[column.key], row)
                              : row[column.key]}
                          </TableCell>
                        ))}
                        {actions && (
                          <TableCell className="w-8">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {actions.map((action, i) => {
                                  const Icon = action.icon;
                                  return (
                                    <DropdownMenuItem
                                      key={i}
                                      onClick={() => action.onClick(row)}
                                      className={cn(
                                        action.variant === "destructive" &&
                                          "text-destructive"
                                      )}
                                    >
                                      {Icon && <Icon className="mr-2 h-3 w-3" />}
                                      {action.label}
                                    </DropdownMenuItem>
                                  );
                                })}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Non-virtualized rendering for small datasets
    return processedData.map((row, index) => (
      <TableRow
        key={index}
        className={cn(
          "hover:bg-muted/50 transition-colors",
          onRowClick && "cursor-pointer"
        )}
        onClick={() => onRowClick?.(row)}
      >
        {columns.map((column) => (
          <TableCell
            key={String(column.key)}
            className={cn("text-sm py-2", column.className)}
            style={{ width: column.width }}
          >
            {column.render
              ? column.render(row[column.key], row)
              : row[column.key]}
          </TableCell>
        ))}
        {actions && (
          <TableCell className="w-8">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <DropdownMenuItem
                      key={i}
                      onClick={() => action.onClick(row)}
                      className={cn(
                        action.variant === "destructive" && "text-destructive"
                      )}
                    >
                      {Icon && <Icon className="mr-2 h-3 w-3" />}
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        )}
      </TableRow>
    ));
  };

  return (
    <Card className={cn("p-4", className)} style={{ height }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[16px] font-[600]">{title}</h3>
        <div className="flex items-center gap-2">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 w-48 pl-7 text-sm"
              />
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Filter className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={cn(
                    "text-[11px] font-medium h-8 py-1",
                    column.sortable && "cursor-pointer select-none",
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={
                    column.sortable
                      ? () => handleSort(String(column.key))
                      : undefined
                  }
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && (
                      <SortIcon
                        direction={
                          sortColumn === String(column.key)
                            ? sortDirection
                            : null
                        }
                      />
                    )}
                  </div>
                </TableHead>
              ))}
              {actions && <TableHead className="w-8" />}
            </TableRow>
          </TableHeader>
          <TableBody>{renderTableContent()}</TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-[11px] text-muted-foreground">
          Showing {processedData.length} of {data.length} items
        </p>
        {virtualized && processedData.length > 20 && (
          <p className="text-[11px] text-muted-foreground">
            Virtualized • {virtualItems.length} visible
          </p>
        )}
      </div>
    </Card>
  );
}