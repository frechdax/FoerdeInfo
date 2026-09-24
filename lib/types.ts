export type AccuracyType = "gps" | "estimated";

export interface Vehicle {
  id: string;
  line: string;
  routeId: string;
  tripId?: string;
  operator: string;
  destination?: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  delaySeconds?: number;
  nextStop?: string;
  nextStopId?: string;
  nextArrival?: string;
  timestamp: string;
  accuracyType: AccuracyType;
  source: string;
  color?: string;
}

export interface StopPoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface TripStop {
  stopId: string;
  arrival: string;
  departure: string;
  sequence: number;
  shapeDist?: number;
}

export interface StaticTrip {
  id: string;
  routeId: string;
  serviceId: string;
  headsign?: string;
  shapeId?: string;
  directionId?: string;
  stops: TripStop[];
}

export interface StaticRoute {
  id: string;
  agencyId?: string;
  shortName: string;
  longName?: string;
  color?: string;
  textColor?: string;
  type?: number;
}

export interface Agency {
  id: string;
  name: string;
  url?: string;
}

export interface ServiceCalendar {
  serviceId: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  startDate: string;
  endDate: string;
}

export interface CalendarException {
  serviceId: string;
  date: string;
  exceptionType: 1 | 2;
}

export interface RegionData {
  generatedAt: string | null;
  sourceUrl: string | null;
  agencies: Agency[];
  routes: StaticRoute[];
  stops: StopPoint[];
  trips: StaticTrip[];
  shapes: Record<string, [number, number][]>;
  calendar: ServiceCalendar[];
  calendarDates: CalendarException[];
}

export interface TripUpdateSnapshot {
  tripId: string;
  routeId?: string;
  startDate?: string;
  timestamp?: string;
  delaySeconds?: number;
  stopUpdates: Array<{
    stopId?: string;
    stopSequence?: number;
    arrivalTime?: number;
    departureTime?: number;
    arrivalDelay?: number;
    departureDelay?: number;
  }>;
}

export interface ServiceAlertSnapshot {
  id: string;
  header?: string;
  description?: string;
}

export interface ProviderStatus {
  id: string;
  name: string;
  state: "online" | "degraded" | "disabled" | "offline";
  lastUpdate?: string;
  detail: string;
}

export interface TransitRealtimeProvider {
  readonly id: string;
  readonly name: string;
  getVehicles(): Promise<Vehicle[]>;
  getTripUpdates(): Promise<TripUpdateSnapshot[]>;
  getServiceAlerts(): Promise<ServiceAlertSnapshot[]>;
  getLastUpdate(): string | undefined;
  getProviderStatus(): Promise<ProviderStatus>;
}
