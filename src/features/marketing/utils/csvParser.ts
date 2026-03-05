export interface CsvRow {
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  tags?: string[];
  source?: string;
}

interface ParseResult {
  rows: CsvRow[];
  errors: string[];
  headerMap: Record<string, string>;
}

// Known header aliases mapped to our fields
const HEADER_ALIASES: Record<string, string> = {
  email: "email",
  "email address": "email",
  email_address: "email",
  "e-mail": "email",
  first_name: "first_name",
  "first name": "first_name",
  firstname: "first_name",
  "given name": "first_name",
  last_name: "last_name",
  "last name": "last_name",
  lastname: "last_name",
  surname: "last_name",
  "family name": "last_name",
  company: "company",
  organization: "company",
  org: "company",
  tags: "tags",
  source: "source",
  name: "name",
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return {
      rows: [],
      errors: ["File must have a header row and at least one data row."],
      headerMap: {},
    };
  }

  const headers = parseCsvLine(lines[0]);
  const headerMap: Record<string, string> = {};
  const colMapping: Record<number, string> = {};

  headers.forEach((h, i) => {
    const normalized = h.toLowerCase().trim();
    const mapped = HEADER_ALIASES[normalized];
    if (mapped) {
      colMapping[i] = mapped;
      headerMap[h] = mapped;
    }
  });

  if (!Object.values(colMapping).includes("email")) {
    return {
      rows: [],
      errors: [
        "No email column found. Expected a column named 'email' or 'Email Address'.",
      ],
      headerMap,
    };
  }

  const rows: CsvRow[] = [];
  const errors: string[] = [];
  const seenEmails = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const record: Record<string, string> = {};

    Object.entries(colMapping).forEach(([colIdx, field]) => {
      record[field] = cols[Number(colIdx)] || "";
    });

    const email = record.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      errors.push(`Row ${i + 1}: Invalid or missing email.`);
      continue;
    }

    if (seenEmails.has(email)) {
      errors.push(`Row ${i + 1}: Duplicate email "${email}" — skipped.`);
      continue;
    }
    seenEmails.add(email);

    // Handle combined "name" field
    let firstName = record.first_name || "";
    let lastName = record.last_name || "";
    if (!firstName && !lastName && record.name) {
      const parts = record.name.trim().split(/\s+/);
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ");
    }

    rows.push({
      email,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      company: record.company || undefined,
      tags: record.tags
        ? record.tags
            .split(/[,;]/)
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
      source: record.source || undefined,
    });
  }

  return { rows, errors, headerMap };
}
