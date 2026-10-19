import { redirect } from "next/navigation";

export default async function OldAppealRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/panel/muracietler/${id}`);
}
