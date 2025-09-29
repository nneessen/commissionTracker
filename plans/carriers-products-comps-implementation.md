# Carriers, Products & Commission Guide Implementation Plan

## Overview
Complete implementation of carriers, products, and commission guide functionality for the settings page. The UI framework exists but services are placeholder implementations. Database schema is defined and comp data is available.

## Current State Analysis

### ✅ What's Implemented
- **UI Components**: Settings dashboard, CarrierManager, ProductManager components
- **Database Schema**: Complete schema with carriers, comp_guide, agents tables
- **Type Definitions**: Carrier, CompGuideEntry interfaces properly defined
- **Data Sources**:
  - `CompGuide.pdf` in public/ directory
  - `ffgCompGuideData.ts` with extensive comp data from 7+ carriers
  - `comp-guide-data.sql` with sample data
- **Architecture**: BaseService and BaseRepository classes established
- **Import UI**: CompGuideImporter component exists

### ❌ What's Missing/Broken
- **Service Implementations**: carrierService and compGuideService are placeholders
- **Repository Classes**: No concrete implementations for carriers/comp_guide
- **Database Integration**: Services not connected to actual database
- **Data Import**: CompGuideImporter can't function without working services
- **Functional UI**: Components can't save/load data

## Implementation Tasks

### Phase 1: Core Service Implementation (Priority: Critical)

#### Task 1.1: Implement CarrierRepository
**File**: `src/services/settings/CarrierRepository.ts`
**Dependencies**: BaseRepository, Carrier type
**Details**:
- Extend BaseRepository with Carrier-specific operations
- Implement transformFromDB/transformToDB for contact_info JSONB field
- Handle default_commission_rates JSONB field properly
- Add carrier-specific queries (search by name, active status)

#### Task 1.2: Implement CarrierService
**File**: `src/services/settings/carrierService.ts` (replace existing)
**Dependencies**: CarrierRepository, BaseService
**Details**:
- Extend BaseService with proper validation rules
- Implement validateCreate/validateUpdate methods
- Add business logic for carrier name uniqueness
- Handle contact info validation
- Add search and filtering capabilities

#### Task 1.3: Implement CompGuideRepository
**File**: `src/services/settings/CompGuideRepository.ts`
**Dependencies**: BaseRepository, CompGuideEntry type
**Details**:
- Extend BaseRepository with comp guide operations
- Implement joins with carriers table for carrier_name
- Add contract level range queries (80-145)
- Implement product search and filtering
- Handle commission percentage calculations

#### Task 1.4: Implement CompGuideService
**File**: `src/services/settings/compGuideService.ts` (replace existing)
**Dependencies**: CompGuideRepository, BaseService
**Details**:
- Extend BaseService with comp guide validation
- Validate contract levels (80-145 range)
- Validate commission percentages (> 0)
- Implement bulk import functionality
- Add duplicate detection and handling

### Phase 2: Data Import Implementation (Priority: High)

#### Task 2.1: Fix CompGuideImporter Integration
**File**: `src/features/settings/components/CompGuideImporter.tsx`
**Dependencies**: Working carrierService, compGuideService
**Details**:
- Update to use new service implementations
- Fix error handling for service responses
- Implement proper progress tracking
- Add rollback capability for failed imports

#### Task 2.2: Create Data Migration Script
**File**: `src/scripts/import-comp-guide-data.ts`
**Dependencies**: ffgCompGuideData, services
**Details**:
- Script to import all FFG comp guide data
- Create carriers automatically if they don't exist
- Batch insert comp guide entries
- Handle duplicates and conflicts
- Validation and error reporting

#### Task 2.3: Database Seeding
**File**: `src/services/database/seed-comp-data.sql`
**Dependencies**: Enhanced schema, comp data
**Details**:
- Update existing comp-guide-data.sql with full FFG data
- Include all 7+ carriers from ffgCompGuideData.ts
- Ensure carrier records are created first
- Add data validation checks

### Phase 3: UI Functionality (Priority: High)

#### Task 3.1: Fix CarrierManager CRUD Operations
**File**: `src/features/settings/carriers/CarrierManager.tsx`
**Dependencies**: Working carrierService
**Details**:
- Update to handle ServiceResponse pattern
- Implement proper error handling and user feedback
- Add loading states and progress indicators
- Fix form validation and submission
- Add search and filtering functionality

#### Task 3.2: Fix ProductManager CRUD Operations
**File**: `src/features/settings/products/ProductManager.tsx`
**Dependencies**: Working compGuideService, carrierService
**Details**:
- Update to handle ServiceResponse pattern
- Implement comp guide entry management
- Add bulk edit capabilities for commission rates
- Implement contract level filtering and sorting
- Add export functionality for comp data

#### Task 3.3: Enhance Product Forms
**File**: `src/features/settings/components/ProductForm.tsx` (new)
**Dependencies**: CompGuideEntry type, carriers data
**Details**:
- Create form for adding/editing comp guide entries
- Dropdown for carrier selection
- Contract level validation (80-145)
- Commission percentage input with validation
- Effective/expiration date handling

### Phase 4: Data Management (Priority: Medium)

#### Task 4.1: Bulk Operations
**Dependencies**: Working services
**Details**:
- Bulk edit commission rates across contract levels
- Bulk update effective dates
- Batch delete operations with confirmation
- Export/import CSV functionality

#### Task 4.2: Commission Rate Calculations
**File**: `src/utils/commissionCalculations.ts`
**Dependencies**: CompGuideEntry data
**Details**:
- Calculate commission amounts based on premium and contract level
- Handle different commission structures (first year, renewal, trail)
- Commission comparison tools
- Rate trend analysis

#### Task 4.3: Data Validation and Integrity
**Dependencies**: All services
**Details**:
- Prevent orphaned comp guide entries
- Validate contract level ranges
- Check for duplicate carrier/product/level combinations
- Data consistency checks

### Phase 5: Advanced Features (Priority: Low)

#### Task 5.1: Commission Rate Analytics
**Details**:
- Rate comparison across carriers
- Contract level performance analysis
- Product profitability metrics
- Historical rate tracking

#### Task 5.2: Import/Export Enhancements
**Details**:
- Support multiple file formats
- Advanced mapping capabilities
- Conflict resolution UI
- Import history and rollback

## Database Schema Verification

### Required Tables (Already Defined)
```sql
-- carriers table with JSONB fields
-- comp_guide table with foreign key to carriers
-- agents table with contract_comp_level
```

### Data Relationships
```
carriers (1) -> (*) comp_guide
agents.contract_comp_level -> comp_guide.contract_level (lookup)
```

## File Structure
```
src/
├── services/settings/
│   ├── CarrierRepository.ts (new)
│   ├── CompGuideRepository.ts (new)
│   ├── carrierService.ts (replace)
│   └── compGuideService.ts (replace)
├── features/settings/
│   ├── carriers/CarrierManager.tsx (fix)
│   ├── products/ProductManager.tsx (fix)
│   └── components/
│       ├── CompGuideImporter.tsx (fix)
│       └── ProductForm.tsx (new)
└── scripts/
    └── import-comp-guide-data.ts (new)
```

## Success Criteria

### Phase 1 Complete
- [ ] Can create, read, update, delete carriers
- [ ] Can create, read, update, delete comp guide entries
- [ ] Services return proper error handling
- [ ] Database operations work correctly

### Phase 2 Complete
- [ ] Can import comp guide data from FFG file
- [ ] CompGuideImporter works end-to-end
- [ ] Database contains all carrier and product data
- [ ] Import handles errors gracefully

### Phase 3 Complete
- [ ] CarrierManager fully functional
- [ ] ProductManager fully functional
- [ ] UI shows loading states and error messages
- [ ] Can search and filter data effectively

### Phase 4 Complete
- [ ] Bulk operations work correctly
- [ ] Data export/import functions
- [ ] Commission calculations accurate
- [ ] Data validation prevents corruption

## Implementation Order
1. **Start with Phase 1** - Core service implementation is blocking everything else
2. **Implement repositories first** - They're dependencies for services
3. **Test each service** - Ensure CRUD operations work before moving to UI
4. **Fix UI components** - Once services work, update UI to use them
5. **Import data** - Once everything works, populate with real data

## Risk Mitigation
- **Database backup before imports** - Prevent data loss
- **Service unit tests** - Ensure reliability
- **Rollback procedures** - For failed imports
- **Gradual rollout** - Test with small datasets first

## Timeline Estimate
- **Phase 1**: 2-3 days (critical path)
- **Phase 2**: 1-2 days
- **Phase 3**: 2-3 days
- **Phase 4**: 1-2 days
- **Total**: 6-10 days

Focus on **Phase 1 first** - without working services, nothing else will function.