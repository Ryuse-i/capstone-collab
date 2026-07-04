import { useState } from "react";
// 1. Import Link from react-router-dom
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Menu, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────
interface NavItem {
  label: string;
  href: string;
}

interface Feature {
  icon: string;
  title: string;
  desc: string;
}

interface PricingPlan {
  plan: string;
  price: string;
  desc: string;
  features: string[];
  featured?: boolean;
}

interface Testimonial {
  name: string;
  role: string;
  company: string;
  text: string;
}

// ─── Data ────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
];

const FEATURES: Feature[] = [
  {
    icon: "📊",
    title: "Project Health Dashboard",
    desc: "Real-time health scoring based on task completion, workload distribution, and deadline adherence.",
  },
  {
    icon: "⚖️",
    title: "Workload Balance Engine",
    desc: "Automatic workload calculation. Instantly spot overloaded and underutilized members.",
  },
  {
    icon: "🔄",
    title: "Smart Task Redistribution",
    desc: "System suggests actionable fixes — transfer, split, or convert tasks with impact previews.",
  },
  {
    icon: "🏆",
    title: "Contribution Scoring",
    desc: "Transparent performance metrics using complexity, effort share, and submission timing.",
  },
  {
    icon: "✅",
    title: "Task Approval Workflow",
    desc: "Structured review pipeline with AI-assisted evaluation and inline comments.",
  },
  {
    icon: "🟢",
    title: "Live Activity Monitoring",
    desc: "Real-time presence system. See who's Active, Idle, or Offline instantly.",
  },
];

const PRICING: PricingPlan[] = [
  {
    plan: "Starter",
    price: "$0",
    desc: "For small teams getting started.",
    features: [
      "Up to 5 members",
      "3 active projects",
      "Basic workload view",
      "Task approval flow",
      "Email support",
    ],
  },
  {
    plan: "Team",
    price: "$18",
    desc: "Everything your growing team needs.",
    features: [
      "Up to 25 members",
      "Unlimited projects",
      "Full workload engine",
      "AI-assisted review",
      "Live activity monitor",
      "Contribution scoring",
    ],
    featured: true,
  },
  {
    plan: "Enterprise",
    price: "$49",
    desc: "For large organizations.",
    features: [
      "Unlimited members",
      "SSO & SAML",
      "Custom roles",
      "Audit logs",
      "API access",
      "Dedicated support",
    ],
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Sarah Chen",
    role: "Engineering Manager",
    company: "Velotech",
    text: "Nexus gave us visibility into workload imbalance. The redistribution suggestions alone saved us a full sprint.",
  },
  {
    name: "Marcus Webb",
    role: "Product Director",
    company: "Orbis Labs",
    text: "The contribution scoring system transformed our quarterly reviews. We stopped having subjective arguments.",
  },
  {
    name: "Priya Nair",
    role: "Scrum Master",
    company: "Cloudform",
    text: "Setup was under 10 minutes. The health dashboard surfaced deadline risks we never caught before.",
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
          <div className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition"
              >
                {item.label}
              </a>
            ))}
          </div>

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
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  Log in
                </Link>
              </Button>
              <Button size="sm" className="w-full" asChild>
                <Link to="/register" onClick={() => setMobileOpen(false)}>
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
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
          Manage team workload with
          <span className="text-amber-700 dark:text-amber-400 block">
            perfect visibility
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Real-time health scoring, smart task redistribution, and contribution
          metrics. Everything you need to ship faster and more fairly.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link to="/register">Get started free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#features">Learn more</a>
          </Button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
          No credit card required · Free forever on Starter
        </p>
      </div>
    </section>
  );
}

function FeatureSection() {
  return (
    <section
      id="features"
      className="py-16 md:py-24 px-4 bg-white dark:bg-slate-950"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything your team needs
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Built around the real complexity of managing teams — not just
            tracking tasks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <Card
              key={feature.title}
              className="border-2 border-gray-200 dark:border-gray-700 hover:border-amber-600 hover:shadow-lg transition-all"
            >
              <CardHeader>
                <div className="text-4xl mb-3">{feature.icon}</div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-16 md:py-24 px-4 bg-white dark:bg-slate-950">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Trusted by teams
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            See what others are saying about Nexus
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial) => (
            <Card key={testimonial.name}>
              <CardHeader>
                <p className="text-gray-600 dark:text-gray-400 italic mb-4 line-clamp-4">
                  "{testimonial.text}"
                </p>
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {testimonial.role} at {testimonial.company}
                  </p>
                </div>
              </CardHeader>
            </Card>
          ))}
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
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Ready to manage your team better?
        </h2>
        <p className="text-lg text-amber-100 mb-8 max-w-2xl mx-auto">
          Join thousands of teams using Nexus to ship faster, more fairly, and
          with full visibility.
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
            className="text-white border-amber-300 hover:bg-white/10"
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
          <div>
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
          <div>
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
          <div>
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
          <div>
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
        <div className="border-t border-gray-200 dark:border-gray-800 pt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>&copy; 2026 PSU-COLLAB. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Landing Page ────────────────────────────────
export default function LandingPage() {
  return (
    <>
      {/* Navbar */}
      <Navbar />

      <main>
        {/* Hero Section */}
        <HeroSection />

        {/* Features Section */}
        <FeatureSection />

        {/* Testimonials Section */}
        <TestimonialsSection />

        {/* CTA Section */}
        <CTASection />
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}
