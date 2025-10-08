// Exportar todos os serviços de escalas
export { AvailabilityValidator } from './availability-validator.service';
export { ScaleAssignmentEngine } from './scale-assignment-engine.service';
export { SubstitutionEngine } from './substitution-engine.service';

// Exportar tipos e interfaces
export type {
  AvailabilityCheckResult,
  MonthlyBlockedDaysInfo,
} from './availability-validator.service';
export type {
  ScaleAssignmentSuggestion,
  ScaleGenerationResult,
} from './scale-assignment-engine.service';
export type {
  SwapCandidate,
  SwapRequestResult,
} from './substitution-engine.service';
