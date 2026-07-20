import { BillingCallback } from "@/components/billing/billing-callback";

export const dynamic = "force-dynamic";

export default async function BillingCallbackPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  return <BillingCallback transactionId={value("transaction_id")} txRef={value("tx_ref")} status={value("status")} />;
}
