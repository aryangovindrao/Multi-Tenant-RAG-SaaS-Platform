"use client";

/**
 * Marketing landing page for Cortex.
 *
 * Design language is modelled on the "Granger / sportainment" reference:
 * an oversized layered wordmark, a bold hero with a flowing video, vivid
 * accent color, pill tags, an accordion, and card-based sections on a light
 * canvas below the dark hero. Content is adapted to Cortex (multi-tenant AI
 * RAG). The page is intentionally theme-independent (its own visual world) and
 * links into the app (/register, /login, /dashboard).
 */

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Check,
  FileText,
  Minus,
  MessageSquare,
  Plus,
  Quote,
  ShieldCheck,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── shared motion ────────────────────────────────────────────────────────────
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as const },
};

function Pill({
  children,
  tone = "light",
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap",
        tone === "light"
          ? "border-zinc-200 bg-white text-zinc-700"
          : "border-white/15 bg-white/10 text-white backdrop-blur",
      )}
    >
      {children}
    </span>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ authed }: { authed: boolean }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2 text-white">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white text-zinc-950">
            <Sparkles className="size-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Cortex</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <a href="#features" className="transition-colors hover:text-white">
            Features
          </a>
          <a href="#how" className="transition-colors hover:text-white">
            How it works
          </a>
          <a href="#showcase" className="transition-colors hover:text-white">
            Product
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {authed ? (
            <Button
              asChild
              className="rounded-full bg-white text-zinc-950 hover:bg-white/90"
            >
              <Link href="/dashboard">
                Open dashboard <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="hidden text-white hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                className="rounded-full bg-white text-zinc-950 hover:bg-white/90"
              >
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Hero (flowing video) ─────────────────────────────────────────────────────
function Hero({ authed }: { authed: boolean }) {
  return (
    <section className="relative min-h-svh overflow-hidden bg-[#06070a]">
      {/* flowing background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="/cortex-hero-poster.jpg"
        className="absolute inset-0 size-full object-cover opacity-60"
      >
        <source src="/cortex-hero.mp4" type="video/mp4" />
      </video>
      {/* overlays to keep text legible + brand the wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#06070a]/70 via-[#06070a]/40 to-[#06070a]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#06070a] via-transparent to-transparent" />

      <div className="relative mx-auto flex min-h-svh max-w-7xl flex-col justify-center px-5 pt-28 pb-40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
            <span className="size-1.5 rounded-full bg-amber-400" />
            Multi-tenant AI RAG platform
          </span>

          <h1 className="mt-6 text-5xl leading-[0.95] font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            A new species
            <br />
            of knowledge.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-white/70">
            Upload your documents and ask anything. Cortex answers in plain
            language — grounded in your files, with citations you can verify.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white text-zinc-950 hover:bg-white/90"
            >
              <Link href={authed ? "/dashboard" : "/register"}>
                {authed ? "Open dashboard" : "Start free"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <a href="#showcase">See it in action</a>
            </Button>
          </div>
        </motion.div>

        {/* floating answer card — echoes the reference's stat cards, tied to RAG */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="absolute right-5 bottom-44 hidden w-80 rounded-2xl border border-white/10 bg-white/95 p-4 shadow-2xl backdrop-blur lg:block"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <span className="flex size-6 items-center justify-center rounded-full bg-zinc-900 text-white">
              <Sparkles className="size-3" />
            </span>
            Cortex
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-800">
            The Q3 report attributes the 24% lift to the new onboarding flow
            <span className="text-blue-600"> [1]</span>.
          </p>
          <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs">
            <span className="flex size-4 items-center justify-center rounded-full bg-blue-600/10 text-[10px] text-blue-600">
              1
            </span>
            <FileText className="size-3 text-zinc-400" />
            <span className="truncate text-zinc-600">Q3-report.pdf</span>
            <span className="ml-auto text-zinc-400">p.12</span>
          </div>
        </motion.div>
      </div>

      {/* oversized layered wordmark */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 select-none overflow-hidden">
        <span className="block translate-y-[18%] text-center text-[24vw] leading-none font-bold tracking-tighter text-white/[0.06]">
          Cortex
        </span>
      </div>
    </section>
  );
}

// ─── Marquee ──────────────────────────────────────────────────────────────────
function Marquee() {
  const items = [
    "Streaming answers",
    "Source citations",
    "Tenant isolation",
    "PDF · DOCX · TXT",
    "pgvector search",
    "Role-based access",
    "Multi-doc chat",
    "Usage analytics",
  ];
  const row = [...items, ...items];
  return (
    <div className="border-y border-zinc-200 bg-white py-5">
      <div className="relative overflow-hidden">
        <motion.div
          className="flex w-max gap-3"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        >
          {row.map((label, i) => (
            <Pill key={i}>
              <span className="size-1.5 rounded-full bg-blue-600" />
              {label}
            </Pill>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Benefit / Explore ────────────────────────────────────────────────────────
const ACCORDION = [
  {
    q: "Grounded retrieval",
    a: "Every question is embedded and matched against your documents with vector search — answers cite the exact pages they came from.",
  },
  {
    q: "Multi-document chat",
    a: "Scope a conversation to specific files, or search your whole knowledge base. You decide what each chat can see.",
  },
  {
    q: "Tenant isolation",
    a: "Each organization's documents, chats, and members are fully isolated. Switch workspaces without ever leaking data.",
  },
];

function Benefit() {
  const [open, setOpen] = useState(0);
  return (
    <section className="bg-white px-5 py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
        <motion.div {...fadeUp}>
          <p className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <span className="size-1.5 rounded-full bg-blue-600" /> The benefit
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Explore your knowledge,
            <br /> instantly.
          </h2>
          <div className="mt-6 flex flex-wrap gap-2">
            <Pill>
              <MessageSquare className="size-3.5 text-zinc-400" /> Ask in plain
              English
            </Pill>
            <Pill>
              <Quote className="size-3.5 text-zinc-400" /> Cited sources
            </Pill>
          </div>

          <div className="mt-8 divide-y divide-zinc-200 border-t border-zinc-200">
            {ACCORDION.map((item, i) => {
              const active = open === i;
              return (
                <button
                  key={item.q}
                  onClick={() => setOpen(active ? -1 : i)}
                  className="flex w-full flex-col py-4 text-left"
                >
                  <span className="flex items-center justify-between text-base font-medium text-zinc-900">
                    {item.q}
                    {active ? (
                      <Minus className="size-4 text-zinc-400" />
                    ) : (
                      <Plus className="size-4 text-zinc-400" />
                    )}
                  </span>
                  {active && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2 text-sm leading-relaxed text-zinc-500"
                    >
                      {item.a}
                    </motion.p>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* stat / feature card */}
        <motion.div
          {...fadeUp}
          className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50 p-8"
        >
          <div>
            <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
              EST — your data
            </p>
            <p className="mt-4 max-w-sm text-zinc-600">
              Smart retrieval designed to move with you — fast, grounded, and
              built for answers you can trust.
            </p>
            <h3 className="mt-8 text-3xl font-semibold tracking-tight text-zinc-900">
              Visionary
              <br /> precision answers
            </h3>
          </div>

          <div className="mt-10 flex items-end justify-between gap-4">
            <Button
              asChild
              className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800"
            >
              <Link href="/register">
                Try it now <ArrowRight className="size-4" />
              </Link>
            </Button>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-right shadow-sm">
              <p className="text-xs text-zinc-400">Answers with sources</p>
              <p className="text-3xl font-semibold text-zinc-900">98%</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white">
                <Zap className="size-3" /> Cited
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Showcase (video again, framed) ───────────────────────────────────────────
function Showcase() {
  return (
    <section id="showcase" className="bg-zinc-50 px-5 py-24">
      <motion.div {...fadeUp} className="mx-auto max-w-5xl text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600">
          <span className="size-1.5 rounded-full bg-blue-600" /> Product
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Built to move with your ideas.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-zinc-500">
          A workspace that turns static files into a living conversation.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp}
        className="mx-auto mt-12 max-w-6xl overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-900 shadow-2xl"
      >
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
          <span className="size-3 rounded-full bg-red-400/80" />
          <span className="size-3 rounded-full bg-amber-400/80" />
          <span className="size-3 rounded-full bg-emerald-400/80" />
          <span className="ml-3 text-xs text-white/40">app.cortex.ai</span>
        </div>
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/cortex-hero-poster.jpg"
          className="aspect-video w-full object-cover"
        >
          <source src="/cortex-hero.mp4" type="video/mp4" />
        </video>
      </motion.div>
    </section>
  );
}

// ─── Features grid ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Upload,
    title: "Drag-and-drop ingestion",
    body: "Drop in PDFs, DOCX, or text. Cortex extracts, chunks, and embeds them automatically — watch each file flip to Ready.",
  },
  {
    icon: MessageSquare,
    title: "Streaming cited chat",
    body: "ChatGPT-style answers that stream token-by-token, each backed by clickable source citations down to the page.",
  },
  {
    icon: Building2,
    title: "Multi-tenant workspaces",
    body: "Isolated organizations with Admin / Editor / Viewer roles. Invite your team and switch orgs in a single click.",
  },
  {
    icon: BarChart3,
    title: "Usage analytics",
    body: "Track queries, active users, token consumption, and your most-referenced documents over any time range.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by design",
    body: "JWT auth, bcrypt-hashed passwords, and per-tenant data isolation enforced on every request.",
  },
  {
    icon: Sparkles,
    title: "Bring your own model",
    body: "Powered by fast Groq inference out of the box, with OpenAI as a drop-in alternative per organization.",
  },
];

function Features() {
  return (
    <section id="features" className="bg-white px-5 py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div {...fadeUp} className="max-w-2xl">
          <p className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <span className="size-1.5 rounded-full bg-blue-600" /> Features
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Everything your knowledge base needs.
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: (i % 3) * 0.08 }}
              className="group rounded-2xl border border-zinc-200 bg-zinc-50 p-6 transition-colors hover:border-zinc-300 hover:bg-white"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-900 text-white transition-transform group-hover:scale-105">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-zinc-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {f.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: "01",
    title: "Upload your documents",
    body: "Drag in PDFs and files. They're parsed, chunked, and embedded into a private vector store for your org.",
  },
  {
    n: "02",
    title: "Ask in plain language",
    body: "Type a question. Cortex retrieves the most relevant passages across your selected documents.",
  },
  {
    n: "03",
    title: "Get cited answers",
    body: "A streamed answer arrives with numbered citations you can open to verify every claim at the source.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="bg-zinc-950 px-5 py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div {...fadeUp} className="max-w-2xl">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-400">
            <span className="size-1.5 rounded-full bg-amber-400" /> How it works
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            From files to answers in three steps.
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-3">
          {STEPS.map((s) => (
            <motion.div
              key={s.n}
              {...fadeUp}
              className="bg-zinc-950 p-8"
            >
              <span className="text-5xl font-bold tracking-tighter text-white/15">
                {s.n}
              </span>
              <h3 className="mt-6 text-xl font-semibold text-white">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA({ authed }: { authed: boolean }) {
  return (
    <section className="bg-zinc-950 px-5 pb-24">
      <motion.div
        {...fadeUp}
        className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-blue-600 px-8 py-16 text-center sm:py-24"
      >
        <div className="pointer-events-none absolute -top-1/2 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Turn your documents into a conversation.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-blue-100">
            Spin up a workspace, upload a file, and ask your first question in
            under a minute.
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white text-blue-700 hover:bg-white/90"
            >
              <Link href={authed ? "/dashboard" : "/register"}>
                {authed ? "Open dashboard" : "Get started free"}
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-zinc-950 px-5 pb-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/50 sm:flex-row">
        <div className="flex items-center gap-2 text-white">
          <span className="flex size-7 items-center justify-center rounded-lg bg-white text-zinc-950">
            <Sparkles className="size-3.5" />
          </span>
          <span className="font-semibold">Cortex</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="hover:text-white">
            Sign in
          </Link>
          <Link href="/register" className="hover:text-white">
            Get started
          </Link>
          <a href="#features" className="hover:text-white">
            Features
          </a>
        </div>
        <p>© {new Date().getFullYear()} Cortex. All rights reserved.</p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function LandingPage() {
  const { status } = useSession();
  const authed = status === "authenticated";

  return (
    <main className="bg-zinc-950">
      <Nav authed={authed} />
      <Hero authed={authed} />
      <Marquee />
      <Benefit />
      <Showcase />
      <Features />
      <HowItWorks />
      <CTA authed={authed} />
      <Footer />
    </main>
  );
}
