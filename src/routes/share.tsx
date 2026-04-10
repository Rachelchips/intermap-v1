// src/routes/share.tsx
// Read-only shared map page — rendered at /share
import { createFileRoute } from "@tanstack/react-router";
import { ShareMapView } from "@/client/views/share-map-view";

export const Route = createFileRoute("/share")({ component: ShareMapView });
