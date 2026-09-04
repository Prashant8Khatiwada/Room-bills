import { redirect } from 'next/navigation';

export default async function RoomIndexPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  redirect(`/rooms/${roomId}/dashboard`);
}
