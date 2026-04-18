import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Không tìm thấy trang</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Liên kết bạn truy cập không tồn tại hoặc đã bị di chuyển.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VinSight Scan – Giải mã VIN xe" },
      { name: "description", content: "VinSight Scan: giải mã VIN ô tô, cấp API key, rate limit 60 req/phút." },
      { property: "og:title", content: "VinSight Scan – Giải mã VIN xe" },
      { property: "og:description", content: "VinSight Scan: giải mã VIN ô tô, cấp API key, rate limit 60 req/phút." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "VinSight Scan – Giải mã VIN xe" },
      { name: "twitter:description", content: "VinSight Scan: giải mã VIN ô tô, cấp API key, rate limit 60 req/phút." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f704ac5f-6404-4dc0-8667-cfe8008b474a/id-preview-ab23884f--87c3b8c8-42e4-4458-a53b-0b379ca103a6.lovable.app-1776501978042.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f704ac5f-6404-4dc0-8667-cfe8008b474a/id-preview-ab23884f--87c3b8c8-42e4-4458-a53b-0b379ca103a6.lovable.app-1776501978042.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "preconnect", href: "https://fonts.googleapis.com" }, { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <HeadContent />
      </head>
      <body className="dark">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster />
    </AuthProvider>
  );
}
