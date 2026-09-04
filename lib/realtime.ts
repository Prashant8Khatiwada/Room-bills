import { createClient } from './supabase/client';
import { QueryClient } from '@tanstack/react-query';

export function subscribeToRoom(roomId: string, queryClient: QueryClient) {
  let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

  function debounceInvalidate() {
    if (invalidateTimer) clearTimeout(invalidateTimer);
    invalidateTimer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['expenses', roomId] });
      queryClient.invalidateQueries({ queryKey: ['bills', roomId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
    }, 150); // 150ms debounce
  }

  const supabase = createClient();

  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'expenses', filter: `room_id=eq.${roomId}` },
      debounceInvalidate
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bills', filter: `room_id=eq.${roomId}` },
      debounceInvalidate
    )
    .subscribe();

  return () => {
    if (invalidateTimer) clearTimeout(invalidateTimer);
    supabase.removeChannel(channel);
  };
}
