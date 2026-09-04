import { RoomDashboardView } from '@/components/rooms/RoomDashboardView';

export default async function RoomDashboardPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <RoomDashboardView roomId={roomId} />;
}
