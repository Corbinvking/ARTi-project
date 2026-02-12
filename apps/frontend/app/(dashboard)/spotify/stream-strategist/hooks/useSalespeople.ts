// Re-export shared salespeople hooks
// This file is kept for backward compatibility - hooks have been moved to @/hooks/use-salespeople
export {
  useSalespeople,
  useCreateSalesperson,
  useUpdateSalesperson,
  useDeleteSalesperson,
  useSalespeopleOptions,
  useBulkImportSalespeople,
  type Salesperson,
  type CreateSalespersonData,
  type UpdateSalespersonData,
} from '@/hooks/use-salespeople';
