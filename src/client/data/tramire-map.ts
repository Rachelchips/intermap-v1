import tramireMapData from "./tramire-map.json";
import type { MapProject } from "../types/intermap-types";

export function createBuiltInTramireMap(): MapProject {
  return structuredClone(tramireMapData as MapProject);
}
