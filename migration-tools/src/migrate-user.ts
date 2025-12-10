// /home/nneessen/projects/commissionTracker/migration-tools/src/migrate-user.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { inferProductType, normalizeClientName, normalizePhone } from './lib/product-inference.js';
import type { UserMapping, MigrationLog, MigrationSummary } from './lib/types.js';

dotenv.config();

const oldSupabase = createClient(
  process.env.OLD_SUPABASE_URL!,
  process.env.OLD_SUPABASE_SERVICE_KEY!
);

const newSupabase = createClient(
  process.env.NEW_SUPABASE_URL!,
  process.env.NEW_SUPABASE_SERVICE_KEY!
);

class MigrationLogger {
  private logs: MigrationLog[] = [];

  log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const log: MigrationLog = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };
    this.logs.push(log);

    const emoji = level === 'info' ? '✓' : level === 'warn' ? '⚠' : '❌';
    console.log(`${emoji} [${level.toUpperCase()}] ${message}`);
    if (data) console.log('  ', JSON.stringify(data, null, 2));
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  getLogs(): MigrationLog[] {
    return this.logs;
  }

  getErrorCount(): number {
    return this.logs.filter((l) => l.level === 'error').length;
  }

  getWarnCount(): number {
    return this.logs.filter((l) => l.level === 'warn').length;
  }
}

async function migrateUser(mapping: UserMapping, dryRun: boolean = true): Promise<MigrationSummary> {
  const startTime = Date.now();
  const logger = new MigrationLogger();

  logger.info(`Starting migration for ${mapping.name} (${mapping.email})`);
  logger.info(`Old User ID: ${mapping.old_user_id}`);
  logger.info(`New User ID: ${mapping.new_user_id}`);
  logger.info(`Dry Run: ${dryRun ? 'YES' : 'NO'}`);

  const summary: MigrationSummary = {
    userId: mapping.old_user_id,
    userName: mapping.name,
    status: 'FAILED',
    timestamp: new Date().toISOString(),
    duration: 0,
    summary: {
      dealsProcessed: 0,
      policiesCreated: 0,
      clientsCreated: 0,
      commissionsCreated: 0,
      carriersMatched: 0,
      carriersCreated: 0,
      productsCreated: 0,
      errors: 0,
      warnings: 0,
    },
    logs: [],
  };

  try {
    // Step 1: Fetch all old data
    logger.info('Fetching data from old system...');

    const { data: deals, error: dealsError } = await oldSupabase
      .from('deals')
      .select('*, carriers(*), products(*)')
      .eq('user_id', mapping.old_user_id);

    if (dealsError) throw new Error(`Error fetching deals: ${dealsError.message}`);
    if (!deals || deals.length === 0) {
      logger.warn('No deals found for this user');
      summary.status = 'SUCCESS';
      summary.duration = Date.now() - startTime;
      summary.logs = logger.getLogs();
      return summary;
    }

    logger.info(`Found ${deals.length} deals`);
    summary.summary.dealsProcessed = deals.length;

    // Fetch client profiles
    const dealIds = deals.map((d) => d.id);
    const { data: clientProfiles } = await oldSupabase
      .from('client_profiles')
      .select('*')
      .in('deal_id', dealIds);

    // Fetch commissions
    const { data: commissions } = await oldSupabase
      .from('commissions')
      .select('*')
      .in('deal_id', dealIds);

    logger.info(`Found ${commissions?.length || 0} commissions`);

    // Step 2: Deduplicate clients
    logger.info('Deduplicating clients...');
    const clientMap = new Map<string, any>();
    const dealToClientKey = new Map<string, string>();

    for (const deal of deals) {
      const phone = normalizePhone(deal.client_phone);
      const name = normalizeClientName(deal.client_name);
      const key = phone ? `${phone}|${name}` : `${deal.client_email}|${name}`;

      if (!clientMap.has(key)) {
        clientMap.set(key, {
          name: deal.client_name,
          email: deal.client_email,
          phone: deal.client_phone,
          address: [
            deal.client_street_address,
            deal.client_city,
            deal.client_state,
            deal.client_zip_code,
          ]
            .filter(Boolean)
            .join(', '),
          date_of_birth: null,
          status: 'active',
          user_id: mapping.new_user_id,
          dealIds: [deal.id],
        });
      } else {
        clientMap.get(key)!.dealIds.push(deal.id);
      }

      dealToClientKey.set(deal.id, key);
    }

    logger.info(`Deduplicated to ${clientMap.size} unique clients`);

    // Step 3: Create clients in new system
    const clientMapping = new Map<string, string>(); // deal_id -> new_client_id

    if (!dryRun) {
      for (const [key, clientData] of clientMap.entries()) {
        const { dealIds, ...client} = clientData;

        const { data: newClient, error: clientError } = await newSupabase
          .from('clients')
          .insert(client)
          .select()
          .single();

        if (clientError) {
          logger.error(`Failed to create client: ${client.name}`, clientError);
          continue;
        }

        // Map all deals for this client
        for (const dealId of dealIds) {
          clientMapping.set(dealId, newClient.id);
        }

        logger.info(`Created client: ${client.name} (${newClient.id})`);
        summary.summary.clientsCreated++;
      }
    } else {
      logger.info(`[DRY RUN] Would create ${clientMap.size} clients`);
      summary.summary.clientsCreated = clientMap.size;
    }

    // Step 4: Process carriers
    logger.info('Processing carriers...');
    const carrierMapping = new Map<string, string>();
    const uniqueCarrierIds = [...new Set(deals.map((d) => d.carrier_id).filter(Boolean))];

    for (const oldCarrierId of uniqueCarrierIds) {
      const deal = deals.find((d) => d.carrier_id === oldCarrierId);
      const oldCarrier = deal?.carriers;

      if (!oldCarrier) {
        logger.warn(`No carrier data for carrier_id: ${oldCarrierId}`);
        continue;
      }

      // Try to match by name
      const { data: matchingCarrier } = await newSupabase
        .from('carriers')
        .select('*')
        .ilike('name', oldCarrier.name)
        .limit(1)
        .single();

      if (matchingCarrier) {
        carrierMapping.set(oldCarrierId, matchingCarrier.id);
        logger.info(`Matched carrier: ${oldCarrier.name}`);
        summary.summary.carriersMatched++;
      } else {
        if (!dryRun) {
          const { data: newCarrier, error: carrierError } = await newSupabase
            .from('carriers')
            .insert({ name: `${oldCarrier.name} (Migrated)` })
            .select()
            .single();

          if (carrierError) {
            logger.error(`Failed to create carrier: ${oldCarrier.name}`, carrierError);
            continue;
          }

          carrierMapping.set(oldCarrierId, newCarrier.id);
          logger.info(`Created carrier: ${oldCarrier.name}`);
          summary.summary.carriersCreated++;
        } else {
          logger.info(`[DRY RUN] Would create carrier: ${oldCarrier.name}`);
          summary.summary.carriersCreated++;
        }
      }
    }

    // Step 5: Process products
    logger.info('Processing products...');
    const productMapping = new Map<string, { id: string; type: string; original: string }>();

    for (const deal of deals) {
      if (!deal.product_id || productMapping.has(deal.product_id)) continue;

      const productName = deal.products?.name || 'Unknown Product';
      const productType = inferProductType(productName);
      const newCarrierId = carrierMapping.get(deal.carrier_id!);

      if (!newCarrierId) {
        logger.warn(`No carrier mapping for product: ${productName}`);
        continue;
      }

      if (!dryRun) {
        const { data: newProduct, error: productError } = await newSupabase
          .from('products')
          .insert({
            carrier_id: newCarrierId,
            product_type: productType,
            name: productName,
            is_active: true,
          })
          .select()
          .single();

        if (productError) {
          logger.error(`Failed to create product: ${productName}`, productError);
          continue;
        }

        productMapping.set(deal.product_id, {
          id: newProduct.id,
          type: productType,
          original: productName,
        });

        logger.info(`Created product: ${productName} → ${productType}`);
        summary.summary.productsCreated++;
      } else {
        logger.info(`[DRY RUN] Would create product: ${productName} → ${productType}`);
        summary.summary.productsCreated++;
      }
    }

    // Step 6: Create policies
    logger.info('Creating policies...');

    for (const deal of deals) {
      const clientId = clientMapping.get(deal.id);
      const carrierId = carrierMapping.get(deal.carrier_id!);
      const product = productMapping.get(deal.product_id!);

      if (!dryRun && (!clientId || !carrierId || !product)) {
        logger.warn(`Skipping deal ${deal.id}: missing mappings`);
        continue;
      }

      const policyData = {
        policy_number: deal.policy_number || `MIGRATED-${deal.id}`,
        carrier_id: carrierId,
        client_id: clientId,
        user_id: mapping.new_user_id,
        product: product?.type || 'term_life',
        product_id: product?.id,
        monthly_premium: deal.submit_amount / 12,
        annual_premium: deal.submit_amount,
        effective_date: deal.effective_date || deal.date_submitted,
        status: deal.policy_status?.toLowerCase() || 'pending',
        notes: `Migrated from selfmade on ${new Date().toISOString()}. Original product: ${product?.original || 'Unknown'}`,
      };

      if (!dryRun) {
        const { data: newPolicy, error: policyError } = await newSupabase
          .from('policies')
          .insert(policyData)
          .select()
          .single();

        if (policyError) {
          logger.error(`Failed to create policy: ${policyData.policy_number}`, policyError);
          continue;
        }

        logger.info(`Created policy: ${policyData.policy_number}`);
        summary.summary.policiesCreated++;
      } else {
        logger.info(`[DRY RUN] Would create policy: ${policyData.policy_number}`);
        summary.summary.policiesCreated++;
      }
    }

    // Step 7: Create commissions
    if (commissions && commissions.length > 0) {
      logger.info('Creating commissions...');

      for (const commission of commissions) {
        const commissionData = {
          user_id: mapping.new_user_id,
          amount: commission.commission_amount,
          earned_amount: 0,
          unearned_amount: commission.commission_amount,
          status: 'pending',
          type: commission.commission_type || 'initial',
          payment_date: commission.scheduled_date || commission.paid_date,
          months_paid: 0,
          advance_months: 0,
          notes: `Migrated from selfmade. Original paid status: ${commission.paid}`,
        };

        if (!dryRun) {
          const { error: commError } = await newSupabase.from('commissions').insert(commissionData);

          if (commError) {
            logger.error(`Failed to create commission`, commError);
            continue;
          }

          summary.summary.commissionsCreated++;
        } else {
          summary.summary.commissionsCreated++;
        }
      }

      logger.info(`${dryRun ? '[DRY RUN] Would create' : 'Created'} ${commissions.length} commissions`);
    }

    summary.status = 'SUCCESS';
    logger.info(`Migration completed successfully!`);
  } catch (error: any) {
    logger.error('Migration failed', error.message);
    summary.status = 'FAILED';
  }

  summary.duration = Date.now() - startTime;
  summary.logs = logger.getLogs();
  summary.summary.errors = logger.getErrorCount();
  summary.summary.warnings = logger.getWarnCount();

  return summary;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  const mappingFile = args.find((arg) => arg.startsWith('--mapping-file='))?.split('=')[1] || 'user-mapping.csv';

  console.log('\n🚀 MIGRATION TOOL\n');
  console.log('═'.repeat(80));

  // Read mapping file
  const mappingCsv = readFileSync(mappingFile, 'utf-8');
  const lines = mappingCsv.trim().split('\n').slice(1); // Skip header
  const mappings: UserMapping[] = lines.map((line) => {
    const [old_user_id, new_user_id, email, name] = line.split(',');
    return { old_user_id, new_user_id, email, name };
  });

  console.log(`Found ${mappings.length} user(s) to migrate\n`);

  for (const mapping of mappings) {
    console.log('\n' + '─'.repeat(80));
    const summary = await migrateUser(mapping, dryRun);

    console.log('\n📊 MIGRATION SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Status: ${summary.status}`);
    console.log(`Duration: ${summary.duration}ms`);
    console.log(`\nData Processed:`);
    console.log(`  Deals: ${summary.summary.dealsProcessed}`);
    console.log(`  Clients Created: ${summary.summary.clientsCreated}`);
    console.log(`  Policies Created: ${summary.summary.policiesCreated}`);
    console.log(`  Commissions Created: ${summary.summary.commissionsCreated}`);
    console.log(`  Carriers Matched: ${summary.summary.carriersMatched}`);
    console.log(`  Carriers Created: ${summary.summary.carriersCreated}`);
    console.log(`  Products Created: ${summary.summary.productsCreated}`);
    console.log(`\nIssues:`);
    console.log(`  Errors: ${summary.summary.errors}`);
    console.log(`  Warnings: ${summary.summary.warnings}`);
    console.log('═'.repeat(80));
  }

  if (dryRun) {
    console.log('\n⚠️  DRY RUN COMPLETE - No changes made');
    console.log('Run with --execute to perform actual migration');
  }
}

main().catch(console.error);
