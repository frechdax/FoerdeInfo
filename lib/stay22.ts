const fallbackBookingUrl = "https://www.booking.com/city/de/glucksburg.de.html";

const stay22Aid = process.env.NEXT_PUBLIC_STAY22_AID?.trim();

export const stay22AffiliateEnabled = Boolean(stay22Aid);

export const stay22AccommodationUrl = stay22Aid
  ? `https://www.stay22.com/allez/roam?aid=${encodeURIComponent(
      stay22Aid
    )}&address=${encodeURIComponent("Glücksburg, Schleswig-Holstein, Germany")}`
  : fallbackBookingUrl;
