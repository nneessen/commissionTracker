# Phase 5: Underwriting Wizard RecommendationsStep Integration

## Continuation Prompt

Continue Phase 5 of the Product Underwriting Constraints implementation. Phases 1-4 are complete:

- **Phase 1-3**: Backend complete (migration, types, service layer)
- **Phase 4**: Product Form UI complete (`UnderwritingConstraintsEditor.tsx` integrated into `ProductForm.tsx`)

## Phase 5 Objective

Update the Underwriting Wizard's `RecommendationsStep.tsx` to filter product recommendations based on the underwriting constraints stored in `products.metadata`.

## Key Files

- `src/features/underwriting/components/UnderwritingWizard/steps/RecommendationsStep.tsx` - Main file to modify
- `src/features/underwriting/services/recommendationService.ts` - May need updates
- `src/types/product.types.ts` - Contains `ProductUnderwritingConstraints` interface
- `src/features/settings/products/components/UnderwritingConstraintsEditor.tsx` - Reference for constraint structure

## Constraint Structure (from products.metadata.underwritingConstraints)

```typescript
interface ProductUnderwritingConstraints {
  ageTieredFaceAmounts?: Array<{
    minAge: number;
    maxAge: number;
    maxFaceAmount: number;
  }>;
  knockoutConditions?: string[]; // Health condition codes that disqualify
  fullUnderwritingThreshold?: number; // Base threshold
  fullUnderwritingThresholdByAge?: Array<{
    minAge: number;
    maxAge: number;
    threshold: number;
  }>;
}
```

## Implementation Requirements

1. **Filter by Age-Tiered Face Amounts**:
   - If client's requested face amount exceeds the max for their age tier, exclude or flag the product
   - Show why a product doesn't qualify (e.g., "Max $100,000 for ages 50-59")

2. **Filter by Knockout Conditions**:
   - If client has any health condition in the product's knockoutConditions array, exclude the product
   - Show which condition caused exclusion

3. **Flag Full Underwriting Required**:
   - If face amount exceeds threshold (base or age-specific), mark product as "Requires Full Underwriting"
   - Don't exclude, just indicate the requirement

4. **UI Updates**:
   - Show qualification status for each recommended product
   - Display reason for non-qualification
   - Indicate simplified vs full underwriting eligibility

## Client Data Available in Wizard

The wizard collects:
- `age` (number)
- `healthConditions` (string[] - condition codes)
- `requestedFaceAmount` (number)
- Plus: gender, state, tobacco use, BMI, health tier

## Testing Checklist

- [ ] Product with age-tiered limits correctly excludes/includes based on client age + face amount
- [ ] Product with knockout conditions correctly excludes when client has matching condition
- [ ] Full underwriting threshold correctly flags products
- [ ] Age-specific threshold overrides work correctly
- [ ] Products without constraints show as fully eligible
- [ ] UI clearly communicates qualification status and reasons

## Do NOT

- Over-engineer the solution
- Add features not specified
- Create new files unless absolutely necessary
- Use useMemo/useCallback (React 19 handles memoization)

## Start By

1. Read `RecommendationsStep.tsx` to understand current structure
2. Read `recommendationService.ts` to see how recommendations are generated
3. Implement filtering logic based on constraints
4. Update UI to show qualification status
