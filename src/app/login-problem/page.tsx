import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export default async function LoginProblemPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const devModeAllowlist =
    error === "Configuration" || error === "AccessDenied";

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-1 flex-col px-6 sm:px-10">
      <header className="pt-6 sm:pt-8">
        <Wordmark />
      </header>

      <main className="flex flex-1 items-center py-16">
        <div className="reveal w-full max-w-xl">
          <h1 className="tb-display text-[length:var(--text-h1)] leading-[1.05]">
            {devModeAllowlist
              ? "Spotify didn’t let you in"
              : "Something went wrong connecting Spotify"}
          </h1>

          {devModeAllowlist ? (
            <div className="mt-5 space-y-4 text-[length:var(--text-base)] leading-relaxed text-fg-muted">
              <p>
                Taste Buds is still in development, so Spotify only allows
                accounts the owner has added to the app.
              </p>
              <p>
                Ask them to add the email on your Spotify account in the
                Spotify Developer Dashboard (
                <span className="text-fg">app &rarr; User Management</span>),
                then open the invite link again.
              </p>
            </div>
          ) : (
            <p className="mt-5 text-[length:var(--text-base)] leading-relaxed text-fg-muted">
              The Spotify sign-in didn&rsquo;t complete. Try again in a
              minute&mdash;if it keeps happening, let the owner know.
              {error ? (
                <span className="mt-2 block text-[0.8125rem] text-fg-faint">
                  Reference: {error}
                </span>
              ) : null}
            </p>
          )}

          <Link
            href="/"
            className="mt-8 inline-block text-[0.875rem] font-medium text-accent hover:underline"
          >
            &larr; Back to start
          </Link>
        </div>
      </main>
    </div>
  );
}
