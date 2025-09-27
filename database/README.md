# Commission Tracker Database Schema

A high-performance PostgreSQL database schema optimized for insurance commission tracking, designed for speed and analytics.

## Files Overview

- **`comprehensive_schema.sql`** - Complete database schema with all tables, indexes, triggers, and views
- **`sample_data.sql`** - Sample data for testing and development
- **`performance_queries.sql`** - Optimized queries for common operations and analytics
- **`migration_guide.sql`** - Step-by-step migration from existing schema

## Schema Features

### Performance Optimizations
- **Comprehensive indexing strategy** for all common query patterns
- **Materialized views** for dashboard summaries
- **Generated columns** for calculated fields (year_earned, month_earned, etc.)
- **Denormalized data** where appropriate for query speed
- **Composite indexes** for multi-column queries

### Core Tables

#### 1. `carriers` - Insurance Companies
- Stores carrier information with default commission rates
- JSONB for flexible commission rate storage
- Contact information and metadata

#### 2. `agents` - Agent Profiles
- Contract compensation levels (80-145%)
- Performance tracking (YTD commission/premium)
- License information and territories

#### 3. `comp_guide` - Commission Rate Guide
- Commission percentages by carrier/product/contract level
- Supports multiple rate types (first year, renewal, trail)
- Date-effective rates with version control

#### 4. `policies` - Insurance Policies
- Comprehensive policy tracking
- Client information (denormalized for performance)
- Financial details and payment frequencies
- Generated monthly premium calculation

#### 5. `commissions` - Commission Records
- Advanced commission tracking with 9-month advance model
- Auto-calculated rates from comp guide
- Performance analytics fields (year/month/quarter earned)
- Commission pipeline status tracking

#### 6. `chargebacks` - Commission Chargebacks
- Chargeback tracking and management
- Links to original commissions and policies
- Financial impact calculations

#### 7. `expenses` - Business/Personal Expenses
- Categorized expense tracking
- Tax deductible flags
- Time-based analytics support

#### 8. `constants` - Application Settings
- Flexible configuration storage
- Typed values (currency, percentage, integer)
- Categorized settings

### High-Performance Features

#### Indexing Strategy
```sql
-- Example: Commission lookup optimization
CREATE INDEX idx_commissions_agent_year ON commissions(agent_id, year_earned);
CREATE INDEX idx_comp_guide_lookup ON comp_guide(carrier_id, product_name, contract_level);
```

#### Analytics Views
- `commission_summary_view` - Pre-joined commission data
- `monthly_commission_summary` - Aggregated monthly metrics
- `policy_performance_view` - Policy-level analytics
- `dashboard_summary` - Materialized view for dashboard

#### Calculated Functions
```sql
-- Auto-commission calculation
SELECT * FROM auto_calculate_commission(policy_id, agent_id, carrier_id, product_name, annual_premium);

-- Commission rate lookup
SELECT get_commission_rate(carrier_id, product_name, contract_level);
```

## Setup Instructions

### 1. Fresh Installation
```sql
-- Run the complete schema
\i comprehensive_schema.sql

-- Load sample data (optional)
\i sample_data.sql
```

### 2. Migration from Existing Schema
```sql
-- Follow migration guide step by step
\i migration_guide.sql
```

### 3. Performance Testing
```sql
-- Load performance queries and test
\i performance_queries.sql
```

## Key Performance Features

### 1. Commission Calculation Optimization
- **9-month advance model** support
- **Automatic rate lookups** from comp guide
- **Batch commission calculations**
- **Commission pipeline tracking**

### 2. Analytics Performance
- **Pre-aggregated monthly summaries**
- **Year/month/quarter indexed fields**
- **Materialized dashboard views**
- **State-level performance tracking**

### 3. Query Optimization
- **Composite indexes** for common filter combinations
- **Partial indexes** for active records only
- **Generated columns** for calculated fields
- **JSONB indexes** for flexible data

## Common Query Patterns

### Dashboard Summary
```sql
SELECT * FROM dashboard_summary;
```

### Agent Performance
```sql
SELECT * FROM commission_summary_view
WHERE agent_id = ? AND year_earned = ?;
```

### Commission Calculation
```sql
SELECT * FROM auto_calculate_commission(
  policy_id, agent_id, carrier_id,
  'Whole Life Premier', 5000.00, 9
);
```

### Financial Analytics
```sql
SELECT year_earned, month_earned,
       SUM(commission_amount) as monthly_income
FROM commissions
WHERE status = 'paid'
GROUP BY year_earned, month_earned
ORDER BY year_earned DESC, month_earned DESC;
```

## Performance Monitoring

### Index Usage
```sql
SELECT indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Query Performance
```sql
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE query LIKE '%commissions%'
ORDER BY mean_time DESC;
```

## Maintenance

### Regular Tasks
1. **Refresh materialized views** (daily/weekly)
```sql
REFRESH MATERIALIZED VIEW dashboard_summary;
```

2. **Update table statistics** (weekly)
```sql
ANALYZE commissions;
ANALYZE policies;
```

3. **Monitor index usage** (monthly)
```sql
-- Check for unused indexes
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
```

## Data Integrity

### Constraints
- **Financial amounts** must be non-negative
- **Date logic** validation (effective < expiration)
- **Status transitions** enforced via CHECK constraints
- **Contract levels** restricted to valid range (80-145)

### Foreign Keys
- **Cascading deletes** for dependent data
- **Restrict deletes** for critical references
- **Set NULL** for optional relationships

### Triggers
- **Automatic timestamp updates** on all tables
- **Data validation** on insert/update
- **Performance field calculations**

## Security Considerations

### Single-User Application
- Schema designed for single-user access
- Row-level security not implemented (can be added if needed)
- Focus on data integrity over access control

### Data Protection
- Sensitive client data in separate fields
- Audit trail via created_at/updated_at timestamps
- Backup recommendations included

## Troubleshooting

### Common Issues
1. **Slow queries** - Check index usage and query plans
2. **Lock contention** - Monitor concurrent operations
3. **Storage growth** - Regular maintenance and archiving

### Performance Tuning
1. **Adjust fillfactor** for frequently updated tables
2. **Tune PostgreSQL parameters** for workload
3. **Monitor query statistics** and optimize

This schema is designed to scale with your commission tracking needs while maintaining blazing-fast performance for all operations.