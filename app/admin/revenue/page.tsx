import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const REVENUE_OWNER_EMAIL = "anwar_hejazy@hotmail.com";
const OWNER_SHARE = 0.5;

type Transaction = {
  id: string;
  user_id: string;
  plan_slug: string;
  amount_minor: number;
  currency: string;
  status: string;
  provider_transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
};

type Member = {
  id: string;
  display_name: string | null;
  email: string | null;
};

function formatMoney(amountMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountMinor / 100);
  } catch {
    return `${currency.toUpperCase()} ${(amountMinor / 100).toFixed(2)}`;
  }
}

function formatPlan(plan: string) {
  return plan
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function RevenuePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.email?.trim().toLowerCase() !== REVENUE_OWNER_EMAIL) {
    notFound();
  }

  const { data: transactionsData, error: transactionsError } =
    await supabase
      .from("payment_transactions")
      .select(
        "id,user_id,plan_slug,amount_minor,currency,status,provider_transaction_id,paid_at,created_at",
      )
      .eq("status", "successful")
      .order("paid_at", { ascending: false })
      .limit(1000);

  if (transactionsError) {
    throw new Error(
      `Unable to load payments: ${transactionsError.message}`,
    );
  }

  const transactions = (transactionsData || []) as Transaction[];

  const userIds = [...new Set(transactions.map((item) => item.user_id))];

  let members: Member[] = [];

  if (userIds.length) {
    const { data: membersData, error: membersError } =
      await supabase
        .from("profiles")
        .select("id,display_name,email")
        .in("id", userIds);

    if (membersError) {
      throw new Error(
        `Unable to load members: ${membersError.message}`,
      );
    }

    members = (membersData || []) as Member[];
  }

  const memberMap = new Map(
    members.map((member) => [member.id, member]),
  );

  const totalsByCurrency = transactions.reduce<Record<string, number>>(
    (totals, transaction) => {
      const currency = transaction.currency.toUpperCase();

      totals[currency] =
        (totals[currency] || 0) + transaction.amount_minor;

      return totals;
    },
    {},
  );

  return (
    <main className="min-h-screen bg-[#050609] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 border-b border-white/[0.07] pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#F2C94C]">
                Private owner dashboard
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Revenue / Payments
              </h1>

              <p className="mt-2 text-sm text-white/45">
                Successful AfroLove payments and your 50% share.
              </p>
            </div>

            <a
              href="/admin"
              className="inline-flex items-center justify-center rounded-2xl border border-[#F2C94C]/30 bg-[#F2C94C]/[0.06] px-5 py-3 text-sm font-black text-[#FFE58C]"
            >
              Back to admin dashboard
            </a>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
              Successful payments
            </p>

            <p className="mt-3 text-3xl font-black text-[#FFE58C]">
              {transactions.length.toLocaleString()}
            </p>
          </div>

          {Object.entries(totalsByCurrency).map(([currency, total]) => (
            <div
              key={currency}
              className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6"
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                Total revenue ({currency})
              </p>

              <p className="mt-3 text-3xl font-black">
                {formatMoney(total, currency)}
              </p>

              <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-[#F2C94C]">
                My 50% share
              </p>

              <p className="mt-1 text-xl font-black text-[#FFE58C]">
                {formatMoney(Math.round(total * OWNER_SHARE), currency)}
              </p>
            </div>
          ))}

          {!Object.keys(totalsByCurrency).length && (
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 sm:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                Revenue
              </p>

              <p className="mt-3 text-3xl font-black text-[#FFE58C]">
                £0.00
              </p>

              <p className="mt-2 text-sm text-white/35">
                No successful customer payments yet.
              </p>
            </div>
          )}
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02]">
          <div className="border-b border-white/[0.07] px-5 py-5 sm:px-6">
            <h2 className="text-xl font-black">Payment history</h2>

            <p className="mt-1 text-sm text-white/40">
              Your share is automatically calculated as 50% of each successful payment.
            </p>
          </div>

          {transactions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-white/[0.07] bg-white/[0.025] text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                  <tr>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Plan</th>
                    <th className="px-5 py-4">Paid</th>
                    <th className="px-5 py-4">My 50%</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Transaction</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((transaction) => {
                    const member = memberMap.get(transaction.user_id);
                    const date =
                      transaction.paid_at || transaction.created_at;

                    return (
                      <tr
                        key={transaction.id}
                        className="border-b border-white/[0.055] last:border-0"
                      >
                        <td className="px-5 py-4">
                          <p className="font-black">
                            {member?.display_name || "Unknown member"}
                          </p>

                          <p className="mt-1 text-xs text-white/35">
                            {member?.email || "Email unavailable"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-bold">
                          {formatPlan(transaction.plan_slug)}
                        </td>

                        <td className="px-5 py-4 font-black">
                          {formatMoney(
                            transaction.amount_minor,
                            transaction.currency,
                          )}
                        </td>

                        <td className="px-5 py-4 font-black text-[#FFE58C]">
                          {formatMoney(
                            Math.round(
                              transaction.amount_minor * OWNER_SHARE,
                            ),
                            transaction.currency,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-white/55">
                          {new Date(date).toLocaleString("en-GB")}
                        </td>

                        <td className="max-w-[240px] px-5 py-4 text-xs text-white/35">
                          <span className="break-all">
                            {transaction.provider_transaction_id || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <p className="font-black text-white/55">
                No successful payments yet.
              </p>

              <p className="mt-2 text-sm text-white/30">
                Real customer payments will automatically appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
