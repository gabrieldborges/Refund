import type { RefundCategory } from "../constants/categories";

export interface Refund {
  id: number;
  user_id: number;
  name: string;
  category: RefundCategory;
  amount_in_cents: number;
  filename: string;
  created_at: string | null;
}

export interface RefundsListResponse {
  type: "Refund";
  count: number;
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  attributes: Refund[];
}
