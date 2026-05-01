"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const experts = [
  {
    name: "Anna Petrova",
    role: "Senior Recruiter",
    service: "CV Review",
    price: "€15",
    status: "Available now",
  },
  {
    name: "Mark Johnson",
    role: "Ex-FAANG Engineer",
    service: "Mock Interview",
    price: "€30",
    status: "Today",
  },
  {
    name: "Sofia Martin",
    role: "Remote Career Coach",
    service: "Job Strategy",
    price: "€20",
    status: "2 slots left",
  },
];

const chips = ["CV Review", "Mock Interview", "LinkedIn", "Remote Jobs"];

export function AnimatedHome() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-[-10%] top-[-20%] h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[10%] h-[420px] w-[420px] rounded-full bg-green-300/10 blur-[120px]" />

      <section className="app-container grid min-h-[calc(100vh-64px)] items-center gap-12 py-14 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Expert help in 15 minutes
          </div>

          <h1 className="mt-7 max-w-3xl text-balance text-5xl font-black tracking-tight text-white md:text-7xl">
            Find the right expert before your next big move.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#91a79b]">
            Book short sessions with verified people for CV reviews, LinkedIn
            feedback, interview preparation and remote job strategy.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/experts"
              className="rounded-full bg-emerald-500 px-7 py-4 text-center text-sm font-black text-[#041008] transition hover:-translate-y-0.5 hover:bg-emerald-400"
            >
              Find help
            </Link>

            <Link
              href="/become-expert"
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-7 py-4 text-center text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
            >
              Become an expert
            </Link>
          </div>

          <div className="mt-9 flex flex-wrap gap-3">
            {chips.map((chip, index) => (
              <motion.a
                key={chip}
                href="/experts"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.06 }}
                className="rounded-full border border-white/[0.08] bg-white/[0.035] px-4 py-2 text-sm text-[#91a79b] transition hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-200"
              >
                {chip}
              </motion.a>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.15 }}
          className="relative"
        >
          <div className="rounded-[2rem] border border-white/[0.08] bg-[#0b1410]/80 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-white/[0.06] bg-[#050806] p-4">
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-4">
                <span className="h-3 w-3 rounded-full bg-red-400/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                <div className="ml-4 flex-1 rounded-full bg-white/[0.05] px-4 py-2 text-sm text-[#91a79b]">
                  I have an interview tomorrow...
                </div>
              </div>

              <div className="grid gap-4 pt-4 md:grid-cols-[190px_1fr]">
                <div className="space-y-2">
                  {["All", "CV Review", "Interview", "LinkedIn"].map(
                    (item, index) => (
                      <div
                        key={item}
                        className={`rounded-2xl px-4 py-3 text-sm ${
                          index === 2
                            ? "bg-emerald-400/12 text-emerald-300 ring-1 ring-emerald-400/20"
                            : "bg-white/[0.03] text-[#91a79b]"
                        }`}
                      >
                        {item}
                      </div>
                    ),
                  )}
                </div>

                <div className="space-y-3">
                  {experts.map((expert, index) => (
                    <motion.div
                      key={expert.name}
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        duration: 3.5,
                        repeat: Infinity,
                        delay: index * 0.35,
                      }}
                      className="rounded-[1.4rem] border border-white/[0.07] bg-[#101d17] p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-lg font-black text-[#041008]">
                          {expert.name.charAt(0)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white">{expert.name}</p>
                          <p className="text-sm text-[#91a79b]">
                            {expert.role}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-black text-emerald-300">
                            {expert.price}
                          </p>
                          <p className="text-xs text-[#64766c]">15–30 min</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                          {expert.status}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {expert.service}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 backdrop-blur-xl md:block"
          >
            <p className="text-sm font-bold text-emerald-300">3 experts</p>
            <p className="text-xs text-[#91a79b]">available today</p>
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}