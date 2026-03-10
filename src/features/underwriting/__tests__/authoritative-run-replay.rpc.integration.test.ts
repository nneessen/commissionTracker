// @vitest-environment node

import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { Client } from "pg";

const RUN_DB_TESTS = process.env.RUN_DB_TESTS === "1";
const TEST_DB_URL =
  process.env.UNDERWRITING_TEST_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const describeDb = RUN_DB_TESTS ? describe : describe.skip;

type PersistResult = {
  success: boolean;
  alreadyPersisted?: boolean;
  session?: {
    id: string;
    run_key: string | null;
    selected_term_years: number | null;
    result_source: string;
    evaluation_metadata: Record<string, unknown>;
    recommendations: unknown[];
    eligibility_summary: Record<string, unknown>;
    requested_face_amounts: unknown;
    requested_product_types: string[];
    health_responses: Record<string, unknown>;
    conditions_reported: string[];
  };
  code?: string;
  error?: string;
};

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    throw new Error("DB client not initialized");
  }

  return client;
}

async function beginTestTransaction() {
  await getClient().query("BEGIN");
}

async function rollbackTestTransaction() {
  const db = getClient();
  await db.query("ROLLBACK");
  await db.query("RESET ROLE");
}

async function setServiceRoleContext(actorId: string) {
  const db = getClient();
  const claims = JSON.stringify({
    sub: actorId,
    role: "service_role",
    aud: "authenticated",
  });

  await db.query("RESET ROLE");
  await db.query(
    `
      SELECT
        set_config('request.jwt.claim.sub', $1, true),
        set_config('request.jwt.claim.role', 'service_role', true),
        set_config('request.jwt.claims', $2, true)
    `,
    [actorId, claims],
  );
}

async function seedPersistFixtures() {
  const db = getClient();

  const imoId = randomUUID();
  const agencyId = randomUUID();
  const userId = randomUUID();
  const carrierId = randomUUID();
  const productId = randomUUID();

  await db.query(
    `
      INSERT INTO public.imos (id, name, code)
      VALUES ($1::uuid, 'Replay IMO', 'REPLAY_' || substr(($1::uuid)::text, 1, 6))
    `,
    [imoId],
  );

  await db.query(
    `
      INSERT INTO public.agencies (id, imo_id, name, code, owner_id)
      VALUES ($1::uuid, $2::uuid, 'Replay Agency', 'REPLAY_AGENCY', NULL)
    `,
    [agencyId, imoId],
  );

  await db.query(
    `
      INSERT INTO public.user_profiles (
        id,
        email,
        approval_status,
        is_admin,
        subscription_tier,
        uw_wizard_enabled,
        imo_id,
        agency_id,
        roles,
        hierarchy_path,
        hierarchy_depth,
        upline_id,
        first_name,
        last_name
      )
      VALUES (
        $1::uuid,
        'replay-owner@example.com',
        'approved',
        false,
        'pro',
        true,
        $2::uuid,
        $3::uuid,
        ARRAY['imo_admin']::text[],
        ($1::uuid)::text,
        0,
        NULL,
        'Replay',
        'Owner'
      )
    `,
    [userId, imoId, agencyId],
  );

  await db.query(
    `
      UPDATE public.agencies
      SET owner_id = $2::uuid
      WHERE id = $1::uuid
    `,
    [agencyId, userId],
  );

  await db.query(
    `
      INSERT INTO public.carriers (id, imo_id, name, code, is_active)
      VALUES ($1::uuid, $2::uuid, 'Replay Carrier', 'REPLAY_CARRIER', true)
    `,
    [carrierId, imoId],
  );

  await db.query(
    `
      INSERT INTO public.products (
        id,
        carrier_id,
        imo_id,
        name,
        code,
        product_type,
        is_active
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        'Replay Product',
        'REPLAY_PRODUCT',
        'term_life',
        true
      )
    `,
    [productId, carrierId, imoId],
  );

  return {
    userId,
    imoId,
    agencyId,
    carrierId,
    productId,
  };
}

async function persistAuthoritativeRun(params: {
  actorId: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  auditRows: Record<string, unknown>[];
}): Promise<PersistResult> {
  const db = getClient();
  await setServiceRoleContext(params.actorId);

  const { rows } = await db.query<{ payload: PersistResult }>(
    `
      SELECT public.persist_underwriting_run_v1(
        $1::uuid,
        $2::jsonb,
        $3::jsonb,
        $4::jsonb
      ) AS payload
    `,
    [
      params.actorId,
      JSON.stringify(params.input),
      JSON.stringify(params.result),
      JSON.stringify(params.auditRows),
    ],
  );

  return rows[0]?.payload ?? { success: false, error: "Missing payload" };
}

describeDb("authoritative underwriting run persistence", () => {
  beforeAll(async () => {
    client = new Client({ connectionString: TEST_DB_URL });
    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
      client = null;
    }
  });

  beforeEach(async () => {
    await beginTestTransaction();
  });

  afterEach(async () => {
    await rollbackTestTransaction();
  });

  it("persists a reconstructible authoritative run across session, recommendations, and audit rows", async () => {
    const fixture = await seedPersistFixtures();
    const runKey = `run-${randomUUID()}`;

    const input = {
      clientName: "Replay Client",
      clientDob: "1985-04-12",
      clientAge: 40,
      clientGender: "female",
      clientState: "TX",
      clientHeightInches: 67,
      clientWeightLbs: 165,
      healthResponses: {
        version: 2,
        conditionsByCode: {
          diabetes: {
            conditionCode: "diabetes",
            conditionName: "Diabetes",
            responses: {
              diagnosisYear: "2020",
              treatment: "oral_medication",
            },
          },
        },
      },
      conditionsReported: ["diabetes"],
      tobaccoUse: false,
      tobaccoDetails: {
        currentUse: false,
      },
      requestedFaceAmounts: [250000, 500000],
      requestedProductTypes: ["term_life"],
      selectedTermYears: 20,
      sessionDurationSeconds: 142,
      notes: "Replay validation run",
      runKey,
    };

    const result = {
      sessionRecommendations: [
        {
          carrierId: fixture.carrierId,
          carrierName: "Replay Carrier",
          productId: fixture.productId,
          productName: "Replay Product",
          eligibilityStatus: "eligible",
          eligibilityReasons: ["meets underwriting criteria"],
          missingFields: [],
          confidence: 0.92,
          approvalLikelihood: 0.88,
          healthClassResult: "preferred",
          conditionDecisions: [
            {
              conditionCode: "diabetes",
              decision: "approve",
              likelihood: 0.88,
              healthClassResult: "preferred",
              isApproved: true,
            },
          ],
          monthlyPremium: 83.51,
          annualPremium: 1002.12,
          costPerThousand: 0.334,
          score: 0.91,
          scoreComponents: {
            price: 0.7,
            approval: 0.21,
          },
          recommendationReason: "best_value",
          recommendationRank: 1,
          draftRulesFyi: [],
        },
      ],
      rateTableRecommendations: [
        {
          carrierName: "Replay Carrier",
          productName: "Replay Product",
          termYears: 20,
          healthClass: "preferred",
          quotedHealthClass: "Preferred",
          underwritingHealthClass: "preferred",
          quoteClassNote: null,
          monthlyPremium: 83.51,
          faceAmount: 250000,
          reason: "Best overall fit",
        },
      ],
      eligibilitySummary: {
        eligible: 1,
        unknown: 0,
        ineligible: 0,
      },
      evaluationMetadata: {
        engineVersion: "backend_authoritative_v1",
        requestId: "req-replay-123",
        runKey,
        selectedTermYears: 20,
        totalProductsEvaluated: 12,
        evaluatedAt: "2026-03-10T12:00:00.000Z",
      },
    };

    const auditRows = [
      {
        ruleSetId: null,
        ruleId: null,
        conditionCode: "diabetes",
        predicateResult: "matched",
        matchedConditions: ["diabetes"],
        failedConditions: null,
        missingFields: [],
        outcomeApplied: {
          eligibility: "eligible",
          healthClass: "preferred",
          tableUnits: 0,
        },
        inputHash: "hash-replay-123",
      },
    ];

    const persisted = await persistAuthoritativeRun({
      actorId: fixture.userId,
      input,
      result,
      auditRows,
    });

    expect(persisted.success).toBe(true);
    expect(persisted.alreadyPersisted).toBe(false);
    expect(persisted.session?.run_key).toBe(runKey);
    expect(persisted.session?.selected_term_years).toBe(20);
    expect(persisted.session?.result_source).toBe("backend_authoritative");
    expect(persisted.session?.requested_face_amounts).toEqual([250000, 500000]);
    expect(persisted.session?.requested_product_types).toEqual(["term_life"]);
    expect(persisted.session?.conditions_reported).toEqual(["diabetes"]);
    expect(persisted.session?.recommendations).toEqual(
      result.rateTableRecommendations,
    );
    expect(persisted.session?.eligibility_summary).toEqual(
      result.eligibilitySummary,
    );
    expect(persisted.session?.evaluation_metadata).toMatchObject({
      engineVersion: "backend_authoritative_v1",
      requestId: "req-replay-123",
      runKey,
      selectedTermYears: 20,
      totalProductsEvaluated: 12,
    });

    const sessionId = persisted.session?.id;
    expect(sessionId).toBeTruthy();

    const db = getClient();
    const { rows: recommendationRows } = await db.query<{
      product_id: string;
      carrier_id: string;
      eligibility_status: string;
      health_class_result: string | null;
      monthly_premium: string | null;
      annual_premium: string | null;
      score: string | null;
      recommendation_reason: string | null;
      recommendation_rank: number | null;
      condition_decisions: unknown;
      score_components: Record<string, unknown>;
    }>(
      `
        SELECT
          product_id,
          carrier_id,
          eligibility_status,
          health_class_result,
          monthly_premium,
          annual_premium,
          score,
          recommendation_reason,
          recommendation_rank,
          condition_decisions,
          score_components
        FROM public.underwriting_session_recommendations
        WHERE session_id = $1::uuid
        ORDER BY recommendation_rank ASC NULLS LAST
      `,
      [sessionId],
    );

    expect(recommendationRows).toHaveLength(1);
    expect(recommendationRows[0]).toMatchObject({
      product_id: fixture.productId,
      carrier_id: fixture.carrierId,
      eligibility_status: "eligible",
      health_class_result: "preferred",
      recommendation_reason: "best_value",
      recommendation_rank: 1,
      condition_decisions: result.sessionRecommendations[0]?.conditionDecisions,
      score_components: result.sessionRecommendations[0]?.scoreComponents,
    });
    expect(
      Number.parseFloat(recommendationRows[0]?.monthly_premium ?? "0"),
    ).toBe(83.51);
    expect(
      Number.parseFloat(recommendationRows[0]?.annual_premium ?? "0"),
    ).toBe(1002.12);
    expect(Number.parseFloat(recommendationRows[0]?.score ?? "0")).toBe(0.91);

    const { rows: auditLogRows } = await db.query<{
      condition_code: string | null;
      predicate_result: string | null;
      matched_conditions: unknown;
      missing_fields: unknown;
      outcome_applied: Record<string, unknown> | null;
      input_hash: string | null;
    }>(
      `
        SELECT
          condition_code,
          predicate_result,
          matched_conditions,
          missing_fields,
          outcome_applied,
          input_hash
        FROM public.underwriting_rule_evaluation_log
        WHERE session_id = $1::uuid
        ORDER BY evaluated_at ASC
      `,
      [sessionId],
    );

    expect(auditLogRows).toHaveLength(1);
    expect(auditLogRows[0]).toMatchObject({
      condition_code: "diabetes",
      predicate_result: "matched",
      matched_conditions: ["diabetes"],
      missing_fields: [],
      outcome_applied: {
        eligibility: "eligible",
        healthClass: "preferred",
        tableUnits: 0,
      },
      input_hash: "hash-replay-123",
    });
  });

  it("returns the existing session on an idempotent replay without duplicating persisted artifacts", async () => {
    const fixture = await seedPersistFixtures();
    const runKey = `run-${randomUUID()}`;

    const input = {
      clientAge: 51,
      clientGender: "male",
      clientState: "FL",
      clientHeightInches: 70,
      clientWeightLbs: 190,
      healthResponses: {
        version: 2,
        conditionsByCode: {},
      },
      conditionsReported: [],
      tobaccoUse: false,
      requestedFaceAmounts: [150000],
      requestedProductTypes: ["term_life"],
      selectedTermYears: 15,
      runKey,
    };

    const result = {
      sessionRecommendations: [
        {
          carrierId: fixture.carrierId,
          carrierName: "Replay Carrier",
          productId: fixture.productId,
          productName: "Replay Product",
          eligibilityStatus: "eligible",
          eligibilityReasons: [],
          missingFields: [],
          confidence: 0.8,
          approvalLikelihood: 0.76,
          healthClassResult: "standard",
          conditionDecisions: [],
          monthlyPremium: 61.25,
          annualPremium: 735,
          costPerThousand: 0.4083,
          score: 0.81,
          scoreComponents: { price: 0.5 },
          recommendationReason: "cheapest",
          recommendationRank: 1,
          draftRulesFyi: [],
        },
      ],
      rateTableRecommendations: [
        {
          carrierName: "Replay Carrier",
          productName: "Replay Product",
          termYears: 15,
          healthClass: "standard",
          monthlyPremium: 61.25,
          faceAmount: 150000,
          reason: "Low premium",
        },
      ],
      eligibilitySummary: {
        eligible: 1,
        unknown: 0,
        ineligible: 0,
      },
      evaluationMetadata: {
        engineVersion: "backend_authoritative_v1",
        requestId: "req-idempotent-123",
        runKey,
        selectedTermYears: 15,
      },
    };

    const auditRows = [
      {
        ruleSetId: null,
        ruleId: null,
        conditionCode: "general",
        predicateResult: "matched",
        matchedConditions: ["general"],
        failedConditions: null,
        missingFields: [],
        outcomeApplied: {
          eligibility: "eligible",
          healthClass: "standard",
          tableUnits: 0,
        },
        inputHash: "hash-idempotent-123",
      },
    ];

    const firstPersist = await persistAuthoritativeRun({
      actorId: fixture.userId,
      input,
      result,
      auditRows,
    });
    const secondPersist = await persistAuthoritativeRun({
      actorId: fixture.userId,
      input,
      result,
      auditRows,
    });

    expect(firstPersist.success).toBe(true);
    expect(firstPersist.alreadyPersisted).toBe(false);
    expect(secondPersist.success).toBe(true);
    expect(secondPersist.alreadyPersisted).toBe(true);
    expect(secondPersist.session?.id).toBe(firstPersist.session?.id);

    const db = getClient();
    const sessionId = firstPersist.session?.id;

    const { rows: recommendationCountRows } = await db.query<{
      count: string;
    }>(
      `
        SELECT COUNT(*)::text AS count
        FROM public.underwriting_session_recommendations
        WHERE session_id = $1::uuid
      `,
      [sessionId],
    );

    const { rows: auditCountRows } = await db.query<{
      count: string;
    }>(
      `
        SELECT COUNT(*)::text AS count
        FROM public.underwriting_rule_evaluation_log
        WHERE session_id = $1::uuid
      `,
      [sessionId],
    );

    expect(Number.parseInt(recommendationCountRows[0]?.count ?? "0", 10)).toBe(
      1,
    );
    expect(Number.parseInt(auditCountRows[0]?.count ?? "0", 10)).toBe(1);
  });
});
