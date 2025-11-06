import UsersManagement from "../components/users/UsersManagement";

export default function Users() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Manage user accounts and permissions.
        </p>
      </div>
      <UsersManagement />
    </div>
  );
}