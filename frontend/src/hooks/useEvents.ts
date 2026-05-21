import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from '../api/events';

export function useEvents(page = 0, size = 20, status?: string) {
  return useQuery({
    queryKey: ['events', page, size, status],
    queryFn: () => fetchEvents(page, size, status),
  });
}
