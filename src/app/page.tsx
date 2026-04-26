import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-canvas">
      {/* Top nav */}
      <header className="border-b border-accent-100 bg-white/70 backdrop-blur">
        <div className="container max-w-6xl flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white text-sm font-bold">
              c
            </span>
            <span className="font-semibold tracking-tight text-ink">Cofoundr</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-ink hover:bg-accent-50"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container max-w-6xl py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="inline-block rounded-full border border-accent-100 bg-white px-3 py-1 text-xs uppercase tracking-wider text-accent">
            Private beta · Canada &amp; United States
          </p>
          <h1 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight text-ink leading-[1.05]">
            Your AI co-founder. <br />
            <span className="text-accent">From idea to operating company.</span>
          </h1>
          <p className="mt-5 text-lg text-ink-muted max-w-xl">
            Cofoundr walks you through every step of starting and running a business —
            choosing a structure, registering, branding, building a site, drafting your
            contracts, and bringing in your first lead. One platform. One conversation.
          </p>

          <ul className="mt-6 space-y-2 text-sm text-ink">
            <li>· Guided launch wizard for Ontario and Delaware (more soon)</li>
            <li>· Lawyer-reviewed legal documents you can actually use</li>
            <li>· A live CRM, a real website, and an AI co-founder in one place</li>
            <li>· &ldquo;Done-For-You&rdquo; mode if you&rsquo;d rather not click anything</li>
          </ul>
        </div>

        <div className="md:pl-8">
          <div className="rounded-2xl border border-accent-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Get on the list</h2>
            <p className="mt-1 text-sm text-ink-muted">
              We&rsquo;re onboarding 10 design partners first. Tell us where you are.
            </p>
            <div className="mt-5">
              <WaitlistForm />
            </div>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="border-t border-accent-100 bg-white">
        <div className="container max-w-6xl py-16">
          <h2 className="text-2xl font-semibold text-ink">
            What launches with you
          </h2>
          <p className="mt-2 text-ink-muted max-w-2xl">
            One conversation walks your business from a half-formed idea to an entity
            with a name, a brand, a website, and a customer pipeline.
          </p>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: "Idea &amp; jurisdiction",
                body:
                  "Six questions in, you have a validated direction, a recommended structure (sole prop / LLC / corp), and the cost of getting registered.",
              },
              {
                title: "Name, domain &amp; brand",
                body:
                  "Generated names with live domain and handle checks, plus a one-click brand kit — logo, palette, voice, slogan.",
              },
              {
                title: "Legal documents",
                body:
                  "Ten lawyer-reviewed templates: NDA, contractor, terms, privacy, founder agreements. Disclaimer always on.",
              },
              {
                title: "Website in a weekend",
                body:
                  "A real, hostable single-page site with a payment button. Edit it by talking to Cofoundr.",
              },
              {
                title: "Light CRM &amp; vault",
                body:
                  "Capture your first leads, store every document, automate the &ldquo;thank you&rdquo; email.",
              },
              {
                title: "Done-For-You",
                body:
                  "Want it done instead of done-by-you? We&rsquo;ll launch the whole thing for you in 7–10 days.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-accent-100 bg-canvas p-5"
              >
                <h3
                  className="text-base font-semibold text-ink"
                  dangerouslySetInnerHTML={{ __html: card.title }}
                />
                <p
                  className="mt-2 text-sm text-ink-muted"
                  dangerouslySetInnerHTML={{ __html: card.body }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-accent-100">
        <div className="container max-w-6xl py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm text-ink-muted">
          <p>&copy; {new Date().getFullYear()} Cofoundr. All rights reserved.</p>
          <p>
            AI guidance only. Cofoundr is not a law firm, accounting firm, or financial
            advisor.
          </p>
        </div>
      </footer>
    </main>
  );
}
