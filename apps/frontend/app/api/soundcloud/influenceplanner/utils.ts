import { createClient } from "@supabase/supabase-js";

export const createAdminClient = (authToken?: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL configuration.");
  }

  const keyToUse = serviceRoleKey || anonKey;
  if (!keyToUse) {
    throw new Error("Missing Supabase API key configuration.");
  }

  if (!serviceRoleKey && !authToken) {
    throw new Error("Missing Supabase service role configuration.");
  }

  return createClient(supabaseUrl, keyToUse, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: { schema: "public" },
    global: authToken
      ? {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      : undefined,
  });
};

export const getAuthorizedUser = async (request: Request) => {
  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { error: "Unauthorized - missing token", status: 401 };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const supabaseAdmin = createAdminClient(token);
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

  const allowedPlatformRoles = ["admin", "moderator", "manager", "operator"];
  const hasAllowedRole = roles.some((r) => allowedPlatformRoles.includes(r));
  if (roles.length > 0 && !hasAllowedRole) {
    return { error: "Forbidden - platform access required", status: 403 };
  }

  return { user, status: 200, token };
};
