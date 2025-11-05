import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentFilters as PaymentFiltersType } from '../hooks/usePaymentTracking';

interface PaymentFiltersProps {
  filters: PaymentFiltersType;
  onFiltersChange: (filters: PaymentFiltersType) => void;
}

export const PaymentFilters: React.FC<PaymentFiltersProps> = ({ filters, onFiltersChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleStatusChange = (status: 'all' | 'unpaid' | 'pending' | 'paid') => {
    onFiltersChange({ ...filters, status });
  };

  const handleDateRangeChange = (field: 'from' | 'to', date: Date | undefined) => {
    if (!date) return;
    
    const newDateRange = filters.dateRange || { from: new Date(), to: new Date() };
    newDateRange[field] = date;
    onFiltersChange({ ...filters, dateRange: newDateRange });
  };

  const handleAmountRangeChange = (field: 'min' | 'max', value: string) => {
    const numValue = parseFloat(value) || 0;
    const newAmountRange = filters.amountRange || { min: 0, max: 1000 };
    newAmountRange[field] = numValue;
    onFiltersChange({ ...filters, amountRange: newAmountRange });
  };

  const clearFilters = () => {
    onFiltersChange({ status: 'all' });
  };

  const hasActiveFilters = filters.status !== 'all' || filters.dateRange || filters.amountRange;

  return (
    <div className="space-y-4 p-4 bg-background/50 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Label htmlFor="status-filter">Payment Status:</Label>
          <Select value={filters.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="unpaid">Unpaid Only</SelectItem>
              <SelectItem value="pending">Payment Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Advanced
          </Button>
          
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-3">
            <Label>Due Date Range</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange?.from ? format(filters.dateRange.from, "PPP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange?.from}
                    onSelect={(date) => handleDateRangeChange('from', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange?.to ? format(filters.dateRange.to, "PPP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange?.to}
                    onSelect={(date) => handleDateRangeChange('to', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Amount Range ($)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min amount"
                value={filters.amountRange?.min || ''}
                onChange={(e) => handleAmountRangeChange('min', e.target.value)}
              />
              <Input
                type="number"
                placeholder="Max amount"
                value={filters.amountRange?.max || ''}
                onChange={(e) => handleAmountRangeChange('max', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};