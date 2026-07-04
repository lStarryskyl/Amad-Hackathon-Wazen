import type { ComponentProps } from "react";
import { Feather } from "@expo/vector-icons";

type FeatherName = ComponentProps<typeof Feather>["name"];

const ICON_MAP: Record<string, FeatherName> = {
  utensils: "coffee",
  car: "truck",
  film: "film",
  "shopping-bag": "shopping-bag",
  home: "home",
  heart: "heart",
  zap: "zap",
  "trending-up": "trending-up",
  scissors: "scissors",
  "more-horizontal": "more-horizontal",
  coffee: "coffee",
  truck: "truck",
  briefcase: "briefcase",
  target: "target",
  cpu: "cpu",
  activity: "activity",
  layers: "layers",
  tag: "tag",
  "shopping-cart": "shopping-cart",
  "bar-chart-2": "bar-chart-2",
  "pie-chart": "pie-chart",
};

export function toFeatherIcon(iconName: string | null | undefined): FeatherName {
  if (!iconName) return "circle";
  return ICON_MAP[iconName] ?? "circle";
}
