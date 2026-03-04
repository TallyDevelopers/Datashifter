import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const isPortalRoute = path.startsWith("/dashboard") ||
    path.startsWith("/orgs") ||
    path.startsWith("/syncs") ||
    path.startsWith("/logs") ||
    path.startsWith("/support");

  const isAdminRoute = path.startsWith("/admin");
  const isAdminApiRoute = path.startsWith("/api/admin");

  const isAuthRoute = path.startsWith("/login") ||
    path.startsWith("/signup");

  if (!user && (isPortalRoute || isAdminRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // Admin routes: verify the user exists in admin_users table
  if (user && (isAdminRoute || isAdminApiRoute)) {
    const { data: adminRecord } = await supabase
      .from("admin_users")
      .select("id")
      .eq("supabase_user_id", user.id)
      .single();

    if (!adminRecord) {
      const url = request.nextUrl.clone();
      url.pathname = isAdminApiRoute ? "/" : "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
