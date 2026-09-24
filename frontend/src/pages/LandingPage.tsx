import { useEffect, useState, type ReactNode } from "react";
// 1. Import Link from react-router-dom
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import workloadBalanceImage from "@/assets/landing page/workload balance.jpg";
import dashboardImage from "@/assets/landing page/Dashboard.png";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  LayoutGridIcon,
  Menu,
  RefreshCw,
  Scale,
  Trophy,
  X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────

interface Feature {
  icon: ReactNode;
  title: string;
  desc: string;
  image?: string;
}

// ─── Data ────────────────────────────────────────────

const FEATURES: Feature[] = [
  {
    icon: <LayoutGridIcon />,
    title: "Project Health Dashboard",
    desc: "Real-time health scoring based on task completion, workload distribution, and deadline adherence.",
    image: dashboardImage,
  },
  {
    icon: <Scale />,
    title: "Workload Balance Engine",
    desc: "Automatic workload calculation. Instantly spot overloaded and underutilized members.",
    image: workloadBalanceImage,
  },
  {
    icon: <RefreshCw />,
    title: "Smart Task Redistribution",
    desc: "System suggests actionable fixes — transfer, split, or convert tasks with impact previews.",
  },
  {
    icon: <Trophy />,
    title: "Contribution Scoring",
    desc: "Transparent performance metrics using complexity, effort share, and submission timing.",
  },
  {
    icon: <CheckCircle2 />,
    title: "Task Approval Workflow",
    desc: "Structured review pipeline with AI-assisted evaluation and inline comments.",
  },
  {
    icon: <Activity />,
    title: "Live Activity Monitoring",
    desc: "Real-time presence system. See who's Active, Idle, or Offline instantly.",
  },
];

// ─── Sub-components ───────────────────────────────────
function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm border-b border-gray-200 dark:bg-slate-950/80 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="text-2xl font-bold text-amber-700 dark:text-amber-400"
            >
              PSU-COLLAB
            </Link>
          </div>

          {/* Desktop Navigation */}

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Get started</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3">
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  Log in
                </Link>
              </Button>
              <Button size="sm" className="w-full" asChild>
                <Link to="/signup" onClick={() => setMobileOpen(false)}>
                  Get started
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="py-20 md:py-32 px-4 bg-white dark:bg-slate-950">
      <div className="max-w-4xl mx-auto text-center">
        {/* Title */}
        <div className="animate-on-scroll">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Manage team workload with
            <span className="text-amber-700 dark:text-amber-400 block">
              perfect visibility
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <p
          className="animate-on-scroll text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto"
          style={{ transitionDelay: "150ms" }}
        >
          Real-time health scoring, smart task redistribution, and contribution
          metrics. Everything you need to ship faster and more fairly.
        </p>

        {/* Buttons */}
        <div className="animate-on-scroll" style={{ transitionDelay: "300ms" }}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/signup">Get started free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">Learn more</a>
            </Button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
            No credit card required · Free forever on Starter
          </p>
        </div>
      </div>
    </section>
  );
  ``;
}

function FeatureSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [progressPaused, setProgressPaused] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => setReducedMotion(mediaQuery.matches);

    updateReducedMotion();
    mediaQuery.addEventListener("change", updateReducedMotion);

    return () => mediaQuery.removeEventListener("change", updateReducedMotion);
  }, []);

  return (
    <section
      id="features"
      className="py-16 md:py-24 px-4 bg-white dark:bg-slate-950"
    >
      <div className="max-w-6xl mx-auto">
        {/* Title fades up */}
        <div className="text-center mb-12 animate-on-scroll">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything your team needs
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Built around the real complexity of managing teams — not just
            tracking tasks.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="animate-on-scroll order-1">
            {/* No padding here so the image can bleed off the edges */}
            <div className="relative aspect-4/3 overflow-hidden rounded-3xl bg-amber-100 dark:bg-amber-950/40">
              {FEATURES.map((feature, index) => {
                const isActive = activeIndex === index;

                return (
                  <div
                    key={feature.title}
                    aria-hidden={!isActive}
                    className={`absolute inset-0 transition duration-500 ease-out motion-reduce:transition-none ${
                      isActive
                        ? "scale-100 translate-y-0 opacity-100"
                        : "pointer-events-none translate-y-2 scale-[0.98] opacity-0"
                    }`}
                  >
                    {feature.image ? (
                      // Cropped screenshot: starts near top-left, bleeds off right & bottom
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className="absolute left-6 top-6 h-[125%] w-[125%] max-w-none rounded-tl-2xl object-cover object-top-left shadow-2xl ring-1 ring-black/5 sm:left-10 sm:top-10"
                      />
                    ) : (
                      <div className="absolute inset-5 flex flex-col items-center justify-center gap-5 rounded-2xl bg-white text-center shadow-sm dark:bg-slate-800">
                        <div className="flex size-20 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                          <span className="[&>svg]:size-10">
                            {feature.icon}
                          </span>
                        </div>
                        <div>
                          <p className="text-xl font-semibold text-gray-900 dark:text-white">
                            {feature.title}
                          </p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
                            Image placeholder
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="animate-on-scroll order-2"
            onMouseEnter={() => setProgressPaused(true)}
            onMouseLeave={() => setProgressPaused(false)}
          >
            {FEATURES.map((feature, index) => {
              const isActive = activeIndex === index;
              const descriptionId = `feature-description-${index}`;

              return (
                <div
                  key={feature.title}
                  className="relative border-b border-gray-200 dark:border-slate-700"
                >
                  <button
                    type="button"
                    aria-expanded={isActive}
                    aria-controls={descriptionId}
                    onClick={() => setActiveIndex(index)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="text-xl font-semibold text-gray-900 dark:text-white">
                      {feature.title}
                    </span>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200">
                      <ChevronDown
                        className={`size-4 transition-transform duration-300 motion-reduce:transition-none ${
                          isActive ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </button>

                  <div
                    id={descriptionId}
                    role="region"
                    className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none ${
                      isActive
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <p className="pb-5 pr-12 text-base leading-relaxed text-gray-600 dark:text-gray-400">
                        {feature.desc}
                      </p>
                    </div>
                  </div>

                  {isActive && !reducedMotion && (
                    <span
                      key={activeIndex}
                      className="feature-progress absolute -bottom-px left-0 h-0.5 w-0 bg-gray-900 dark:bg-amber-200"
                      style={{
                        animationPlayState: progressPaused
                          ? "paused"
                          : "running",
                      }}
                      onAnimationEnd={() =>
                        setActiveIndex(
                          (currentIndex) =>
                            (currentIndex + 1) % FEATURES.length,
                        )
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section
      className="py-16 md:py-24 px-4"
      style={{
        background:
          "linear-gradient(135deg, rgb(112, 29, 11) 0%, rgb(62, 16, 7) 100%)",
      }}
    >
      <div className="max-w-4xl mx-auto text-center animate-on-scroll">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Ready to manage your team better?
        </h2>
        <p className="text-lg text-amber-100 mb-8 max-w-2xl mx-auto">
          Join thousands of teams using PSU Collab to ship faster, more fairly,
          and with full visibility.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            asChild
          >
            <Link to="/register">Get started free</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-black border-amber-300 hover:bg-white/10"
            asChild
          >
            <a href="#features">Learn more</a>
          </Button>
        </div>
        <p className="text-sm text-amber-100 mt-6">
          No credit card required · Free forever on Starter
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="animate-on-scroll" style={{ transitionDelay: "0ms" }}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Product
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <a
                  href="#features"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div
            className="animate-on-scroll"
            style={{ transitionDelay: "100ms" }}
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Company
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <a
                  href="#"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>

          <div
            className="animate-on-scroll"
            style={{ transitionDelay: "200ms" }}
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Legal
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <a
                  href="#"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  Privacy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  Terms
                </a>
              </li>
            </ul>
          </div>

          <div
            className="animate-on-scroll"
            style={{ transitionDelay: "300ms" }}
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Connect
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <a
                  href="#"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="animate-on-scroll border-t border-gray-200 dark:border-gray-800 pt-8 text-center text-sm text-gray-600 dark:text-gray-400"
          style={{ transitionDelay: "400ms" }}
        >
          <p>&copy; 2026 PSU-COLLAB. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Landing Page ────────────────────────────────
export default function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 },
    );

    document
      .querySelectorAll(".animate-on-scroll, .fade-left, .fade-right")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <FeatureSection />

        <CTASection />
      </main>
      <Footer />
    </>
  );
}
