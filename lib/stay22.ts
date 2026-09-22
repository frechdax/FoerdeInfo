const stay22Aid = "glcksburgdirekt";

export const stay22AffiliateEnabled = true;

const stay22Params = new URLSearchParams({
  aid: stay22Aid,
  address: "Glücksburg, Schleswig-Holstein, Germany",
  source: "direct",
  campaign: "gluecksburg-unterkunft",
});

export const stay22AccommodationUrl =
  `https://www.stay22.com/allez/roam?${stay22Params.toString()}`;
