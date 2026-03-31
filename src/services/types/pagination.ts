/**
 * Backend pagination result (MC API)
 */
export interface PaginationResult<T> {
  items: T[]
  page: number
  size: number
  total: number
  total_pages: number
  links?: Record<string, string>
}
