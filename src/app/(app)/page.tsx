"use client";

import {
  AlertTriangle,
  ArrowUp,
  Compass,
  FilePlus2,
  FileText,
  Globe2,
  LayoutGrid,
  ListTree,
  PenLine,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { Sigil, Sparkle } from "@/components/brand-mark";
import { CoverArt } from "@/components/ui/cover-art";
import { MiniCalendar } from "@/components/ui/mini-calendar";
import { Progress } from "@/components/ui/progress";
import { Ring } from "@/components/ui/ring";
import { SectionHeading } from "@/components/ui/section-heading";
import { Sparkline } from "@/components/ui/sparkline";
import { useProjects } from "@/lib/project-store";
import {
  activity,
  type ActivityKind,
  aiInsights,
  type AiInsightTone,
  continueWriting,
  todaysProgress,
  type Project,
  user,
  weeklyStats,
  writingGoal,
} from "@/lib/dashboard-data";

export default function DashboardPage() {
  const projects = useProjects();
  return projects.length === 0 ? <NewUserDashboard /> : <ReturningUserDashboard projects={projects} />;
}

/* ======================================================================= */
/*  Returning user — has ongoing projects                                  */
/* ======================================================================= */

function ReturningUserDashboard({ projects }: { projects: Project[] }) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <WelcomeBackHeader />
      <QuickActionsRow />

      <div className="grid gap-6 lg:grid-cols-[1fr_480px] lg:items-start">
        <ContinueWritingCard />
        <TodaysProgressCard />
      </div>

      <WeeklyStatsRow projects={projects} />

      <div className="grid gap-6 lg:grid-cols-3">
        <AiInsightsCard />
        <ActivityCard />
        <WritingGoalCard />
      </div>

      <section>
        <SectionHeading title="Your Projects" actionLabel="View All" actionHref="/projects" />
        <ProjectsGrid projects={projects} />
      </section>
    </div>
  );
}

function WelcomeBackHeader() {
  return (
    <section className="pt-6">
      <p className="text-base text-ink-muted">Welcome back,</p>
      <h1 className="mt-1 flex items-center gap-3 font-display text-5xl font-medium text-ink sm:text-6xl">
        {user.name}
        <Sparkle className="size-5 text-gold" />
      </h1>
      <p className="mt-2 text-sm text-ink-muted">Let&rsquo;s continue crafting your masterpiece.</p>
    </section>
  );
}

const QUICK_ACTIONS = [
  { icon: PenLine, label: "Write", href: "/writing" },
  { icon: FilePlus2, label: "New Project", href: "/projects/new" },
  { icon: UserPlus, label: "Character", href: "/characters" },
  { icon: Globe2, label: "World Entry", href: "/worldbuilding" },
  { icon: ListTree, label: "Outline", href: "/outlines" },
  { icon: Sparkles, label: "Ask AI", href: "/assistant" },
];

function QuickActionsRow() {
  // Fixed-width tiles, not stretched to fill the row — the hero art shows
  // through in the space to their right, same as the mockup.
  return (
    <div className="flex flex-wrap gap-3">
      {QUICK_ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.label}
            href={a.href}
            className="card card-hover flex w-24 shrink-0 flex-col items-center gap-2.5 px-2 py-4 text-center sm:w-28"
          >
            <Icon className="size-4 text-gold" strokeWidth={1.7} />
            <span className="text-xs text-ink-muted">{a.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function ContinueWritingCard() {
  const percent = Math.round((continueWriting.words / continueWriting.target) * 100);
  return (
    <section className="card card-hover p-6">
      <SectionHeading title="Continue Writing" />

      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="w-full shrink-0 sm:w-48">
          <div className="relative overflow-hidden rounded-xl border border-line">
            <CoverArt seed={continueWriting.title} className="block aspect-square w-full" />
            <span className="absolute right-2 top-2 rounded-md bg-canvas/70 px-2 py-0.5 text-[0.6rem] font-semibold tracking-widest text-gold backdrop-blur">
              ACTIVE
            </span>
          </div>
          <Link
            href={`/projects/${continueWriting.projectId}/chapters`}
            className="mt-3 block w-full rounded-xl bg-gold px-4 py-2.5 text-center text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
          >
            Resume Writing
          </Link>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="font-display text-2xl text-ink">{continueWriting.title}</h3>
          <p className="text-sm text-ink-muted">{continueWriting.chapter}</p>

          <div className="mt-4">
            <Progress value={percent} />
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-ink-muted">
                {continueWriting.words.toLocaleString()} / {continueWriting.target.toLocaleString()} words
              </span>
              <span className="text-gold">{percent}%</span>
            </div>
          </div>

          <Link
            href={`/projects/${continueWriting.projectId}`}
            className="mt-4 block w-full rounded-xl border border-line px-4 py-2.5 text-center text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Open Project
          </Link>
        </div>
      </div>
    </section>
  );
}

function TodaysProgressCard() {
  const percent = Math.round((todaysProgress.words / todaysProgress.target) * 100);
  return (
    <section className="card card-hover p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">Today&rsquo;s Progress</h2>
        <Link href="/timeline" className="text-xs text-gold hover:opacity-80">
          View Calendar →
        </Link>
      </div>

      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <Ring
            value={percent}
            label={todaysProgress.words.toLocaleString()}
            sublabel={
              <span className="text-xs text-ink-faint">/ {todaysProgress.target.toLocaleString()} words</span>
            }
            size={128}
            labelClassName="text-xl"
          />
        </div>

        <div className="min-w-0 flex-1">
          <MiniCalendar activeDays={todaysProgress.activeDays} today={todaysProgress.today} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <div>
          <div className="font-num text-lg text-gilded">{todaysProgress.streakDays}</div>
          <div className="label-caps text-[0.6rem]">Day Streak</div>
        </div>
        <p className="text-xs text-ink-faint">🔥 Keep it going!</p>
      </div>
    </section>
  );
}

function WeeklyStatsRow({ projects }: { projects: Project[] }) {
  const active = projects.filter((p) => p.status === "active");
  const characters = projects.reduce((sum, p) => sum + (p.povCharacters ?? 0), 0);
  const worldEntries = projects.reduce((sum, p) => sum + (p.worldEntries ?? 0), 0);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <StatTile label="Words Written (This Week)">
        <div className="flex items-end justify-between gap-2">
          <span className="font-num text-2xl text-ink">
            {weeklyStats.wordsWritten.value.toLocaleString()}
          </span>
          <Sparkline data={weeklyStats.wordsWritten.sparkline} className="h-6 w-14" />
        </div>
        <StatCaption text={`${weeklyStats.wordsWritten.trendPercent}% from last week`} />
      </StatTile>
      <StatTile label="Projects">
        <span className="font-num text-2xl text-ink">{projects.length}</span>
        <StatCaption text={`${active.length} in progress`} up={false} />
      </StatTile>
      <StatTile label="Characters" badgeIcon={UserPlus} badgeTone="bg-purple/15 text-purple">
        <span className="font-num text-2xl text-ink">{characters}</span>
        <StatCaption text="3 this week" />
      </StatTile>
      <StatTile label="World Entries" badgeIcon={Globe2} badgeTone="bg-info/15 text-info">
        <span className="font-num text-2xl text-ink">{worldEntries}</span>
        <StatCaption text="7 this week" />
      </StatTile>
      <StatTile label="Writing Time (This Week)">
        <span className="font-num text-2xl text-ink">{weeklyStats.writingTime.value}</span>
        <StatCaption text={`${weeklyStats.writingTime.trendPercent}% from last week`} />
      </StatTile>
    </div>
  );
}

function StatTile({
  label,
  badgeIcon: BadgeIcon,
  badgeTone = "",
  children,
}: {
  label: string;
  badgeIcon?: typeof PenLine;
  badgeTone?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="label-caps text-[0.6rem]">{label}</p>
        {BadgeIcon && (
          <span className={`grid size-7 shrink-0 place-items-center rounded-full ${badgeTone}`}>
            <BadgeIcon className="size-3.5" strokeWidth={1.7} />
          </span>
        )}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function StatCaption({ text, up = true }: { text: string; up?: boolean }) {
  return (
    <p className={`mt-1 flex items-center gap-1 text-xs ${up ? "text-success" : "text-ink-faint"}`}>
      {up && <ArrowUp className="size-3" />}
      {text}
    </p>
  );
}

const INSIGHT_TONE_BADGE: Record<AiInsightTone, { icon: typeof PenLine; className: string }> = {
  warn: { icon: AlertTriangle, className: "bg-warn/15 text-warn" },
  purple: { icon: UserX, className: "bg-purple/15 text-purple" },
  success: { icon: TrendingDown, className: "bg-success/15 text-success" },
};

function AiInsightsCard() {
  return (
    <section className="card card-hover p-6">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-xl text-ink">AI Insights</h2>
        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.65rem] font-medium text-gold">
          {aiInsights.length} new
        </span>
      </div>
      <ul className="mt-3 space-y-4">
        {aiInsights.map((insight) => {
          const badge = INSIGHT_TONE_BADGE[insight.tone];
          const Icon = badge.icon;
          return (
            <li key={insight.id} className="flex gap-2.5 text-sm">
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full ${badge.className}`}
              >
                <Icon className="size-3" strokeWidth={1.7} />
              </span>
              <div className="min-w-0">
                <p className="text-ink-muted">{insight.text}</p>
                <Link href={insight.linkHref} className="text-xs text-gold hover:opacity-80">
                  {insight.linkLabel} →
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const ACTIVITY_ICON: Record<ActivityKind, typeof PenLine> = {
  wrote: PenLine,
  character: UserPlus,
  world: Globe2,
  session: Sparkles,
  note: FileText,
};
const ACTIVITY_TONE: Record<ActivityKind, string> = {
  wrote: "bg-gold/20 text-gold",
  character: "bg-purple/20 text-purple",
  world: "bg-info/20 text-info",
  session: "bg-success/20 text-success",
  note: "bg-warn/20 text-warn",
};

function ActivityCard() {
  return (
    <section className="card card-hover p-6">
      <SectionHeading title="Recent Activity" actionLabel="View All" actionHref="/timeline" />
      <ul className="divide-y divide-line">
        {activity.map((item) => {
          const Icon = ACTIVITY_ICON[item.kind];
          return (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-lg ${ACTIVITY_TONE[item.kind]}`}
              >
                <Icon className="size-3.5" strokeWidth={1.7} />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm text-ink">{item.text}</p>
              <span className="shrink-0 text-xs text-ink-faint">{item.time}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function WritingGoalCard() {
  const percent = Math.round((writingGoal.current / writingGoal.target) * 100);
  return (
    <section className="card card-hover p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">Writing Goal</h2>
        <button type="button" className="text-xs text-gold hover:opacity-80">
          Edit
        </button>
      </div>

      <div className="mt-4 rounded-xl bg-surface-2/60 p-4">
        <p className="text-sm font-medium text-ink">Monthly Goal</p>
        <div className="mt-2 flex items-center justify-between text-sm text-ink">
          <span>
            {writingGoal.current.toLocaleString()} / {writingGoal.target.toLocaleString()} words
          </span>
          <span className="text-gold">{percent}%</span>
        </div>
        <Progress value={percent} className="mt-2" />
      </div>

      <div className="mt-5">
        <p className="label-caps">This Month</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <MiniStat value={writingGoal.daysActive} label="Days Active" />
          <MiniStat value={`${writingGoal.consistencyPercent}%`} label="Consistency" />
          <MiniStat value={writingGoal.writingTime} label="Writing Time" />
        </div>
      </div>
    </section>
  );
}

function MiniStat({
  value,
  label,
  className = "",
}: {
  value: string | number;
  label: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="font-num text-lg text-gilded">{value}</div>
      <div className="label-caps mt-0.5 text-[0.58rem]">{label}</div>
    </div>
  );
}

function ProjectsGrid({ projects }: { projects: Project[] }) {
  const featured = projects.filter((p) => p.status === "active").slice(0, 5);
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {featured.map((project, i) => (
        <ProjectCard key={project.id} project={project} featured={i === 0} />
      ))}
      <NewProjectCard />
    </div>
  );
}

function ProjectCard({ project, featured }: { project: Project; featured: boolean }) {
  const percent = Math.round((project.words / project.target) * 100);
  return (
    <Link href={`/projects/${project.id}`} className="card card-hover block overflow-hidden">
      <div className="relative">
        <CoverArt seed={project.id} className="block aspect-[8/5] w-full" />
        {featured && (
          <span className="absolute left-3 top-3 rounded-md bg-canvas/70 px-2 py-0.5 text-[0.6rem] font-semibold tracking-widest text-gold backdrop-blur">
            ACTIVE
          </span>
        )}
      </div>
      <div className="p-3.5">
        <h3 className="truncate font-display text-base leading-tight text-ink">{project.title}</h3>
        <p className="mt-0.5 truncate text-xs text-ink-muted">{project.genre}</p>
        <div className="mt-3 flex items-center justify-between text-[0.68rem]">
          <span className="truncate text-ink-faint">
            {project.words.toLocaleString()} / {project.target.toLocaleString()} words
          </span>
          <span className="shrink-0 text-gold">{percent}%</span>
        </div>
        <Progress value={percent} className="mt-2" />
      </div>
    </Link>
  );
}

function NewProjectCard() {
  return (
    <Link
      href="/projects/new"
      className="grid min-h-[220px] place-content-center rounded-2xl border border-dashed border-line-strong text-center transition-colors hover:border-gold"
    >
      <div className="flex flex-col items-center gap-3 text-ink-muted">
        <span className="grid size-11 place-items-center rounded-full border border-line-strong">
          <Plus className="size-5" />
        </span>
        <span className="text-sm">New Project</span>
      </div>
    </Link>
  );
}

/* ======================================================================= */
/*  New user — no projects yet                                             */
/* ======================================================================= */

const FEATURE_CALLOUTS = [
  { icon: Compass, text: "Plan your story with powerful tools" },
  { icon: Globe2, text: "Bring your world to life" },
  { icon: Target, text: "Write with focus and stay consistent" },
];

const GET_STARTED = [
  {
    icon: FileText,
    title: "Create Your First Project",
    detail: "Start a new story from scratch or use a template.",
    button: "New Project",
    href: "/projects/new",
    primary: true,
  },
  {
    icon: Globe2,
    title: "Build Your World",
    detail: "Create places, cultures, magic systems and more.",
    button: "Create World Entry",
    href: "/worldbuilding",
    primary: false,
  },
  {
    icon: Users,
    title: "Meet Your Characters",
    detail: "Design unforgettable characters.",
    button: "Create Character",
    href: "/characters",
    primary: false,
  },
  {
    icon: ListTree,
    title: "Plan Your Story",
    detail: "Outline, organize and structure your story.",
    button: "Go to Outliner",
    href: "/outlines",
    primary: false,
  },
];

const HELPS_YOU_WRITE = [
  { icon: LayoutGrid, title: "Stay Organized", detail: "Everything in one place. Easy to find, easy to use." },
  { icon: Target, title: "Write Consistently", detail: "Track goals, build habits and stay motivated." },
  {
    icon: ShieldCheck,
    title: "Keep Your Story Solid",
    detail: "AI helps you avoid plot holes and inconsistencies.",
  },
  {
    icon: Globe2,
    title: "Bring Your World to Life",
    detail: "Create immersive worlds readers will never forget.",
  },
];

function NewUserDashboard() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <NewUserHero />
      <GetStartedCard />
      <HelpsYouWriteCard />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <SuggestedForYouCard />
        <TipOfTheDayCard />
      </div>
    </div>
  );
}

function NewUserHero() {
  return (
    <section className="pt-6">
      <p className="text-base text-ink-muted">Welcome to WordArchitect,</p>
      <h1 className="mt-1 flex items-center gap-3 font-display text-6xl font-medium text-ink sm:text-7xl">
        {user.name}
        <Sparkle className="size-6 text-gold" />
      </h1>
      <blockquote className="mt-5 max-w-sm font-display text-lg italic leading-snug text-ink-muted">
        &ldquo;{user.quote.text}&rdquo;
      </blockquote>
      <p className="mt-4 text-sm text-ink-muted">Let&rsquo;s bring your stories to life.</p>

      <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
        {FEATURE_CALLOUTS.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.text} className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-gold">
                <Icon className="size-3.5" strokeWidth={1.7} />
              </span>
              <span className="text-sm text-ink-muted">{f.text}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GetStartedCard() {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-display text-xl text-ink">Let&rsquo;s Get You Started</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {GET_STARTED.map((g) => {
          const Icon = g.icon;
          return (
            <div key={g.title} className="rounded-xl border border-line p-4">
              <span className="grid size-10 place-items-center rounded-full border border-line text-gold">
                <Icon className="size-4" strokeWidth={1.7} />
              </span>
              <h3 className="mt-3 text-sm font-medium text-ink">{g.title}</h3>
              <p className="mt-1 text-xs text-ink-faint">{g.detail}</p>
              <Link
                href={g.href}
                className={`mt-4 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  g.primary
                    ? "bg-gold text-gold-contrast hover:opacity-90"
                    : "border border-line text-ink-muted hover:text-ink"
                }`}
              >
                {g.primary && <Plus className="size-3.5" />}
                {g.button}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HelpsYouWriteCard() {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-display text-xl text-ink">How WordArchitect Helps You Write Better</h2>
      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {HELPS_YOU_WRITE.map((h) => {
          const Icon = h.icon;
          return (
            <div key={h.title} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border border-line text-gold">
                <Icon className="size-4" strokeWidth={1.7} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm text-ink">{h.title}</h3>
                <p className="mt-0.5 text-xs text-ink-faint">{h.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SuggestedForYouCard() {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-display text-xl text-ink">Suggested for You</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line p-4">
          <span className="grid size-10 place-items-center rounded-full border border-line text-gold">
            <Compass className="size-4" strokeWidth={1.7} />
          </span>
          <h3 className="mt-3 text-sm font-medium text-ink">Start with a Template</h3>
          <p className="mt-1 text-xs text-ink-faint">
            Save time and get inspired with beautiful story templates.
          </p>
          <Link
            href="/templates"
            className="mt-4 flex items-center justify-center rounded-lg border border-line px-3 py-2 text-xs text-ink-muted transition-colors hover:text-ink"
          >
            Explore Templates
          </Link>
        </div>

        <div className="rounded-xl border border-line p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-ink">Daily Writing Goal</h3>
              <p className="mt-1 text-xs text-ink-faint">Set a goal and build your writing habit.</p>
            </div>
            <Ring
              value={0}
              label="0"
              sublabel={<span className="text-[0.6rem] text-ink-faint">/ 500 words</span>}
              size={56}
              stroke={4}
              labelClassName="text-sm"
            />
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-lg border border-line px-3 py-2 text-xs text-ink-muted transition-colors hover:text-ink"
          >
            Set Your Goal
          </button>
        </div>
      </div>
    </section>
  );
}

function TipOfTheDayCard() {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-display text-xl text-ink">Tip of the Day</h2>
      <Sigil className="mt-4 size-8 text-gold" />
      <blockquote className="mt-3 font-display text-base italic leading-snug text-ink-muted">
        &ldquo;Don&rsquo;t worry about making it perfect. Just make it exist.&rdquo;
      </blockquote>
      <p className="mt-3 text-xs text-ink-faint">— Your future reader</p>
    </section>
  );
}
