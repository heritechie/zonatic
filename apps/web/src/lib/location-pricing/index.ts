/**
 * Public surface of the location pricing layer.
 *
 * Components import from here only, so the internal file layout — including
 * the JSON data files — can change without touching the UI.
 */
export type {
  BillingModel,
  CalculationInput,
  CalculationResult,
  ConversionRequest,
  CostDelta,
  CostLine,
  CurrencyCode,
  EffectiveWindow,
  FlatRateProduct,
  FreeAllowance,
  FxConfig,
  FxRate,
  PricingProduct,
  PricingSource,
  PricingTier,
  PricingUnit,
  PricingVerification,
  ProgressiveTierProduct,
  ProviderId,
  ProviderPricing,
  ZonaticPlan,
  ZonaticPricing,
} from "./types";

export {
  availableProducts,
  billableUnits,
  calculateLocationApiCost,
  COMPARISON_CURRENCY,
  planForVolume,
  progressiveTierCost,
  REQUEST_PRESETS,
  sanitizeMonthlyRequests,
  usdToIdr,
} from "./calculator";

export { googlePricing, zonaticPricing } from "./calculator";

export {
  conversionRate,
  convertCurrency,
  fxConfig,
} from "./fx";

export {
  formatCheckedAt,
  formatCurrency,
  formatNumber,
  formatRateStatement,
  formatRequests,
  parseRequestInput,
} from "./format";

export {
  assertValidPricing,
  validateFxConfig,
  validateProviderPricing,
  validateZonaticPricing,
  type ValidationResult,
} from "./validate";
