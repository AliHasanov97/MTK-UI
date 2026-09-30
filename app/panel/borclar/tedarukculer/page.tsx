import { redirect } from "next/navigation";

// Tədarükçü borcları indi «Tədarükçülər» səhifəsinin «Borclar» seqmentindədir.
export default function TedarukcuBorclarPage() {
  redirect("/panel/tedarukculer");
}
