import { redirect } from "next/navigation";

// Köhnə (səhv yazılmış) ünvan: müraciətlər modulu /panel/muracietler-dədir.
export default function OldAppealsRoute() {
  redirect("/panel/muracietler");
}
