type AirportReference = {
  code?: string | null;
  code_icao?: string | null;
  code_iata?: string | null;
  code_lid?: string | null;
  timezone?: string | null;
  name?: string | null;
  city?: string | null;
};

type FlightAwareFlight = {
  ident?: string | null;
  ident_icao?: string | null;
  ident_iata?: string | null;
  fa_flight_id?: string | null;
  operator?: string | null;
  operator_icao?: string | null;
  operator_iata?: string | null;
  flight_number?: string | null;
  registration?: string | null;
  codeshares_iata?: string[] | null;
  cancelled?: boolean;
  diverted?: boolean;
  origin?: AirportReference | null;
  destination?: AirportReference | null;
  arrival_delay?: number | null;
  status?: string | null;
  aircraft_type?: string | null;
  baggage_claim?: string | null;
  gate_destination?: string | null;
  terminal_destination?: string | null;
  type?: "Airline" | "General_Aviation" | string | null;
  scheduled_on?: string | null;
  estimated_on?: string | null;
  actual_on?: string | null;
  scheduled_in?: string | null;
  estimated_in?: string | null;
  actual_in?: string | null;
  actual_off?: string | null;
  actual_out?: string | null;
};

type FlightAwareResponse = {
  scheduled_arrivals?: FlightAwareFlight[];
  links?: {
    next?: string | null;
  } | null;
  num_pages?: number;
  title?: string;
  reason?: string;
  detail?: string;
  status?: number;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLIGHTAWARE_BASE_URL =
  "https://aeroapi.flightaware.com/aeroapi";

function roundDownToFiveMinutes(date: Date) {
  const rounded = new Date(date);
  rounded.setUTCSeconds(0, 0);
  rounded.setUTCMinutes(Math.floor(rounded.getUTCMinutes() / 5) * 5);
  return rounded;
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => Boolean(value?.trim()))?.trim() || null;
}

function getArrivalTime(flight: FlightAwareFlight) {
  return firstNonEmpty(
    flight.actual_in,
    flight.actual_on,
    flight.estimated_in,
    flight.estimated_on,
    flight.scheduled_in,
    flight.scheduled_on
  );
}

function getScheduledArrivalTime(flight: FlightAwareFlight) {
  return firstNonEmpty(flight.scheduled_in, flight.scheduled_on);
}

function getEstimatedArrivalTime(flight: FlightAwareFlight) {
  return firstNonEmpty(
    flight.actual_in,
    flight.actual_on,
    flight.estimated_in,
    flight.estimated_on
  );
}

const COMMON_AIRLINES: Record<string, string> = {
  AA: "American",
  DL: "Delta",
  G4: "Allegiant",
  UA: "United",
};

const REGIONAL_OPERATORS: Record<string, string> = {
  "9E": "Endeavor Air",
  G7: "GoJet Airlines",
  MQ: "Envoy Air",
  OH: "PSA Airlines",
  OO: "SkyWest Airlines",
  YX: "Republic Airways",
  ZW: "Air Wisconsin",
};

const COMMON_AIRLINE_PRIORITY = ["UA", "AA", "DL", "G4"];

function normalizeFlightNumber(value: string | null | undefined) {
  return value?.replace(/\s+/g, "").toUpperCase() || null;
}

function getFlightPrefix(value: string | null | undefined) {
  const normalized = normalizeFlightNumber(value);
  const match = normalized?.match(/^([A-Z0-9]{2})/);
  return match?.[1] || null;
}

function getOperatingFlightNumber(flight: FlightAwareFlight) {
  return normalizeFlightNumber(
    firstNonEmpty(
      flight.ident_iata,
      flight.operator_iata && flight.flight_number
        ? `${flight.operator_iata}${flight.flight_number}`
        : null,
      flight.ident
    )
  );
}

function getPreferredCodeshare(flight: FlightAwareFlight) {
  const codeshares = (flight.codeshares_iata || [])
    .map(normalizeFlightNumber)
    .filter((value): value is string => Boolean(value));

  for (const airlineCode of COMMON_AIRLINE_PRIORITY) {
    const match = codeshares.find(
      (codeshare) => getFlightPrefix(codeshare) === airlineCode
    );

    if (match) return match;
  }

  return codeshares[0] || null;
}

function getRouteBasedMarketingCode(flight: FlightAwareFlight) {
  if (flight.operator_iata !== "OO") return null;

  const origin = (
    flight.origin?.code_iata ||
    flight.origin?.code ||
    ""
  ).toUpperCase();

  // Used only when FlightAware does not provide a marketing codeshare.
  if (["ORD", "DEN"].includes(origin)) return "UA";
  if (["ATL", "DTW", "MSP"].includes(origin)) return "DL";
  if (["CLT", "DFW", "PHX"].includes(origin)) return "AA";

  return null;
}

function getCommonFlightNumber(flight: FlightAwareFlight) {
  const preferredCodeshare = getPreferredCodeshare(flight);

  if (preferredCodeshare) return preferredCodeshare;

  const operatingFlightNumber = getOperatingFlightNumber(flight);
  const operatingPrefix = getFlightPrefix(operatingFlightNumber);

  if (operatingPrefix && COMMON_AIRLINES[operatingPrefix]) {
    return operatingFlightNumber;
  }

  const routeMarketingCode = getRouteBasedMarketingCode(flight);

  if (routeMarketingCode && flight.flight_number) {
    return `${routeMarketingCode}${flight.flight_number}`.toUpperCase();
  }

  return operatingFlightNumber || flight.registration || null;
}

function getCommonAirlineCode(flight: FlightAwareFlight) {
  return getFlightPrefix(getCommonFlightNumber(flight));
}

function getCommonAirlineName(flight: FlightAwareFlight) {
  const code = getCommonAirlineCode(flight);

  return code ? COMMON_AIRLINES[code] || code : null;
}

function getOperatingAirlineCode(flight: FlightAwareFlight) {
  return firstNonEmpty(
    flight.operator_iata,
    flight.operator_icao,
    flight.operator
  );
}

function getOperatingAirlineName(flight: FlightAwareFlight) {
  const code = flight.operator_iata || null;

  if (code && REGIONAL_OPERATORS[code]) {
    return REGIONAL_OPERATORS[code];
  }

  if (code && COMMON_AIRLINES[code]) {
    return COMMON_AIRLINES[code];
  }

  return firstNonEmpty(flight.operator, flight.operator_icao, code);
}

function getStatus(flight: FlightAwareFlight) {
  if (flight.cancelled) return "Cancelled";
  if (flight.diverted) return "Diverted";
  if (flight.actual_in || flight.actual_on) return "Arrived";
  if (flight.actual_out || flight.actual_off) return "En Route";
  return flight.status?.trim() || "Scheduled";
}

function dedupeFlights(flights: FlightAwareFlight[]) {
  const unique = new Map<string, FlightAwareFlight>();

  for (const flight of flights) {
    const arrivalTime = getArrivalTime(flight) || "";
    const origin =
      flight.origin?.code_icao ||
      flight.origin?.code_iata ||
      flight.origin?.code ||
      "";
    const flightNumber = getCommonFlightNumber(flight) || "";
    const key =
      flight.fa_flight_id ||
      `${flightNumber}|${origin}|${arrivalTime}`;

    const existing = unique.get(key);

    if (!existing) {
      unique.set(key, flight);
      continue;
    }

    // Prefer the record containing the most live/operational details.
    const existingScore = [
      existing.estimated_in,
      existing.actual_in,
      existing.gate_destination,
      existing.baggage_claim,
      existing.registration,
    ].filter(Boolean).length;

    const newScore = [
      flight.estimated_in,
      flight.actual_in,
      flight.gate_destination,
      flight.baggage_claim,
      flight.registration,
    ].filter(Boolean).length;

    if (newScore > existingScore) {
      unique.set(key, flight);
    }
  }

  return Array.from(unique.values());
}

export async function GET() {
  const apiKey = process.env.FLIGHTAWARE_API_KEY?.trim();

  if (!apiKey) {
    return Response.json(
      {
        error:
          "FLIGHTAWARE_API_KEY is not configured. Add it in Vercel Environment Variables and redeploy.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const fetchedAt = new Date();
  const windowStart = roundDownToFiveMinutes(fetchedAt);

  // Keep the end just inside FlightAware's maximum two-day future bound.
  const windowEnd = new Date(
    windowStart.getTime() + 48 * 60 * 60 * 1000 - 60 * 1000
  );

  const url = new URL(
    `${FLIGHTAWARE_BASE_URL}/airports/KMLI/flights/scheduled_arrivals`
  );

  url.searchParams.set("start", windowStart.toISOString());
  url.searchParams.set("end", windowEnd.toISOString());
  url.searchParams.set("max_pages", "5");

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "x-apikey": apiKey,
      },
      next: {
        revalidate: 300,
      },
    });

    const payload = (await response.json()) as FlightAwareResponse;

    if (!response.ok) {
      return Response.json(
        {
          error:
            payload.detail ||
            payload.reason ||
            payload.title ||
            `FlightAware returned HTTP ${response.status}.`,
        },
        {
          status: response.status,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const rawFlights = Array.isArray(payload.scheduled_arrivals)
      ? payload.scheduled_arrivals
      : [];

    const flights = dedupeFlights(rawFlights)
      .map((flight) => {
        const arrivalTime = getArrivalTime(flight);
        const scheduledArrival = getScheduledArrivalTime(flight);
        const estimatedArrival = getEstimatedArrivalTime(flight);

        const commonFlightNumber = getCommonFlightNumber(flight);
        const operatingFlightNumber = getOperatingFlightNumber(flight);

        return {
          id:
            flight.fa_flight_id ||
            `${commonFlightNumber || operatingFlightNumber || "unknown"}-${arrivalTime || "unknown"}`,
          faFlightId: flight.fa_flight_id || null,
          flightNumber: commonFlightNumber,
          commonFlightNumber,
          commonAirlineCode: getCommonAirlineCode(flight),
          commonAirlineName: getCommonAirlineName(flight),
          operatingFlightNumber,
          operatingAirlineCode: getOperatingAirlineCode(flight),
          operatingAirlineName: getOperatingAirlineName(flight),
          flightNumberIcao: flight.ident_icao || flight.ident || null,
          operatorCode: getOperatingAirlineCode(flight),
          flightType: flight.type || "Unknown",
          registration: flight.registration || null,
          aircraftType: flight.aircraft_type || null,
          origin: {
            code:
              flight.origin?.code_iata ||
              flight.origin?.code_icao ||
              flight.origin?.code ||
              null,
            codeIata: flight.origin?.code_iata || null,
            codeIcao: flight.origin?.code_icao || null,
            name: flight.origin?.name || null,
            city: flight.origin?.city || null,
          },
          destination: {
            code:
              flight.destination?.code_iata ||
              flight.destination?.code_icao ||
              flight.destination?.code ||
              "MLI",
            name: flight.destination?.name || "Quad Cities International",
          },
          scheduledArrival,
          estimatedArrival,
          arrivalTime,
          arrivalDelaySeconds: flight.arrival_delay ?? null,
          status: getStatus(flight),
          cancelled: Boolean(flight.cancelled),
          diverted: Boolean(flight.diverted),
          gate: flight.gate_destination || null,
          terminal: flight.terminal_destination || null,
          baggageClaim: flight.baggage_claim || null,
          codeshares: flight.codeshares_iata || [],
        };
      })
      .filter((flight) => {
        if (!flight.arrivalTime) return false;

        const arrival = new Date(flight.arrivalTime).getTime();

        return (
          Number.isFinite(arrival) &&
          arrival >= windowStart.getTime() &&
          arrival < windowEnd.getTime()
        );
      })
      .sort(
        (a, b) =>
          new Date(a.arrivalTime as string).getTime() -
          new Date(b.arrivalTime as string).getTime()
      );

    return Response.json(
      {
        airport: {
          codeIata: "MLI",
          codeIcao: "KMLI",
          name: "Quad Cities International Airport",
          timezone: "America/Chicago",
        },
        fetchedAt: fetchedAt.toISOString(),
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        flightCount: flights.length,
        flights,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("FlightAware MLI arrivals request failed:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load FlightAware arrivals.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
