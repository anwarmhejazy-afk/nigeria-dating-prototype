import { BillingCallback } from "@/components/billing/billing-callback";

export const dynamic = "force-dynamic";

export default async function BillingCallbackPage({
  searchParams,
}: {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  const params = await searchParams;
  const reference =
    typeof params.reference === "string"
      ? params.reference
      : "";

  return <BillingCallback reference={reference} />;
}
