// src/routes/index.tsx
import { IntermapApp } from "@/client/views/intermap-app";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IntermapApp,
});
