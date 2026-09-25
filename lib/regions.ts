export const regions = [
  {
    id: "flensburg",
    name: "Flensburg",
    latitude: 54.7877,
    longitude: 9.4399,
    detail: "Innenstadt, Hafen, Ostseebad und Solitüde",
    beaches: ["DESH_PR_0001", "DESH_PR_0002"],
    eventsUrl: "https://www.flensburger-foerde.de/events/veranstaltungen",
  },
  {
    id: "wassersleben",
    name: "Wassersleben",
    latitude: 54.8284,
    longitude: 9.4216,
    detail: "Strand und Umgebung in der Gemeinde Harrislee",
    beaches: ["DESH_PR_0249"],
    eventsUrl: "https://www.flensburger-foerde.de/events/veranstaltungen",
  },
  {
    id: "gluecksburg",
    name: "Glücksburg",
    latitude: 54.8357,
    longitude: 9.5487,
    detail: "Sandwig, Holnis und Quellental",
    beaches: ["DESH_PR_0250", "DESH_PR_0251"],
    eventsUrl: "https://gluecksburg.kulturbytes.de/",
  },
  {
    id: "langballig",
    name: "Langballig",
    latitude: 54.8246,
    longitude: 9.6597,
    detail: "Langballigau und das östliche Fördeufer",
    beaches: ["DESH_PR_0253"],
    eventsUrl: "https://www.flensburger-foerde.de/events/veranstaltungen",
  },
] as const;

export type RegionId = (typeof regions)[number]["id"];

export function getRegion(id: string) {
  return regions.find((region) => region.id === id);
}
