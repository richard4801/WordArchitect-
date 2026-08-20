"use client";

import {
  AlertTriangle,
  ArrowUp,
  Ban,
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
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Sparkle } from "@/components/brand-mark";
import { CoverArt } from "@/components/ui/cover-art";
import { MiniCalendar } from "@/components/ui/mini-calendar";
import { Progress } from "@/components/ui/progress";
import { Ring } from "@/components/ui/ring";
import { SectionHeading } from "@/components/ui/section-heading";
import { Sparkline } from "@/components/ui/sparkline";
import { EditWritingGoalModal } from "@/components/edit-writing-goal-modal";
import { type ActivityKind, formatRelativeTime, useActivityLog } from "@/lib/activity-log-store";
import {
  useActiveDaysThisMonth,
  useMonthWordsWritten,
  useTodayDayOfMonth,
  useTodaysWordsWritten,
  useWeeklyWordsWritten,
  useWritingStreak,
} from "@/lib/daily-progress-store";
import { useManuscript, useManuscriptWordCount } from "@/lib/manuscript-store";
import { useProjects, useProjectsError, useProjectsLoadStatus } from "@/lib/project-store";
import { useWritingGoals } from "@/lib/writing-goal-store";
import {
  aiInsights,
  type AiInsightTone,
  type Project,
  user,
  weeklyStats,
  writingGoal,
} from "@/lib/dashboard-data";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardPageInner />
    </Suspense>
  );
}

/**
 * ?newUser=1 forces the empty-state dashboard for design/QA preview,
 * without touching the real (seeded) mock project data in project-store.ts
 * — useSearchParams needs a Suspense boundary, hence the wrapper above.
 */
function DashboardPageInner() {
  const projects = useProjects();
  const loadStatus = useProjectsLoadStatus();
  const loadError = useProjectsError();
  const forceNewUser = useSearchParams().get("newUser") === "1";

  // Deliberately no dedicated loading screen here: this page should
  // already look "open" the instant it renders, not blank out behind a
  // centered "Loading…" message that then pops to the real layout. The New
  // User shell (an honest, generic "start here" state, not a fabricated
  // claim about your data) is what a not-yet-loaded `projects: []` renders
  // as anyway via the fallthrough below — on a fast load this is invisible;
  // on a slow one (Render cold start) it briefly shows the calm default
  // instead of a jarring blank/loading swap, then updates in place once
  // the real list arrives. A genuine load failure still gets its own
  // dedicated message, since silently pretending nothing's wrong would be
  // worse than a brief wrong-variant flash.
  if (loadStatus === "error") {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div>
          <p className="font-display text-xl text-ink">Couldn&rsquo;t reach the server</p>
          <p className="mt-2 text-sm text-ink-muted">{loadError ?? "Something went wrong loading your projects."}</p>
        </div>
      </div>
    );
  }

  return projects.length === 0 || forceNewUser ? (
    <NewUserDashboard />
  ) : (
    <ReturningUserDashboard projects={projects} />
  );
}

/* ======================================================================= */
/*  Returning user — has ongoing projects                                  */
/* ======================================================================= */

function ReturningUserDashboard({ projects }: { projects: Project[] }) {
  // Same "most recently active" convention as the top-level workspace
  // redirect pages (/writing, /characters, etc.) — lowest updatedRank wins.
  const activeProject = projects.reduce((a, b) => (b.updatedRank < a.updatedRank ? b : a));

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <WelcomeBackHeader />
      <QuickActionsRow />

      <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-start">
        <ContinueWritingCard project={activeProject} />
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
            className="card card-hover flex w-24 shrink-0 flex-col items-center gap-2 px-2 py-3.5 text-center sm:w-28"
          >
            <Icon className="size-4 text-gold" strokeWidth={1.7} />
            <span className="text-xs text-ink-muted">{a.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function ContinueWritingCard({ project }: { project: Project }) {
  // The real signal for "has this project actually been written in" —
  // project.words/chapters have no backend rollup yet (see CLAUDE.md
  // §3.5) and are always 0, but the real manuscript chapter list is wired
  // now, so use that instead of a stat that can't tell the difference
  // between "never started" and "not tracked."
  const manuscript = useManuscript(project.id);
  const { total: words } = useManuscriptWordCount(project.id);
  const hasChapters = manuscript.some((part) => part.chapters.length > 0);
  const percent = project.target > 0 ? Math.round((words / project.target) * 100) : 0;
  const latestChapter = manuscript.flatMap((p) => p.chapters).sort((a, b) => b.number - a.number)[0];
  const chapterLabel = latestChapter ? `Chapter ${latestChapter.number}: ${latestChapter.title}` : "No chapters yet";

  return (
    <section className="card card-hover p-6">
      <SectionHeading title={hasChapters ? "Continue Writing" : "Start Writing"} />

      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="w-full shrink-0 sm:w-48">
          <div className="relative overflow-hidden rounded-xl border border-line">
            <CoverArt seed={project.title} className="block aspect-square w-full" />
            <span className="absolute right-2 top-2 rounded-md bg-canvas/70 px-2 py-0.5 text-[0.6rem] font-semibold tracking-widest text-gold backdrop-blur">
              {project.status === "active" ? (project.stage ?? "ACTIVE").toString().toUpperCase() : project.status.toUpperCase()}
            </span>
          </div>
          <Link
            href={`/projects/${project.id}/chapters`}
            className="mt-3 block w-full rounded-xl bg-gold px-4 py-2.5 text-center text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
          >
            {hasChapters ? "Resume Writing" : "Start Writing"}
          </Link>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="font-display text-2xl text-ink">{project.title}</h3>
          <p className="text-sm text-ink-muted">
            {hasChapters ? chapterLabel : "Nothing written yet — create your first chapter."}
          </p>

          {hasChapters && (
            <div className="mt-4">
              <Progress value={percent} />
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-ink-muted">
                  {words.toLocaleString()} / {project.target.toLocaleString()} words
                </span>
                <span className="text-gold">{percent}%</span>
              </div>
            </div>
          )}

          <Link
            href={`/projects/${project.id}`}
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
  const { dailyTarget } = useWritingGoals();
  const words = useTodaysWordsWritten();
  const streak = useWritingStreak();
  const activeDays = useActiveDaysThisMonth();
  const today = useTodayDayOfMonth();
  const percent = dailyTarget > 0 ? Math.round((words / dailyTarget) * 100) : 0;
  const [editing, setEditing] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setEditing(true);
      }}
      className="card card-hover cursor-pointer p-6 text-left"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">Today&rsquo;s Progress</h2>
        <Link
          href="/timeline"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-gold hover:opacity-80"
        >
          View Calendar →
        </Link>
      </div>

      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <Ring
            value={percent}
            label={words.toLocaleString()}
            sublabel={
              <span className="text-xs text-ink-faint">/ {dailyTarget.toLocaleString()} words</span>
            }
            size={128}
            labelClassName="text-xl"
          />
        </div>

        <div className="min-w-0 flex-1">
          <MiniCalendar activeDays={activeDays} today={today} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <div>
          <div className="font-num text-lg text-gilded">{streak}</div>
          <div className="label-caps text-[0.6rem]">Day Streak</div>
        </div>
        <p className="text-xs text-ink-faint">🔥 Keep it going!</p>
      </div>

      {editing && <EditWritingGoalModal onClose={() => setEditing(false)} />}
    </div>
  );
}

function WeeklyStatsRow({ projects }: { projects: Project[] }) {
  const active = projects.filter((p) => p.status === "active");
  const characters = projects.reduce((sum, p) => sum + (p.povCharacters ?? 0), 0);
  const worldEntries = projects.reduce((sum, p) => sum + (p.worldEntries ?? 0), 0);
  const weekWords = useWeeklyWordsWritten();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <StatTile label="Words Written (This Week)">
        <div className="flex items-end justify-between gap-2">
          <span className="font-num text-2xl text-ink">{weekWords.total.toLocaleString()}</span>
          <Sparkline data={weekWords.sparkline} className="h-6 w-14" />
        </div>
        {weekWords.trendPercent !== 0 && (
          <StatCaption text={`${weekWords.trendPercent}% from last week`} up={weekWords.trendPercent > 0} />
        )}
      </StatTile>
      <StatTile label="Projects">
        <span className="font-num text-2xl text-ink">{projects.length}</span>
        <StatCaption text={`${active.length} in progress`} up={false} />
      </StatTile>
      <StatTile label="Characters" badgeIcon={UserPlus} badgeTone="bg-purple/15 text-purple">
        <span className="font-num text-2xl text-ink">{characters}</span>
      </StatTile>
      <StatTile label="World Entries" badgeIcon={Globe2} badgeTone="bg-info/15 text-info">
        <span className="font-num text-2xl text-ink">{worldEntries}</span>
      </StatTile>
      <StatTile label="Writing Time (This Week)">
        <span className="font-num text-2xl text-ink">{weeklyStats.writingTime.value}</span>
        <p className="mt-1 text-xs text-ink-faint">No session-time tracking yet</p>
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
        {aiInsights.length > 0 && (
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.65rem] font-medium text-gold">
            {aiInsights.length} new
          </span>
        )}
      </div>
      {aiInsights.length === 0 && (
        <p className="mt-3 text-sm text-ink-muted">
          No insights yet — the AI Assistant will surface findings here as you write.
        </p>
      )}
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
  project: FilePlus2,
  note: FileText,
  banned: Ban,
};
const ACTIVITY_TONE: Record<ActivityKind, string> = {
  wrote: "bg-gold/20 text-gold",
  character: "bg-purple/20 text-purple",
  world: "bg-info/20 text-info",
  project: "bg-success/20 text-success",
  note: "bg-warn/20 text-warn",
  banned: "bg-danger/20 text-danger",
};

function ActivityCard() {
  const log = useActivityLog();
  // A card is a fixed-size preview, not a scroll container — same
  // slice-to-a-handful-and-let-"View All"-cover-the-rest convention as
  // ProjectsGrid/deriveRecentChapters/pinnedNotes/recentNotes elsewhere in
  // this app. Without it, this card would keep growing taller as real
  // activity accumulates (up to activity-log-store's own 30-entry cap)
  // instead of staying the same size like every other card on the page.
  const preview = log.slice(0, 5);
  return (
    <section className="card card-hover p-6">
      <SectionHeading title="Recent Activity" actionLabel="View All" actionHref="/timeline" />
      {preview.length === 0 && (
        <p className="py-3 text-sm text-ink-muted">
          No activity yet — start writing to see it appear here.
        </p>
      )}
      <ul className="divide-y divide-line">
        {preview.map((item) => {
          const Icon = ACTIVITY_ICON[item.kind];
          return (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-lg ${ACTIVITY_TONE[item.kind]}`}
              >
                <Icon className="size-3.5" strokeWidth={1.7} />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm text-ink">{item.text}</p>
              <span className="shrink-0 text-xs text-ink-faint">{formatRelativeTime(item.timestamp)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function WritingGoalCard() {
  const { monthlyTarget } = useWritingGoals();
  const [editing, setEditing] = useState(false);
  const current = useMonthWordsWritten();
  const activeDays = useActiveDaysThisMonth();
  const daysElapsed = useTodayDayOfMonth();
  const consistencyPercent = daysElapsed > 0 ? Math.round((activeDays.length / daysElapsed) * 100) : 0;
  const percent = monthlyTarget > 0 ? Math.round((current / monthlyTarget) * 100) : 0;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setEditing(true);
      }}
      className="card card-hover cursor-pointer p-6 text-left"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">Writing Goal</h2>
        <span className="text-xs text-gold hover:opacity-80">Edit</span>
      </div>

      <div className="mt-4 rounded-xl bg-surface-2/60 p-4">
        <p className="text-sm font-medium text-ink">Monthly Goal</p>
        <div className="mt-2 flex items-center justify-between text-sm text-ink">
          <span>
            {current.toLocaleString()} / {monthlyTarget.toLocaleString()} words
          </span>
          <span className="text-gold">{percent}%</span>
        </div>
        <Progress value={percent} className="mt-2" />
      </div>

      <div className="mt-5">
        <p className="label-caps">This Month</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <MiniStat value={activeDays.length} label="Days Active" />
          <MiniStat value={`${consistencyPercent}%`} label="Consistency" />
          <MiniStat value={writingGoal.writingTime} label="Writing Time" />
        </div>
      </div>

      {editing && <EditWritingGoalModal onClose={() => setEditing(false)} />}
    </div>
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
  const { total: words } = useManuscriptWordCount(project.id);
  const percent = project.target > 0 ? Math.round((words / project.target) * 100) : 0;
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
            {words.toLocaleString()} / {project.target.toLocaleString()} words
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
    tint: "gold",
    title: "Create Your First Project",
    detail: "Start a new story from scratch or use a template.",
    button: "New Project",
    href: "/projects/new",
    primary: true,
  },
  {
    icon: Globe2,
    tint: "success",
    title: "Build Your World",
    detail: "Create places, cultures, magic systems and more.",
    button: "Create World Entry",
    href: "/worldbuilding",
    primary: false,
  },
  {
    icon: Users,
    tint: "brown",
    title: "Meet Your Characters",
    detail: "Design unforgettable characters.",
    button: "Create Character",
    href: "/characters",
    primary: false,
  },
  {
    icon: ListTree,
    tint: "purple",
    title: "Plan Your Story",
    detail: "Outline, organize and structure your story.",
    button: "Go to Outliner",
    href: "/outlines",
    primary: false,
  },
] as const;

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
    <div className="mx-auto max-w-[1180px] space-y-8">
      <NewUserHero />
      <GetStartedCard />
      <HelpsYouWriteCard />
      <div className="grid gap-8 lg:grid-cols-[1fr_190px]">
        <SuggestedForYouCard />
        <TipOfTheDayCard />
      </div>
    </div>
  );
}

// This text sits directly on the hero photo (not the page canvas), which
// is a bright, pale sky/castle scene in light mode and a dark eye/hair
// scene in dark mode — the two themes' art isn't just a color-inverted
// version of each other, so the text needs to flip color per theme too:
// dark warm ink in light mode, white in dark mode. A soft shadow (light
// in light mode, dark in dark mode) lifts the glyphs off the artwork
// either way instead of relying on the image alone for contrast.
const HERO_TEXT =
  "text-[#2a1c10] [text-shadow:0_1px_3px_rgba(255,255,255,0.7)] dark:text-white dark:[text-shadow:0_2px_10px_rgba(0,0,0,0.6)]";

function NewUserHero() {
  return (
    <section className="pt-6">
      <div className="max-w-md">
        <p className={`text-base ${HERO_TEXT}`}>Welcome to WordArchitect,</p>
        <h1 className="mt-1 flex items-center gap-3 font-display text-6xl font-medium text-[#2a1c10] [text-shadow:0_1px_4px_rgba(255,255,255,0.7)] dark:text-white dark:[text-shadow:0_2px_14px_rgba(0,0,0,0.6)] sm:text-7xl">
          {user.name}
          <Sparkle className="size-6 text-gold" />
        </h1>
        <blockquote className={`mt-5 font-display text-lg italic leading-snug ${HERO_TEXT}`}>
          &ldquo;{user.quote.text}&rdquo;
        </blockquote>
        <p className={`mt-4 text-sm ${HERO_TEXT}`}>Let&rsquo;s bring your stories to life.</p>
      </div>

      <div className="relative mt-8 flex w-fit items-center">
        {FEATURE_CALLOUTS.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={f.text} className="flex shrink-0 items-center gap-2.5 py-1 pr-6">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold text-gold-contrast shadow-[0_3px_10px_rgba(0,0,0,0.45)]">
                <Icon className="size-3.5" strokeWidth={1.9} />
              </span>
              <span className={`text-sm ${HERO_TEXT}`}>{f.text}</span>
              {i < FEATURE_CALLOUTS.length - 1 && (
                <span className="ml-6 hidden h-8 w-px bg-line-strong sm:block" aria-hidden />
              )}
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
          const buttonClassName = `mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
            g.primary
              ? "bg-gold text-gold-contrast hover:opacity-90"
              : "border border-line-strong text-gold hover:bg-surface-2"
          }`;
          return (
            <div key={g.title} className="card-2 flex flex-col items-center p-6 text-center sm:p-7">
              <span
                className="grid size-20 shrink-0 place-items-center rounded-full border"
                style={{
                  background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--${g.tint}) 30%, transparent), color-mix(in srgb, var(--${g.tint}) 8%, transparent) 75%)`,
                  borderColor: `color-mix(in srgb, var(--${g.tint}) 40%, transparent)`,
                  color: `var(--${g.tint})`,
                }}
              >
                <Icon className="size-7" strokeWidth={1.5} />
              </span>
              <h3 className="mt-5 text-base font-medium text-ink">{g.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-faint">{g.detail}</p>
              <Link href={g.href} className={buttonClassName}>
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
      <div className="card-2 mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-line">
        {HELPS_YOU_WRITE.map((h) => {
          const Icon = h.icon;
          return (
            <div key={h.title} className="flex items-start gap-3 p-5 sm:p-6">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-gold text-gold-contrast">
                <Icon className="size-3.5" strokeWidth={1.9} />
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
        <div className="card-2 relative overflow-hidden p-5 sm:p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "url(/start-temp.png)",
              backgroundSize: "auto 140%",
              backgroundPosition: "-15px -15px",
              backgroundRepeat: "no-repeat",
              maskImage: "linear-gradient(to right, black 0%, black 36%, transparent 55%)",
              WebkitMaskImage: "linear-gradient(to right, black 0%, black 36%, transparent 55%)",
            }}
          />
          <div className="relative pl-[48%] sm:pl-[44%]">
            <h3 className="text-sm font-medium text-ink">Start with a Template</h3>
            <p className="mt-1 text-xs text-ink-faint">
              Save time and get inspired with beautiful story templates.
            </p>
            <Link
              href="/templates"
              className="mt-4 inline-flex items-center justify-center rounded-lg border border-line-strong px-3 py-2 text-xs text-gold transition-colors hover:bg-surface-2"
            >
              Explore Templates
            </Link>
          </div>
        </div>

        <div className="card-2 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-ink">Daily Writing Goal</h3>
              <p className="mt-1 text-xs text-ink-faint">Set a goal and build your writing habit.</p>
            </div>
            <Ring
              value={0}
              label="0"
              sublabel={<span className="text-[0.6rem] text-ink-faint">/ 500 words</span>}
              size={72}
              stroke={5}
              labelClassName="text-xl"
            />
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-lg border border-line-strong px-3 py-2 text-xs text-gold transition-colors hover:bg-surface-2"
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
    <section className="card flex h-full flex-col p-5 sm:p-6">
      <h2 className="font-display text-xl text-ink">Tip of the Day</h2>
      <span className="mt-4 font-display text-6xl leading-none text-gold" aria-hidden>
        &ldquo;
      </span>
      <blockquote className="-mt-4 font-display text-base italic leading-snug text-ink-muted">
        Don&rsquo;t worry about making it perfect. Just make it exist.
      </blockquote>
      <p className="mt-auto pt-3 text-xs text-ink-faint">— Your future reader</p>
    </section>
  );
}
