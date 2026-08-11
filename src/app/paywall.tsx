import { Redirect } from "expo-router";

/**
 * Compatibility route for links created before the Pro screen replaced the
 * draft Premium/BYO-key paywall. All purchases now use the single audited
 * RevenueCat flow in /pro.
 */
export default function LegacyPaywallRedirect() {
  return <Redirect href="/pro" />;
}
