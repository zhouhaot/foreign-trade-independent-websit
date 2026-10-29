import { authCatalogCases } from "./auth-catalog.mjs";
import { commercialCases } from "./commercial.mjs";
import { lifecycleCases } from "./lifecycle.mjs";
import { systemCases } from "./system.mjs";

export const acceptanceCases = {
  ...authCatalogCases,
  ...commercialCases,
  ...lifecycleCases,
  ...systemCases,
};

export const externallyDelegatedCases = new Set(["RESTART-01"]);
