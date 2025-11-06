import { ClientsManagement } from "../components/clients/ClientsManagement";

export default function Clients() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground">
          Manage your clients and their contact information.
        </p>
      </div>
      <ClientsManagement />
    </div>
  );
}