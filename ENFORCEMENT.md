# ENFORCEMENT.md

This document defines how rules in `CLAUDE.md` are technically enforced.

---

# Automated Enforcement Overview

Enforced by:

- GitHub Actions CI Pipeline
- Husky Pre-Push Hook
- lint-staged
- Formatting & lint rules
- PR Template Requirements

---

# 1. Database Types Sync Enforcement

## Mechanism

CI regenerates `generated.types.ts` using:
