import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Building2,
  Package,
  Percent,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Comp } from "../../types/comp.types";
import { Button } from "@/components/ui/button";

interface CompTableProps {
  data: Comp[];
  isLoading: boolean;
  error?: string;
  onPaginationChange?: (newPagination: any) => void;
}

type SortField =
  | "carrier_id"
  | "product_type"
  | "commission_percentage"
  | "contract_level";
type SortOrder = "asc" | "desc";

export function CompTable({ data, isLoading, error }: CompTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<SortField>("carrier_id");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Sort data (React 19 doesn't need useMemo)
  const sortedData = !data ? [] : [...data].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Client-side pagination (React 19 doesn't need useMemo)
  const startIndex = (page - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  const totalPages = Math.ceil((data?.length || 0) / pageSize);
  const total = data?.length || 0;

  const handleSort = (field: SortField) => {
    const newOrder = sortBy === field && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(field);
    setSortOrder(newOrder);
    setPage(1); // Reset to first page when sorting
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  };

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const formatCommissionRate = (rate: number) => {
    return `${rate.toFixed(2)}%`;
  };

  // Removed unnecessary badge categorization - contract level is just a number

  const renderPagination = () => {
    if (!data || data.length === 0) return null;

    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);

    return (
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <Button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>
          <Button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            variant="outline"
            size="sm"
            className="ml-3"
          >
            Next
          </Button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{startItem}</span> to{" "}
              <span className="font-medium">{endItem}</span> of{" "}
              <span className="font-medium">{total}</span> results
            </p>
            <div className="flex items-center space-x-2">
              <label htmlFor="pageSize" className="text-sm text-gray-700">
                Per page:
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div>
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
              <Button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                variant="outline"
                size="icon"
                className="rounded-l-md rounded-r-none"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-5 w-5" />
              </Button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    variant="outline"
                    size="sm"
                    className={`rounded-none ${
                      pageNum === page
                        ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                        : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              <Button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                variant="outline"
                size="icon"
                className="rounded-r-md rounded-l-none"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Error Loading Comp Data
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {error ||
            "An unexpected error occurred while loading the comp guide."}
        </p>
        <Button
          onClick={() => window.location.reload()}
          size="sm"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("carrier_id")}
              >
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Carrier
                  {getSortIcon("carrier_id")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("product_type")}
              >
                <div className="flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Product
                  {getSortIcon("product_type")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("contract_level")}
              >
                <div className="flex items-center">
                  Contract Level
                  {getSortIcon("contract_level")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("commission_percentage")}
              >
                <div className="flex items-center">
                  <Percent className="h-4 w-4 mr-2" />
                  Commission Rate
                  {getSortIcon("commission_percentage")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Effective Date
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-gray-500">Loading comp data...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Comp Data Found
                    </h3>
                    <p className="text-sm">
                      Try adjusting your search filters or check back later.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((record) => {
                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {record.carrier_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {record.product_type
                            .split("_")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1),
                            )
                            .join(" ")}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.product_type}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-semibold text-gray-900">
                        {record.contract_level}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-semibold text-blue-600">
                        {formatCommissionRate(record.commission_percentage)}
                      </div>
                      {record.bonus_percentage && (
                        <div className="text-xs text-green-600">
                          +{record.bonus_percentage}% bonus
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(record.effective_date).toLocaleDateString()}
                      {record.expiration_date && (
                        <div className="text-xs text-gray-400">
                          Expires:{" "}
                          {new Date(
                            record.expiration_date,
                          ).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {paginatedData.length > 0 && renderPagination()}
    </div>
  );
}

export default CompTable;
