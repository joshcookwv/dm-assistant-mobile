export const FREE_CAMPAIGN_LIMIT = 1;

export function canCreateCampaign(isPro: boolean, campaignCount: number): boolean {
  return isPro || campaignCount < FREE_CAMPAIGN_LIMIT;
}

export const PRO_FEATURES = [
  "Unlimited campaigns",
  "NPC name and description generator",
  "Campaign summaries",
  "Session summaries",
  "AI-assisted PDF import",
] as const;
