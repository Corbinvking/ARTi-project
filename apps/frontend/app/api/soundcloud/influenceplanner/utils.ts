import { createClient } from "@supabase/supabase-js";

export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service role configuration.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: { schema: "public" },
  });
};

export const getAuthorizedUser = async (request: Request) => {
  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { error: "Unauthorized - missing token", status: 401 };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return { error: "Unauthorized - invalid token", status: 401 };
  }

  const user = data.user;
  const metadataRoles = user.user_metadata?.roles || user.app_metadata?.roles || [];
  const singleRole = user.user_metadata?.role || user.app_metadata?.role;
  const roles = [
    ...(Array.isArray(metadataRoles) ? metadataRoles : []),
    ...(singleRole ? [singleRole] : []),
  ];

  if (roles.length > 0 && !roles.includes("admin") && !roles.includes("moderator")) {
    return { error: "Forbidden - admin access required", status: 403 };
  }

  return { user, status: 200 };
};
