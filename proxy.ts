import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 認証不要のパス
const PUBLIC_PATHS = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // リクエストとレスポンス両方にcookieを設定してセッションを維持
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);

  // 未ログインで保護ページにアクセスした場合はログインへ
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ログイン済みでログイン/登録ページにアクセスした場合はトップへ
  if (user && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  // APIルート・静的ファイル・faviconはミドルウェアをスキップ
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
