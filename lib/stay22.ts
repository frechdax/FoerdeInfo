const stay22Aid = "glcksburgdirekt";

export const stay22AffiliateEnabled = true;

const stay22Params = new URLSearchParams({
  aid: stay22Aid,
  address: "Flensburg, Schleswig-Holstein, Germany",
  source: "direct",
  campaign: "flensburg-unterkunft",
});

export const stay22AccommodationUrl =
  `https://www.stay22.com/allez/roam?${stay22Params.toString()}`;
