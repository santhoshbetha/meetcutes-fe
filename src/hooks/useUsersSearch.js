import { useInfiniteQuery } from "@tanstack/react-query";
import { searchUsers } from "@/services/search.service";

export const USERS_SEARCH_PAGE_SIZE = 20;

/**
 * Prefix shared by every people-search cache entry. Invalidate or update this
 * root to reach all filter combinations at once.
 */
export const USERS_SEARCH_QUERY_ROOT = ["search", "users"];

/**
 * Canonical query key for people search. Every view that needs the same
 * filters shares this cache entry, so duplicate network requests collapse.
 */
export const usersSearchQueryKey = (filters = null) => [
  ...USERS_SEARCH_QUERY_ROOT,
  filters ?? null,
];

export function selectUsersSearchData(data) {
  return data?.pages?.flatMap((page) => page?.data ?? []) ?? [];
}

export function useUsersSearch(filters, { enabled = true } = {}) {
  return useInfiniteQuery({
    queryKey: usersSearchQueryKey(filters),
    queryFn: ({ pageParam = 0, signal }) =>
      searchUsers(filters, pageParam, USERS_SEARCH_PAGE_SIZE, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage?.success && lastPage?.nextPage !== undefined
        ? lastPage.nextPage
        : undefined,
    enabled: Boolean(filters) && enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export default useUsersSearch;
