import { Logo } from "@/components/brand/Logo";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-kse-navy p-12 text-white lg:flex">
        <Logo onDark />
        <div className="relative z-10">
          <p className="mb-4 inline-block rounded-full bg-kse-yellow px-3 py-1 text-xs font-semibold text-kse-navy">
            RethinkX × KSE
          </p>
          <h1 className="max-w-md text-4xl font-bold leading-[1.15] text-white">
            From Systemic Disruption to Superabundance
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/80">
            An AI-mentored course on the pattern of disruption — S-curves, cost curves,
            and why change is non-linear.
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/55">
          © Kyiv School of Economics × RethinkX
        </p>
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-kse-yellow/15 blur-3xl" />
        <div className="pointer-events-none absolute -top-16 -left-10 h-48 w-48 rounded-full bg-kse-blue/10 blur-3xl" />
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
