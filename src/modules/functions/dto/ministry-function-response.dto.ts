export class MinistryFunctionResponseDto {
  functionId: string;
  name: string;
  slug: string;
  category?: string;
  description?: string;
  isActive: boolean;
  defaultSlots?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BulkUpsertResponseDto {
  created: MinistryFunctionResponseDto[];
  linked: MinistryFunctionResponseDto[];
  alreadyLinked: MinistryFunctionResponseDto[];
  suggestions: {
    name: string;
    suggested: string;
    reason: string;
  }[];
}
