import { api } from "@/lib/api";

const DEFAULT_DISTANCE_METRES = 241401; // 150 miles
const DASHBOARD_EVENTS_PAGE_SIZE = 20;

/**
 * Converts a canonical event payload into the legacy object the existing
 * components consume.
 *
 * The UI still reads `eventid`, `eventdate`, `starttime`, `endtime`,
 * `attendeeslist`, `attendeesdata` and `locationdata`, so the mapping lives in
 * one place and every service call returns the same shape.
 */
export const toLegacyEvent = (event) => {
  if (!event) return null;

  const location = event.location || {};
  const attendees = Array.isArray(event.attendees) ? event.attendees : [];

  const attendeesdata = attendees
    .map((attendee) => ({
      attendeeid: attendee?.id ?? attendee?.user_id ?? attendee?.userid ?? "",
      attendeehandle: attendee?.handle ?? attendee?.attendeehandle ?? "",
      attendeegender: attendee?.gender ?? attendee?.attendeegender ?? "",
    }))
    .filter((attendee) => attendee.attendeehandle);

  const attendeeslist = attendeesdata.map(
    (attendee) => attendee.attendeehandle,
  );
  const registered_attendees = attendeesdata
    .map((attendee) => attendee.attendeeid)
    .filter(Boolean);

  const males = attendeesdata.filter((attendee) =>
    String(attendee.attendeegender || "")
      .toLowerCase()
      .startsWith("m"),
  ).length;
  const females = attendeesdata.filter((attendee) =>
    String(attendee.attendeegender || "")
      .toLowerCase()
      .startsWith("f"),
  ).length;

  const starttime = timeFromIso(event.start_at);
  const endtime = timeFromIso(event.end_at);
  const serverMaleCount = Number(event.male_count);
  const serverFemaleCount = Number(event.female_count);

  return {
    ...event,
    eventid: event.id,
    creatorid: event.created_by,
    eventdate: event.event_date,
    starttime,
    endtime,
    description: event.content ?? "",
    latitude: location.latitude,
    longitude: location.longitude,
    locationid: location.id,
    locationdata: {
      locationid: location.id,
      locationname: location.name ?? "",
      address1: location.street ?? "",
      state: location.state ?? "",
      city: location.locality ?? location.city ?? "",
      zipcode: location.postal_code ?? "",
      latitude: location.latitude,
      longitude: location.longitude,
    },
    attendeeslist,
    attendeesdata,
    registered_attendees,
    males: Number.isFinite(serverMaleCount) ? serverMaleCount : males,
    females: Number.isFinite(serverFemaleCount) ? serverFemaleCount : females,
  };
};

function timeFromIso(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/T(\d{2}:\d{2}(?::\d{2})?)/);
  return match ? `${match[1]}:00`.slice(0, 8) : null;
}

function searchParams(dataIn = {}) {
  const params = new URLSearchParams();

  const lat = dataIn?.lat;
  const lng = dataIn?.long ?? dataIn?.lng;

  if (lat !== undefined && lat !== null && lat !== "") {
    params.set("lat", String(lat));
  }

  if (lng !== undefined && lng !== null && lng !== "") {
    params.set("lng", String(lng));
  }

  const distance = Number(dataIn?.searchdistance);
  params.set(
    "distance",
    String(Number.isFinite(distance) && distance > 0 ? distance : DEFAULT_DISTANCE_METRES),
  );

  if (dataIn?.startdate) {
    params.set("start_date", dataIn.startdate);
  }

  if (dataIn?.enddate) {
    params.set("end_date", dataIn.enddate);
  }

  return params;
}

function toApiError(error) {
  return {
    success: false,
    msg:
      error?.payload?.msg ||
      error?.payload?.message ||
      error?.message ||
      error?.code ||
      "An error occurred",
    errors: error?.errors ?? error?.payload?.errors ?? null,
    code: error?.code ?? null,
  };
}

/**
 * Loads events near a point, optionally bounded by an event-date window.
 */
export const getEventsData = async (dataIn = {}) => {
  try {
    const params = searchParams(dataIn);
    params.set("limit", "100");

    const payload = await api.get(`/api/v1/events?${params.toString()}`);
    const events = (payload?.data?.events ?? []).map(toLegacyEvent);

    return {
      success: true,
      data: events,
    };
  } catch (error) {
    return toApiError(error);
  }
};

/**
 * Loads one page of events created by the signed-in user.
 */
export const getUserEvents1 = async (pageParam = 0) =>
  fetchDashboardEventPage("/api/v1/events/created", pageParam);

/**
 * Loads one page of events the signed-in user is attending.
 */
export const getUserEvents2 = async (pageParam = 0) =>
  fetchDashboardEventPage("/api/v1/events/joined", pageParam);

async function fetchDashboardEventPage(path, pageParam = 0) {
  try {
    const params = new URLSearchParams();
    params.set("limit", String(DASHBOARD_EVENTS_PAGE_SIZE));
    params.set("offset", String(pageParam * DASHBOARD_EVENTS_PAGE_SIZE));

    const payload = await api.get(`${path}?${params.toString()}`);
    const events = (payload?.data?.events ?? []).map(toLegacyEvent);
    const pagination = payload?.data?.pagination ?? {};
    const hasMore =
      typeof payload?.data?.has_more === "boolean"
        ? payload.data.has_more
        : typeof pagination.has_more === "boolean"
          ? pagination.has_more
          : events.length === DASHBOARD_EVENTS_PAGE_SIZE;
    const backendNextPage = Number(
      payload?.data?.next_page ?? pagination.next_page,
    );
    const nextPage = hasMore
      ? Number.isFinite(backendNextPage) && backendNextPage > 0
        ? backendNextPage - 1
        : pageParam + 1
      : undefined;

    return {
      success: true,
      data: events,
      nextPage,
    };
  } catch (error) {
    return toApiError(error);
  }
}

export const getEventDetails = async (eventid) => {
  try {
    const payload = await api.get(`/api/v1/events/${encodeURIComponent(eventid)}`);

    return {
      success: true,
      data: toLegacyEvent(payload?.data?.event),
    };
  } catch (error) {
    return toApiError(error);
  }
};

/**
 * Stateless server-side overlap-fatigue check for the signed-in user.
 */
export const checkEventFatigue = async (eventId) => {
  try {
    const payload = await api.get(
      `/api/v1/events/${encodeURIComponent(eventId)}/check-fatigue`,
    );

    return {
      success: true,
      isFatigued: Boolean(payload?.is_fatigued),
    };
  } catch (error) {
    return {
      ...toApiError(error),
      isFatigued: false,
    };
  }
};

/**
 * Creates an event through the bearer-authenticated API.
 *
 * The creator is always the signed-in user, so `userid`/`creatorid` in
 * `dataIn` are ignored by the backend.
 */
export const createEvent = async (dataIn = {}) => {
  try {
    const payload = await api.post("/api/v1/events", eventPayload(dataIn));

    return {
      success: true,
      data: toLegacyEvent(payload?.data?.event),
    };
  } catch (error) {
    return toApiError(error);
  }
};

/**
 * Updates an owned event. The backend enforces creator ownership and notifies
 * every registered attendee atomically.
 */
export const updateEvent = async (eventId, dataIn = {}) => {
  try {
    const payload = await api.patch(
      `/api/v1/events/${encodeURIComponent(eventId)}`,
      eventPayload(dataIn),
    );

    return {
      success: true,
      data: toLegacyEvent(payload?.data?.event),
    };
  } catch (error) {
    return toApiError(error);
  }
};

/**
 * Cancels an owned event and notifies every registered attendee.
 */
export const cancelEvent = async (eventId) => {
  try {
    const payload = await api.delete(
      `/api/v1/events/${encodeURIComponent(eventId)}`,
    );

    return {
      success: true,
      data: toLegacyEvent(payload?.data?.event),
    };
  } catch (error) {
    return toApiError(error);
  }
};

function eventPayload(dataIn = {}) {
  return {
    title: dataIn?.title,
    location: dataIn?.location,
    locationid: dataIn?.locationid,
    address1: dataIn?.address1,
    city: dataIn?.city,
    state: dataIn?.state,
    zipcode: dataIn?.zipcode ?? dataIn?.zip,
    eventlat: dataIn?.eventlat,
    eventlng: dataIn?.eventlng,
    eventdate: dataIn?.eventdate,
    start_time: dataIn?.start_time ?? dataIn?.startTime,
    end_time: dataIn?.end_time ?? dataIn?.endTime,
    description: dataIn?.description,
    has_age_restriction: dataIn?.has_age_restriction ?? false,
    men_min_age: dataIn?.men_min_age ?? null,
    men_max_age: dataIn?.men_max_age ?? null,
    women_min_age: dataIn?.women_min_age ?? null,
    women_max_age: dataIn?.women_max_age ?? null,
  };
}

/**
 * Joins an event as the signed-in user.
 *
 * The returned `eventid`/`userhandle`/`attendeesdata` keys keep the TanStack
 * cache updaters in `useEvents` working unchanged.
 */
export const registerToAnEvent = async (dataIn = {}) => {
  try {
    const payload = await api.post(
      `/api/v1/events/${encodeURIComponent(dataIn?.eventId)}/join`,
    );

    const event = payload?.data?.event;
    const attendee = payload?.data?.attendee;

    return {
      success: true,
      data: {
        eventid: String(dataIn?.eventId),
        userhandle: attendee?.handle ?? dataIn?.userhandle,
        attendeesdata: toAttendeesData(event),
        event: toLegacyEvent(event),
      },
    };
  } catch (error) {
    return toApiError(error);
  }
};

/**
 * Leaves an event as the signed-in user.
 */
export const unregisterToAnEvent = async (dataIn = {}) => {
  try {
    const payload = await api.delete(
      `/api/v1/events/${encodeURIComponent(dataIn?.eventId)}/join`,
    );

    const event = payload?.data?.event;

    return {
      success: true,
      data: {
        eventid: String(dataIn?.eventId),
        userhandle: dataIn?.userhandle,
        attendeesdata: toAttendeesData(event),
        event: toLegacyEvent(event),
      },
    };
  } catch (error) {
    return toApiError(error);
  }
};

function toAttendeesData(event) {
  const attendees = Array.isArray(event?.attendees) ? event.attendees : [];

  return attendees
    .map((attendee) => ({
      attendeehandle: attendee?.handle ?? "",
      attendeegender: attendee?.gender ?? "",
    }))
    .filter((attendee) => attendee.attendeehandle);
}
