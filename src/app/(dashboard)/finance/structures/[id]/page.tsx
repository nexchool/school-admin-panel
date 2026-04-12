import { redirect } from "next/navigation";

export default function OldStructureDetailPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/finance/structures/${params.id}`);
}
