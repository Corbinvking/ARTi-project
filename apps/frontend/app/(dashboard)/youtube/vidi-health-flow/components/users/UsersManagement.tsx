import { useAuth } from "../../contexts/AuthContext";
import AdminUserManagement from "../admin/AdminUserManagement";

const UsersManagement = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground mt-2">
          You don't have permission to access user management.
        </p>
      </div>
    );
  }

  return <AdminUserManagement />;
};

export default UsersManagement;