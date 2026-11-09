import { useQuery, useInfiniteQuery, useMutation } from "@tanstack/react-query";
import {
  getUserEvents1,
  getUserEvents2,
  getEventsData,
  registerToAnEvent,
  unregisterToAnEvent,
  getEventDetails,
  checkEventFatigue,
  updateEvent,
  cancelEvent,
} from "@/services/events.service";
import {
  useQueryClient,
  QueryObserver,
  queryOptions,
} from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { isObjEmpty } from "@/utils/util";
import { getAutoCompleteData } from "../services/location.service";

//export function getMeals(client) {
//  return client.from("meals").select().limit(50);
//}

export const userEvents1QueryKey = () => ["userevents1"];
export const userEvents2QueryKey = () => ["userevents2"];
export const eventsSearchQueryKey = () => ["eventssearch"];

const flattenEventPages = (data) =>
  data?.pages?.flatMap((page) => page?.data ?? []) ?? [];

/**
 * Keeps the dashboard buckets and the discovery cache in lockstep after an
 * attendance mutation. The search query is often inactive while the user is on
 * the dashboard, so `refetchType: "all"` is required for its cached pages to
 * update before the user navigates back.
 */
const invalidateAttendanceQueries = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: ["events", "registered"] });
  queryClient.invalidateQueries({ queryKey: ["events", "created"] });
  queryClient.invalidateQueries({ queryKey: userEvents1QueryKey() });
  queryClient.invalidateQueries({ queryKey: userEvents2QueryKey() });
  queryClient.invalidateQueries({
    queryKey: eventsSearchQueryKey(),
    refetchType: "all",
  });
  queryClient.invalidateQueries({ queryKey: ["events"] });
  queryClient.invalidateQueries({ queryKey: ["notifyevents"] });
};
export const notifyEventsQueryKey = (dataIn = {}) => [
  "notifyevents",
  dataIn?.lat ?? null,
  dataIn?.long ?? null,
  dataIn?.startdate ?? null,
  dataIn?.enddate ?? null,
  dataIn?.searchdistance ?? null,
];

export const getUpcomingEventsSearchParams = (profiledata) => {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  return {
    lat: profiledata?.latitude || 40.7128,
    long: profiledata?.longitude || -74.006,
    startdate: today.toISOString().split("T")[0],
    enddate: thirtyDaysFromNow.toISOString().split("T")[0],
    searchdistance: 80467,
  };
};

export const fetchUpcomingEvents = async (dataIn) => {
  if (isObjEmpty(dataIn?.lat) || isObjEmpty(dataIn?.long)) {
    return [];
  }

  const response = await getEventsData(dataIn);

  if (!response?.success || !Array.isArray(response?.data)) {
    return [];
  }

  return response.data
    .sort((a, b) => new Date(a.eventdate) - new Date(b.eventdate))
    .slice(0, 20);
};

export function useUserEvents1() {
  return useInfiniteQuery({
    queryKey: userEvents1QueryKey(),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await getUserEvents1(pageParam);

      return {
        data: response?.success ? response.data ?? [] : [],
        nextPage: response?.success ? response.nextPage : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage?.nextPage,
    initialPageParam: 0,
    //staleTime: 1 * (10 * 1000), // 2 mins
    //cacheTime: 15 * (60 * 1000), // 15 mins ,
    refetchInterval: 3 * (60 * 1000), // 3 min
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useUserEvents2() {

  return useInfiniteQuery({
    queryKey: userEvents2QueryKey(),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await getUserEvents2(pageParam);

      return {
        data: response?.success ? response.data ?? [] : [],
        nextPage: response?.success ? response.nextPage : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage?.nextPage,
    initialPageParam: 0,
    //staleTime: 2 * (60 * 1000), // 2 mins
    //cacheTime: 15 * (60 * 1000), // 15 mins,
    refetchInterval: 3 * (60 * 1000), // 3 min
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Updates an owned event and refreshes every dashboard/discovery cache.
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, data }) => updateEvent(eventId, data),
    onSuccess: (result, variables) => {
      if (!result?.success) return;

      queryClient.invalidateQueries({ queryKey: ["events", "created"] });
      queryClient.invalidateQueries({ queryKey: userEvents1QueryKey() });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: eventsSearchQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["notifyevents"] });
      queryClient.invalidateQueries({
        queryKey: ["eventdetails", variables.eventId],
      });
    },
  });
}

/**
 * Cancels an owned event and refreshes every dashboard/discovery cache.
 */
export function useCancelEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId) => cancelEvent(eventId),
    onSuccess: (result, eventId) => {
      if (!result?.success) return;

      queryClient.invalidateQueries({ queryKey: ["events", "created"] });
      queryClient.invalidateQueries({ queryKey: userEvents1QueryKey() });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: eventsSearchQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["notifyevents"] });
      queryClient.invalidateQueries({ queryKey: ["eventdetails", eventId] });
    },
  });
}

export function useNotifyEvents(dataIn) {
  return useQuery({
    queryKey: notifyEventsQueryKey(dataIn),
    queryFn: () => fetchUpcomingEvents(dataIn),
    enabled: !isObjEmpty(dataIn?.lat) && !isObjEmpty(dataIn?.long),
    //staleTime: 20 * (60 * 1000), // 20 mins
    //cacheTime: 15 * (60 * 1000), // 15 mins
    refetchInterval: 10 * (60 * 1000), // 10 min
    //refetchOnMount: false
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData ?? [],
  });
}

export function useAutoCompleteData(dataIn) {
  return useQuery({
    queryKey: ["autocompletedata"],
    queryFn: async () => {
      const response = await getAutoCompleteData(dataIn);
      return response.data || null;
    },
    staleTime: 4 * (60 * 1000), // 4 mins
    cacheTime: 15 * (60 * 1000), // 15 mins
  });
}

export function useEventsSearch(dataIn) {
  return useQuery({
    queryKey: eventsSearchQueryKey(),
    queryFn: async () => {
      const response = await getEventsData(dataIn);
      return response.data || null;
    },
  });
}

export const useRegisterToAnEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dataIn) => {
      return registerToAnEvent(dataIn);
    },
    onSuccess: (registerStatusData) => {
      const viewerHandle = String(
        registerStatusData?.data?.userhandle ?? "",
      )
        .trim()
        .toLowerCase();

      queryClient.setQueriesData(
        [["userEvents1"], ["userEvents2"], ["eventssearch"], ["notifyevents"]],
        (old) => {
          if (registerStatusData.success == false) {
            return old;
          }

          if (!viewerHandle) {
            return old;
          }

          if (Object.prototype.toString.call(old) == "[object Object]") {
            if (old.eventid == registerStatusData.data.eventid) {
              if (old?.attendeeslist) {
                let attendeeslistObj2;
                if (Array.isArray(old?.attendeeslist) == false) {
                  // if string (from postgres)
                  attendeeslistObj2 = old?.attendeeslist
                    ?.replace(/\{|\}/gm, "")
                    .split(",");
                } else {
                  attendeeslistObj2 = old?.attendeeslist;
                }
                return {
                  ...old,
                  attendeesdata: JSON.stringify(
                    registerStatusData.data.attendeesdata,
                  ),
                  attendeeslist: [
                    ...new Set([...attendeeslistObj2, viewerHandle]),
                  ],
                  //[...new Set(arr)] (to remove duplicates)
                };
              } else {
                return {
                  ...old,
                  attendeesdata: JSON.stringify(
                    registerStatusData.data.attendeesdata,
                  ),
                  attendeeslist: [viewerHandle],
                };
              }
            } else {
              return old;
            }
          } else if (Object.prototype.toString.call(old) == "[object Array]") {
            return old.map((eachevent) => {
              if (eachevent?.eventid == registerStatusData.data.eventid) {
                if (eachevent?.attendeeslist) {
                  let attendeeslistObj2;
                  if (Array.isArray(eachevent?.attendeeslist) == false) {
                    // if string (from postgres)
                    attendeeslistObj2 = eachevent?.attendeeslist
                      ?.replace(/\{|\}/gm, "")
                      .split(",");
                  } else {
                    attendeeslistObj2 = eachevent?.attendeeslist;
                  }
                  return {
                    ...eachevent,
                    attendeesdata: JSON.stringify(
                      registerStatusData.data.attendeesdata,
                    ),
                    attendeeslist: [
                      ...new Set([...attendeeslistObj2, viewerHandle]),
                    ],
                    //[...new Set(arr)] (to remove duplicates)
                  };
                } else {
                  return {
                    ...eachevent,
                    attendeesdata: JSON.stringify(
                      registerStatusData.data.attendeesdata,
                    ),
                    attendeeslist: [viewerHandle],
                  };
                }
              } else {
                return eachevent;
              }
            });
          }
        },
      );

      invalidateAttendanceQueries(queryClient);

      const eventId = registerStatusData?.data?.eventid;
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: ["eventdetails", eventId] });
      }
    },
    onError: (err, context) => {
      console.error("mutation err::", err);
      queryClient.invalidateQueries({ queryKey: userEvents1QueryKey() });
      //toast.error("Failed to upvote post");
      if (context?.prevData) {
        queryClient.setQueriesData(
          { queryKey: userEvents1QueryKey, type: "active" },
          context.prevData,
        );
        queryClient.invalidateQueries({
          queryKey: userEvents1QueryKey(),
        });
      }
    },
  });
};

export const useUnregisterToAnEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dataIn) => {
      return unregisterToAnEvent(dataIn);
    },
    onSuccess: (unregisterStatusData) => {
      const viewerHandle = String(
        unregisterStatusData?.data?.userhandle ?? "",
      )
        .trim()
        .toLowerCase();

      queryClient.setQueriesData(
        [["userEvents1"], ["userEvents2"], ["eventssearch"], ["notifyevents"]],
        (old) => {
          if (old) {
            if (unregisterStatusData.success == false) {
              return old;
            }

            if (!viewerHandle) {
              return old;
            }
            if (Object.prototype.toString.call(old) == "[object Object]") {
              if (old.eventid == unregisterStatusData.data.eventid) {
                let templist = structuredClone(old.attendeeslist ?? []);
                let removeindex = templist.indexOf(viewerHandle);
                if (removeindex > -1) {
                  templist?.splice(removeindex, 1);
                }
                return {
                  ...old,
                  attendeesdata: JSON.stringify(
                    unregisterStatusData.data.attendeesdata,
                  ),
                  attendeeslist: isObjEmpty(old.attendeeslist) ? [] : templist,
                };
              } else {
                return old;
              }
            } else if (
              Object.prototype.toString.call(old) == "[object Array]"
            ) {
              return old.map((eachevent) => {
                if (eachevent?.eventid == unregisterStatusData.data.eventid) {
                  let templist = structuredClone(
                    eachevent?.attendeeslist ?? [],
                  );
                  let removeindex = templist.indexOf(viewerHandle);
                  if (removeindex > -1) {
                    templist?.splice(removeindex, 1);
                  }
                  return {
                    ...eachevent,
                    attendeesdata: JSON.stringify(
                      unregisterStatusData.data.attendeesdata,
                    ),
                    attendeeslist: isObjEmpty(eachevent?.attendeeslist)
                      ? []
                      : templist,
                  };
                } else {
                  return eachevent;
                }
              });
            }
          }
        },
      );
      invalidateAttendanceQueries(queryClient);

      const eventId = unregisterStatusData?.data?.eventid;
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: ["eventdetails", eventId] });
      }
    },
    onError: (err, context) => {
      console.error("mutation err::", err);
      queryClient.invalidateQueries({ queryKey: userEvents1QueryKey() });
      //toast.error("Failed to upvote post");
      if (context?.prevData) {
        queryClient.setQueriesData(
          { queryKey: userEvents1QueryKey, type: "active" },
          context.prevData,
        );
        queryClient.invalidateQueries({
          queryKey: userEvents1QueryKey(),
        });
      }
    },
  });
};

//https://dev.to/franklin030601/managing-state-with-react-query-1842
export const useUserEvents1Observer = (dataIn) => {
  const get_user_events1 = useUserEvents1(dataIn);

  const queryClient = useQueryClient();

  const [userEvents1, setUserEvents1] = useState(() => {
    const data = queryClient.getQueryData(["userevents1"]);
    return flattenEventPages(data);
  });

  useEffect(() => {
    const observer = new QueryObserver(queryClient, {
      queryKey: ["userevents1"],
      refetchOnMount: false,
    });

    const unsubscribe = observer.subscribe((result) => {
      if (result.data) {
        setUserEvents1(flattenEventPages(result.data));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return {
    ...get_user_events1,
    data: userEvents1,
  };
};

export const useUserEvents2Observer = (dataIn) => {
  const get_user_events2 = useUserEvents2(dataIn);

  const queryClient = useQueryClient();

  const [userEvents2, setUserEvents2] = useState(() => {
    const data = queryClient.getQueryData(["userevents2"]);
    return flattenEventPages(data);
  });

  useEffect(() => {
    const observer = new QueryObserver(queryClient, {
      queryKey: ["userevents2"],
      refetchOnMount: false,
    });

    const unsubscribe = observer.subscribe((result) => {
      if (result.data) {
        setUserEvents2(flattenEventPages(result.data));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return {
    ...get_user_events2,
    data: userEvents2,
  };
};

export const useNotifyEventsObserver = (dataIn) => {
  const get_notify_events2 = useNotifyEvents(dataIn);
  const queryKey = notifyEventsQueryKey(dataIn);

  const queryClient = useQueryClient();

  const [notifyEvents, setNotifyEvents] = useState(() => {
    const data = queryClient.getQueryData(queryKey);
    return data ?? [];
  });

  useEffect(() => {
    const observer = new QueryObserver(queryClient, {
      queryKey,
      //refetchOnMount: false
    });

    const unsubscribe = observer.subscribe((result) => {
      if (result.data) {
        setNotifyEvents(result.data);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, queryKey]);

  return {
    ...get_notify_events2,
    data: notifyEvents,
  };
};

export const eventDetailsQueryOptions = (eventid) => {
  return queryOptions({
    queryKey: ["eventdetails", eventid],
    queryFn: async () => {
      const response = await getEventDetails(eventid);
      return response.data || null;
    },
    staleTime: Infinity,
    retry: false,
    throwOnError: true,
  });
};

export const eventFatigueQueryKey = (eventId) => ["eventfatigue", eventId];

export const eventFatigueQueryOptions = (eventId, enabled = true) =>
  queryOptions({
    queryKey: eventFatigueQueryKey(eventId),
    queryFn: async () => {
      const response = await checkEventFatigue(eventId);
      return Boolean(response?.isFatigued);
    },
    enabled: Boolean(eventId) && enabled,
    staleTime: 0,
    retry: false,
  });

export function useEventFatigue(eventId, { enabled = true } = {}) {
  return useQuery(eventFatigueQueryOptions(eventId, enabled));
}

/*export function useEventsSearch(dataIn) {
    return useInfiniteQuery({
        queryKey: eventsSearchQueryKey(), 
        queryFn: async () => {
            const response = await getEventsData(dataIn);
            return response.data || null;
        },
        getNextPageParam: (lastPage) =>
            lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    });
}*/

//https://dev.to/otamnitram/react-query-a-practical-example-167j

/*const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery('movies', getPopularMovies, {
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
  });*/

// Reference: implementing infinite scroll with React Query pagination.
//https://dev.to/otamnitram/react-query-a-practical-example-167j
//https://tkdodo.eu/blog/mastering-mutations-in-react-query
