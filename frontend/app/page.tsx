import { redirect } from "next/navigation";

/**
 * Root route — redirect to the v2 landing.
 *
 * Once v2 is the only landing we'll move the v2 content here and delete
 * /v2. For now this keeps both URLs working but guarantees that anyone
 * landing on the raw origin sees the new design.
 */
export default function RootRedirect() {
  redirect("/v2");
}
