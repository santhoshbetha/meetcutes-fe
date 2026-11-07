import { api } from "@/lib/api";
import { mapProfileToLegacy } from "@/services/auth.service";
import { toLegacyEvent } from "@/services/events.service";

/**
 * Searches users through the Elixir API.
 *
 * The backend expects `distance_miles`, while the UI stores the selected radius
 * in meters, so convert before sending.
 */
export const searchUsers = async (
  searchinput,
  pageParam = 0,
  limit = 20,
  signal,
) => {
  try {
    const distanceMeters = Number(searchinput?.searchdistance);
    const distanceMiles =
      Number.isFinite(distanceMeters) && distanceMeters > 0
        ? distanceMeters / 1609.34
        : undefined;

    const payload = await api.post(
      "/api/search/users",
      {
        query: searchinput?.query ?? "",
        gender: searchinput?.gender || undefined,
        age_from: searchinput?.agefrom,
        age_to: searchinput?.ageto,
        latitude: searchinput?.latitude,
        longitude: searchinput?.longitude,
        distance_miles: distanceMiles,
        limit,
        offset: pageParam * limit,
      },
      { signal },
    );

    const users = payload?.data?.users ?? [];
    const pagination = payload?.data?.pagination ?? {};
    const mapped = users.map(mapProfileToLegacy);

    return {
      success: true,
      data: mapped,
      nextPage: pagination.has_more ? pageParam + 1 : undefined,
    };
  } catch (error) {
    return {
      success: false,
      msg: error?.message || "An error occurred",
    };
  }
};

/**
 * Looks up a single user by email, phone number, or handle.
 */
export const searchUser = async (searchtext) => {
  const identifier = String(searchtext ?? "").trim();

  if (!identifier) {
    return { success: false, msg: "Enter an email, phone number, or handle" };
  }

  try {
    const payload = await api.get(
      `/api/search/user/${encodeURIComponent(identifier)}`,
    );

    const profile =
      payload?.data?.user ??
      payload?.data?.user_data ??
      payload?.data ??
      payload;

    if (!profile) {
      return {
        success: false,
        msg: "User not found or not visible in search",
      };
    }

    return {
      success: true,
      data: mapProfileToLegacy(profile),
    };
  } catch (error) {
    return {
      success: false,
      msg:
        error?.status === 404
          ? "User not found or not visible in search"
          : error?.message || "An error occurred",
    };
  }
};

const EVENTS_PAGE_SIZE = 20;

export const searchEvents = async (searchinput, pageParam = 0) => {
  try {
    const params = new URLSearchParams();
    const pageSize = EVENTS_PAGE_SIZE;

    const lat = searchinput?.lat;
    const lng = searchinput?.long ?? searchinput?.lng;

    if (lat !== undefined && lat !== null && lat !== "") {
      params.set("lat", String(lat));
    }

    if (lng !== undefined && lng !== null && lng !== "") {
      params.set("lng", String(lng));
    }

    const distance = Number(searchinput?.searchdistance);
    params.set(
      "distance",
      String(
        Number.isFinite(distance) && distance > 0 ? distance : 241401,
      ),
    );

    if (searchinput?.startdate) {
      params.set("start_date", searchinput.startdate);
    }

    if (searchinput?.enddate) {
      params.set("end_date", searchinput.enddate);
    }

    params.set("limit", String(pageSize));
    params.set("offset", String(pageParam * pageSize));

    const payload = await api.get(`/api/v1/events?${params.toString()}`);
    const events = (payload?.data?.events ?? []).map(toLegacyEvent);
    const pagination = payload?.data?.pagination ?? {};
    const hasMore =
      typeof payload?.data?.has_more === "boolean"
        ? payload.data.has_more
        : typeof pagination.has_more === "boolean"
          ? pagination.has_more
          : events.length === pageSize;
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
    return {
      success: false,
      msg: error?.code || error?.message || "An error occurred",
    };
  }
};
