import { useQuery } from "@tanstack/react-query";
import { userListQuery } from "../api/userQueries";
import { USERS_PER_PAGE } from "../constants/pagination";

export function useUsers({
  page,
  perPage = USERS_PER_PAGE,
  name,
}: {
  page: number;
  perPage?: number;
  name?: string;
}) {
  return useQuery(userListQuery({ page, perPage, name }));
}
