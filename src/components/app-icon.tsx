import { SymbolView, type AndroidSymbol, type SFSymbol } from "expo-symbols";
import type { ColorValue, StyleProp, ViewStyle } from "react-native";

import { Colors } from "@/constants/colors";

const ICONS = {
  dashboard: { ios: "rectangle.grid.2x2.fill", android: "dashboard", web: "dashboard" },
  rules: { ios: "book.closed.fill", android: "menu_book", web: "menu_book" },
  monsters: { ios: "pawprint.fill", android: "pets", web: "pets" },
  npcs: { ios: "person.2.fill", android: "groups", web: "groups" },
  notes: { ios: "note.text", android: "note", web: "note" },
  session: { ios: "checklist", android: "checklist", web: "checklist" },
  encounters: { ios: "shield.fill", android: "swords", web: "swords" },
  armor: { ios: "tshirt.fill", android: "checkroom", web: "checkroom" },
  maps: { ios: "map.fill", android: "map", web: "map" },
  import: { ios: "doc.badge.arrow.up", android: "upload_file", web: "upload_file" },
  settings: { ios: "gearshape.fill", android: "settings", web: "settings" },
  search: { ios: "magnifyingglass", android: "search", web: "search" },
  add: { ios: "plus", android: "add", web: "add" },
  chevronRight: { ios: "chevron.right", android: "chevron_right", web: "chevron_right" },
  chevronLeft: { ios: "chevron.left", android: "chevron_left", web: "chevron_left" },
  quick: { ios: "bolt.fill", android: "bolt", web: "bolt" },
  sparkles: { ios: "sparkles", android: "auto_awesome", web: "auto_awesome" },
  home: { ios: "house.fill", android: "home", web: "home" },
  library: { ios: "books.vertical.fill", android: "auto_stories", web: "auto_stories" },
  person: { ios: "person.fill", android: "person", web: "person" },
  document: { ios: "doc.text.fill", android: "description", web: "description" },
  folder: { ios: "folder.fill", android: "folder", web: "folder" },
  chart: { ios: "chart.bar.fill", android: "monitoring", web: "monitoring" },
  bookmark: { ios: "bookmark.fill", android: "bookmark", web: "bookmark" },
  check: { ios: "checkmark", android: "check", web: "check" },
  chevronDown: { ios: "chevron.down", android: "expand_more", web: "expand_more" },
  chevronUp: { ios: "chevron.up", android: "expand_less", web: "expand_less" },
  image: { ios: "photo.fill", android: "image", web: "image" },
  link: { ios: "link", android: "link", web: "link" },
  clock: { ios: "clock.fill", android: "schedule", web: "schedule" },
  tag: { ios: "tag.fill", android: "sell", web: "sell" },
  trash: { ios: "trash.fill", android: "delete", web: "delete" },
} as const satisfies Record<
  string,
  { ios: SFSymbol; android: AndroidSymbol; web: AndroidSymbol }
>;

export type AppIconName = keyof typeof ICONS;

export function AppIcon({
  name,
  size = 22,
  color = Colors.foreground,
  style,
}: {
  name: AppIconName;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
}) {
  return <SymbolView name={ICONS[name]} size={size} tintColor={color} style={style} />;
}
