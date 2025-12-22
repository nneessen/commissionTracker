// src/features/documents/components/DocumentTypeCategorySelector.tsx
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_ORDER,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_EXPIRATION_DEFAULTS,
  getSuggestedExpirationDate,
  type DocumentCategory,
  type InsuranceDocumentType,
} from "@/types/documents.types";
import {
  FileCheck,
  Shield,
  FileSignature,
  ClipboardCheck,
  IdCard,
  File,
} from "lucide-react";

// Icon mapping for categories
const CATEGORY_ICONS: Record<
  DocumentCategory,
  React.ComponentType<{ className?: string }>
> = {
  licensing: FileCheck,
  insurance: Shield,
  contracting: FileSignature,
  compliance: ClipboardCheck,
  identification: IdCard,
  other: File,
};

interface DocumentTypeCategorySelectorProps {
  value?: InsuranceDocumentType;
  onValueChange: (value: InsuranceDocumentType) => void;
  onExpirationSuggested?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A grouped select component for insurance document types
 * Organizes types by category (Licensing, Insurance, Contracting, etc.)
 * Optionally suggests expiration dates based on document type
 */
export function DocumentTypeCategorySelector({
  value,
  onValueChange,
  onExpirationSuggested,
  placeholder = "Select document type...",
  disabled = false,
  className,
}: DocumentTypeCategorySelectorProps) {
  const handleValueChange = (newValue: string) => {
    const docType = newValue as InsuranceDocumentType;
    onValueChange(docType);

    // Suggest expiration date if callback provided
    if (onExpirationSuggested) {
      const suggestedDate = getSuggestedExpirationDate(docType);
      onExpirationSuggested(suggestedDate);
    }
  };

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {DOCUMENT_CATEGORY_ORDER.map((categoryKey) => {
          const category = DOCUMENT_CATEGORIES[categoryKey];
          const Icon = CATEGORY_ICONS[categoryKey];

          return (
            <SelectGroup key={categoryKey}>
              <SelectLabel className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" />
                {category.label}
              </SelectLabel>
              {category.types.map((docType) => {
                const expirationDays =
                  DOCUMENT_EXPIRATION_DEFAULTS[
                    docType as InsuranceDocumentType
                  ];
                const expirationText = expirationDays
                  ? `(${Math.round(expirationDays / 365)} yr)`
                  : "";

                return (
                  <SelectItem key={docType} value={docType}>
                    <span className="flex items-center justify-between w-full">
                      <span>
                        {DOCUMENT_TYPE_LABELS[docType as InsuranceDocumentType]}
                      </span>
                      {expirationText && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {expirationText}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}

/**
 * Helper component to display the currently selected document type with its category
 */
export function DocumentTypeDisplay({
  documentType,
  className,
}: {
  documentType: InsuranceDocumentType;
  className?: string;
}) {
  // Find the category for this type
  let categoryKey: DocumentCategory = "other";
  for (const [key, category] of Object.entries(DOCUMENT_CATEGORIES)) {
    if ((category.types as readonly string[]).includes(documentType)) {
      categoryKey = key as DocumentCategory;
      break;
    }
  }

  const Icon = CATEGORY_ICONS[categoryKey];
  const label = DOCUMENT_TYPE_LABELS[documentType];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span>{label}</span>
    </div>
  );
}

export default DocumentTypeCategorySelector;
