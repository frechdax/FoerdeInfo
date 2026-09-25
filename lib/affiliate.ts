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
        "https://www.getyourguide.com/flensburg-l101640/flensburger-fjord-sailing-tour-with-captain-s-dinner-and-fun-swimming-in-ankerbucht-t1257250/"
      ),
      historyWalk: withPartnerId(
        "https://www.getyourguide.com/flensburg-l101640/flensburg-a-historical-journey-through-northern-germany-t1272323/"
      ),
    },
  },
} as const;
