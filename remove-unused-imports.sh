#!/bin/bash
# Script to remove unused imports from TypeScript files

echo "Removing unused imports..."

# Files with specific unused imports that should be removed
files_to_clean=(
  "src/components/layout/Sidebar.tsx:UserCog,ScrollText,Lock"
  "src/components/ui/collapsible.tsx:React"
  "src/features/admin/components/AdminControlCenter.tsx:Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle"
  "src/features/policies/PolicyList.tsx:Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle"
  "src/features/hierarchy/HierarchyDashboardCompact.tsx:ChevronRight,ChevronDown,MoreVertical,TrendingUp,TrendingDown,Users,DollarSign,CheckCircle2,XCircle,Card,CardContent,Badge,DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator,DropdownMenuTrigger"
  "src/features/expenses/ExpenseDashboardCompact.tsx:ChevronUp,ChevronDown,ChevronsLeft,ChevronsRight,TrendingUp,TrendingDown,Receipt,PieChart,Badge"
)

for file_info in "${files_to_clean[@]}"; do
  file=$(echo "$file_info" | cut -d: -f1)
  imports=$(echo "$file_info" | cut -d: -f2)

  if [ -f "$file" ]; then
    echo "Cleaning $file"

    # For each import, remove it from the import statement
    IFS=',' read -ra IMPORTS_ARRAY <<< "$imports"
    for import in "${IMPORTS_ARRAY[@]}"; do
      # Remove the import (handling both single line and multiline imports)
      sed -i "s/\b$import\b,\s*//g" "$file"
      sed -i "s/,\s*\b$import\b//g" "$file"
      sed -i "s/{\s*\b$import\b\s*}//g" "$file"
      sed -i "/^import\s*{\s*}\s*from/d" "$file"
    done
  fi
done

echo "Unused imports removed"