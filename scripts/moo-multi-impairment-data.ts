// scripts/moo-multi-impairment-data.ts
// Mutual of Omaha - Multiple Impairments for Term Life Express and IUL Express

export interface MultiImpairmentRule {
  name: string;
  description: string;
  conditions: string[]; // Condition codes involved
  predicateDescription: string;
  decision: "decline";
  notes: string;
}

// CARRIER: Mutual of Omaha
export const CARRIER_ID = "d619cc12-0a24-4242-9a2d-3dada1fb4b1e";
export const GUIDE_ID = "d3649a91-9609-4501-95b2-90e34307c95e";
export const IMO_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";

// Products this applies to
export const PRODUCT_IDS = {
  TERM_LIFE_EXPRESS: "1acbbee5-3cd4-4d47-9f2f-eb05d09f0023",
  IUL_EXPRESS: "3c227f86-4f5c-4c37-ac07-e8fa28c451c5",
};

// Multiple impairments resulting in decline
// Note: Any combination > Table 4 rating is declined for Express products
export const MULTI_IMPAIRMENT_RULES: MultiImpairmentRule[] = [
  // Diabetes combination rules
  {
    name: "Diabetes + Table 2+ Build (Age > 45)",
    description:
      "Diabetes over age 45 with Table 2 or higher build chart rating",
    conditions: ["diabetes_type_2", "obesity"],
    predicateDescription: "age > 45 AND has diabetes AND build >= Table 2",
    decision: "decline",
    notes: "For CA and VI, age threshold is 50",
  },
  {
    name: "Diabetes + Tobacco (Age > 45)",
    description: "Diabetes over age 45 with tobacco or nicotine use",
    conditions: ["diabetes_type_2"],
    predicateDescription: "age > 45 AND has diabetes AND tobacco_use = true",
    decision: "decline",
    notes: "For CA and VI, age threshold is 50",
  },
  {
    name: "Diabetes + PVD (Age > 45)",
    description: "Diabetes over age 45 with Peripheral Vascular Disease",
    conditions: ["diabetes_type_2", "peripheral_vascular_disease"],
    predicateDescription: "age > 45 AND has diabetes AND has PVD",
    decision: "decline",
    notes: "For CA and VI, age threshold is 50",
  },
  {
    name: "Diabetes with Complications",
    description:
      "Diabetes with any complications (retinopathy, neuropathy, nephropathy, etc.)",
    conditions: ["diabetes_type_1", "diabetes_type_2"],
    predicateDescription: "has diabetes AND has any complication",
    decision: "decline",
    notes: "Any diabetic complication results in decline",
  },

  // Build chart combination rules
  {
    name: "Table 2+ Build + Hypertension",
    description: "Table 2 or higher build with hypertension",
    conditions: ["obesity", "hypertension"],
    predicateDescription: "build >= Table 2 AND has hypertension",
    decision: "decline",
    notes: "Refer to Table 2 Build Chart",
  },
  {
    name: "Table 2+ Build + Asthma + Tobacco",
    description: "Table 2 or higher build with asthma and tobacco/nicotine use",
    conditions: ["obesity", "asthma"],
    predicateDescription:
      "build >= Table 2 AND has asthma AND tobacco_use = true",
    decision: "decline",
    notes: "Three-factor combination",
  },
  {
    name: "Table 2+ Build + PVD",
    description: "Table 2 or higher build with Peripheral Vascular Disease",
    conditions: ["obesity", "peripheral_vascular_disease"],
    predicateDescription: "build >= Table 2 AND has PVD",
    decision: "decline",
    notes: "Refer to Table 2 Build Chart",
  },
];

// Build predicates for the rules
export function buildPredicate(rule: MultiImpairmentRule): object {
  switch (rule.name) {
    case "Diabetes + Table 2+ Build (Age > 45)":
      return {
        version: 2,
        root: {
          all: [
            { type: "numeric", field: "client.age", operator: "gt", value: 45 },
            {
              type: "array",
              field: "conditions",
              operator: "includes_any",
              value: ["diabetes_type_1", "diabetes_type_2"],
            },
            {
              type: "string",
              field: "client.table_rating",
              operator: "in",
              value: [
                "B",
                "C",
                "D",
                "E",
                "F",
                "G",
                "H",
                "I",
                "J",
                "K",
                "L",
                "M",
                "N",
                "O",
                "P",
              ],
            },
          ],
        },
      };

    case "Diabetes + Tobacco (Age > 45)":
      return {
        version: 2,
        root: {
          all: [
            { type: "numeric", field: "client.age", operator: "gt", value: 45 },
            {
              type: "array",
              field: "conditions",
              operator: "includes_any",
              value: ["diabetes_type_1", "diabetes_type_2"],
            },
            {
              type: "boolean",
              field: "client.tobacco",
              operator: "eq",
              value: true,
            },
          ],
        },
      };

    case "Diabetes + PVD (Age > 45)":
      return {
        version: 2,
        root: {
          all: [
            { type: "numeric", field: "client.age", operator: "gt", value: 45 },
            {
              type: "array",
              field: "conditions",
              operator: "includes_any",
              value: ["diabetes_type_1", "diabetes_type_2"],
            },
            {
              type: "array",
              field: "conditions",
              operator: "includes_any",
              value: ["peripheral_vascular_disease"],
            },
          ],
        },
      };

    case "Diabetes with Complications":
      return {
        version: 2,
        root: {
          all: [
            {
              type: "array",
              field: "conditions",
              operator: "includes_any",
              value: ["diabetes_type_1", "diabetes_type_2"],
            },
            {
              type: "array",
              field: "diabetes_type_2.complications",
              operator: "is_not_empty",
              value: null,
            },
          ],
        },
      };

    case "Table 2+ Build + Hypertension":
      return {
        version: 2,
        root: {
          all: [
            {
              type: "string",
              field: "client.table_rating",
              operator: "in",
              value: [
                "B",
                "C",
                "D",
                "E",
                "F",
                "G",
                "H",
                "I",
                "J",
                "K",
                "L",
                "M",
                "N",
                "O",
                "P",
              ],
            },
            {
              type: "array",
              field: "conditions",
              operator: "includes_any",
              value: ["hypertension"],
            },
          ],
        },
      };

    case "Table 2+ Build + Asthma + Tobacco":
      return {
        version: 2,
        root: {
          all: [
            {
              type: "string",
              field: "client.table_rating",
              operator: "in",
              value: [
                "B",
                "C",
                "D",
                "E",
                "F",
                "G",
                "H",
                "I",
                "J",
                "K",
                "L",
                "M",
                "N",
                "O",
                "P",
              ],
            },
            {
              type: "array",
              field: "conditions",
              operator: "includes_any",
              value: ["asthma"],
            },
            {
              type: "boolean",
              field: "client.tobacco",
              operator: "eq",
              value: true,
            },
          ],
        },
      };

    case "Table 2+ Build + PVD":
      return {
        version: 2,
        root: {
          all: [
            {
              type: "string",
              field: "client.table_rating",
              operator: "in",
              value: [
                "B",
                "C",
                "D",
                "E",
                "F",
                "G",
                "H",
                "I",
                "J",
                "K",
                "L",
                "M",
                "N",
                "O",
                "P",
              ],
            },
            {
              type: "array",
              field: "conditions",
              operator: "includes_any",
              value: ["peripheral_vascular_disease"],
            },
          ],
        },
      };

    default:
      return { version: 2, root: {} };
  }
}
