export interface ExtractedNpc {
  name: string;
  race?: string;
  role?: string;
  location?: string;
  description?: string;
}

export interface ExtractedMonster {
  name: string;
  size?: string;
  type?: string;
  alignment?: string;
  armor_class?: number;
  hit_points?: number;
  hit_dice?: string;
  speed?: string;
  challenge_rating?: string;
  stat_block?: string;
}

export interface ExtractedRule {
  title: string;
  content: string;
}

export interface ExtractionResult {
  npcs: ExtractedNpc[];
  monsters: ExtractedMonster[];
  rules: ExtractedRule[];
}
