import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isDashboard = pathname.startsWith("/dashboard");
  const isTeacherRoute = pathname.startsWith("/dashboard/teacher");
  const isStudentRoute = pathname.startsWith("/dashboard/student");

  // Jika user sudah login dan akses /login atau /register → redirect ke /dashboard
  if (session && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Jika belum login dan akses /dashboard → redirect ke /login
  if (!session && isDashboard) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Gate by role untuk sub-route
  if (session && isTeacherRoute) {
    const role = (session.user.user_metadata as { role?: string })?.role;
    if (role !== "teacher") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (session && isStudentRoute) {
    const role = (session.user.user_metadata as { role?: string })?.role;
    if (role !== "student") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ["/login", "/register", "/dashboard/:path*"],
};
