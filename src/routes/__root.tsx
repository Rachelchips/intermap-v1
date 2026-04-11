/// <reference types="vite/client" />
import { Outlet, createRootRoute, Scripts } from "@tanstack/react-router";

import globalCss from "@/styles/global.css?url";
import { TrpcProvider } from "@/client/trpc/provider";
import { IntermapProvider } from "@/client/store/intermap-store";

export const Route = createRootRoute({
  component: RootDocument,
});

function RootDocument() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <title>Intermap — 奇幻世界地图编辑器</title>
        <link rel="stylesheet" href={globalCss} />
        <link rel="icon" type="image/png" href="/薯条汪.png" />
        <link rel="apple-touch-icon" href="/薯条汪.png" />
      </head>
      <body>
        <TrpcProvider>
          <IntermapProvider>
            <Outlet />
          </IntermapProvider>
        </TrpcProvider>
        <Scripts />
      </body>
    </html>
  );
}
