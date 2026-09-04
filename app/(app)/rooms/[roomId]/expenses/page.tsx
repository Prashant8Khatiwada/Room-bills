import { redirect } from 'next/navigation';

export default async function ExpensesRedirectPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  redirect(`/rooms/${roomId}/bills?category=expense`);
}
