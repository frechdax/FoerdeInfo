import {
  stay22AccommodationUrl,
  stay22AffiliateEnabled,
} from "@/lib/stay22";

const getYourGuidePartnerId =
  process.env.NEXT_PUBLIC_GETYOURGUIDE_PARTNER_ID?.trim() || "XVPC5K2";

function withPartnerId(url: string) {
  if (!getYourGuidePartnerId) return url;
  const parsed = new URL(url);
  parsed.searchParams.set("partner_id", getYourGuidePartnerId);
  return parsed.toString();
}

export const affiliateLinks = {
  accommodation: {
    url: stay22AccommodationUrl,
    enabled: stay22AffiliateEnabled,
    provider: "Stay22",
  },
  activities: {
    url: withPartnerId("https://www.getyourguide.com/flensburg-l101640/"),
    enabled: Boolean(getYourGuidePartnerId),
    provider: "GetYourGuide",
    offers: {
      sailing: withPartnerId(
        "https://www.getyourguide.com/flensburg-l101640/flensburg-fjord-sailing-tour-with-captain-s-dinner-and-fun-swimming-in-ankerbucht-t1257250/"
      ),
      eBoat: withPartnerId(
        "https://www.getyourguide.com/flensburg-l101640/flensburg-e-boat-rent-t674597/"
      ),
      runningTour: withPartnerId(
        "https://www.getyourguide.com/flensburg-l101640/flensburg-running-tour-with-insider-tip-guarantee-t729641/"
      ),
      walkingTour: withPartnerId(
        "https://www.getyourguide.com/flensburg-l101640/flensburg-private-guided-walking-tour-t457495/"
      ),
      escapeGame: withPartnerId(
        "https://www.getyourguide.com/flensburg-l101640/flensburg-extraordinary-escape-game-true-crime-stories-and-city-tour-t1344488/"
      ),
    },
  },
} as const;
