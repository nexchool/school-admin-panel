import { redirect } from "next/navigation";

export default function OldStudentFeeDetailPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/finance/student-fees/${params.id}`);
}
