import { VendorPaymentsTable } from "../components/dashboard/VendorPaymentsTable";

export default function VendorPayments() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vendor Payments</h1>
        <p className="text-muted-foreground">
          Track and manage vendor payments for campaigns.
        </p>
      </div>
      <VendorPaymentsTable />
    </div>
  );
}