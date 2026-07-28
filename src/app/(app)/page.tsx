import {
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Feather,
  Flag,
  Globe2,
  MoreHorizontal,
  PenLine,
  Plus,
  User,
} from "lucide-react";
import Link from "next/link";
import { Sigil, Sparkle } from "@/components/brand-mark";
import { CoverArt } from "@/components/ui/cover-art";
import { Progress } from "@/components/ui/progress";
import { Ring } from "@/components/ui/ring";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  activity,
  type ActivityKind,
  continueWriting,
  headlineStats,
  type Priority,
  type Project,
  projects,
  statsOverview,
  tasks,
  user,
} from "@/lib/dashboard-data";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <HeroBanner />

      <div className="grid gap-6 lg:grid-cols-2">
        <ContinueWritingCard />
        <StatsOverviewCard />
      </div>

      <section>
        <SectionHeading title="Your Projects" actionLabel="View All" />
        <ProjectsGrid />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <TasksCard />
        <ActivityCard />
      </div>

      <FooterCta />
    </div>
  );
}

/* ---------------------------------------------------------------- Hero --- */

function HeroBanner() {
  // No image here — the oracle face is the page background (PageBackground).
  // This is just the text + stats floating over it.
  return (
    <section className="min-h-[300px] pt-3 sm:min-h-[330px]">
      <p className="text-sm text-ink-muted">Welcome back,</p>
      <h1 className="mt-1 flex items-center gap-2.5 font-display text-5xl font-medium text-ink sm:text-6xl">
        {user.name}
        <span className="flex items-center gap-1 text-gold">
          <Sparkle className="size-4" />
          <Sparkle className="size-5" />
        </span>
      </h1>

      <blockquote className="mt-5 max-w-[15rem] font-display text-xl italic leading-snug text-ink-muted sm:max-w-xs">
        &ldquo;{user.quote.text}&rdquo;
      </blockquote>
      <p className="mt-3 text-sm text-ink-faint">– {user.quote.attribution}</p>

      <div className="mt-10 grid max-w-2xl grid-cols-2 gap-y-6 sm:grid-cols-4">
        {headlineStats.map((stat, i) => (
          <div
            key={stat.label}
            className={i > 0 ? "sm:border-l sm:border-line sm:pl-5" : ""}
          >
            <div className="font-display text-3xl font-semibold text-gilded">
              {stat.value}
            </div>
            <div className="label-caps mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------- Continue Writing --- */

function ContinueWritingCard() {
  const percent = Math.round(
    (continueWriting.words / continueWriting.target) * 100,
  );

  return (
    <section className="card card-hover p-6">
      <SectionHeading title="Continue Writing" />

      <div className="relative overflow-hidden rounded-xl border border-line">
        <CoverArt
          seed={continueWriting.title}
          className="block aspect-[16/8] w-full"
        />
        <button
          type="button"
          aria-label="Options"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg bg-canvas/60 text-ink-muted backdrop-blur transition-colors hover:text-ink"
        >
          <MoreHorizontal className="size-4" />
        </button>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-canvas/90 to-transparent p-5">
          <h3 className="font-display text-2xl text-ink">
            {continueWriting.title}
          </h3>
          <p className="text-sm text-ink-muted">{continueWriting.chapter}</p>
        </div>
      </div>

      <div className="mt-5">
        <Progress value={percent} />
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-ink-muted">
            {continueWriting.words.toLocaleString()} /{" "}
            {continueWriting.target.toLocaleString()} words
          </span>
          <span className="text-gold">{percent}%</span>
        </div>
      </div>

      <Link
        href="/writing"
        className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm text-gold transition-opacity hover:opacity-80"
      >
        <span className="flex items-center gap-2">
          <ChevronRight className="size-4" />
          Continue Writing
        </span>
        <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}

/* ------------------------------------------------------ Stats Overview --- */

function StatsOverviewCard() {
  return (
    <section className="card card-hover p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl text-ink">Stats Overview</h2>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
        >
          This Month
          <ChevronDown className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
        <Ring
          value={statsOverview.goalPercent}
          label={`${statsOverview.goalPercent}%`}
          sublabel="Writing Goal"
        />
        <ul className="w-full flex-1 divide-y divide-line">
          {statsOverview.metrics.map((m) => (
            <li
              key={m.label}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span className="text-ink-muted">{m.label}</span>
              <span className="flex items-center gap-1 font-medium text-ink">
                {m.value}
                {m.up && <ArrowUp className="size-3.5 text-gold" />}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/analytics"
        className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm text-gold transition-opacity hover:opacity-80"
      >
        View Analytics
        <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}

/* ------------------------------------------------------------ Projects --- */

function ProjectsGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
      <NewProjectCard />
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const percent = Math.round((project.words / project.target) * 100);
  return (
    <article className="card card-hover overflow-hidden">
      <div className="relative">
        <CoverArt seed={project.id} className="block aspect-[16/10] w-full" />
        {project.active ? (
          <span className="absolute left-3 top-3 rounded-md bg-canvas/70 px-2 py-0.5 text-[0.6rem] font-semibold tracking-widest text-gold backdrop-blur">
            ACTIVE
          </span>
        ) : (
          <button
            type="button"
            aria-label="Options"
            className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg bg-canvas/60 text-ink-muted backdrop-blur transition-colors hover:text-ink"
          >
            <MoreHorizontal className="size-4" />
          </button>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg leading-tight text-ink">
          {project.title}
        </h3>
        <p className="mt-0.5 text-xs text-ink-muted">{project.genre}</p>
        <p className="mt-3 text-xs text-ink-faint">
          {project.words.toLocaleString()} / {project.target.toLocaleString()}{" "}
          words
        </p>
        <Progress value={percent} className="mt-2" />
      </div>
    </article>
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

/* --------------------------------------------------------------- Tasks --- */

const PRIORITY_STYLES: Record<Priority, string> = {
  High: "text-danger",
  Medium: "text-warn",
  Low: "text-low",
};

function TasksCard() {
  return (
    <section className="card card-hover p-6">
      <SectionHeading title="Tasks" actionLabel="View All" />
      <ul className="divide-y divide-line">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-3 py-3.5">
            <span className="size-5 shrink-0 rounded-full border border-line-strong" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{task.title}</p>
              <p className="truncate text-xs text-ink-faint">{task.context}</p>
            </div>
            <span
              className={`flex items-center gap-1.5 text-xs ${PRIORITY_STYLES[task.priority]}`}
            >
              <Flag className="size-3.5" />
              {task.priority}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------ Recent Activity --- */

const ACTIVITY_ICON: Record<ActivityKind, typeof PenLine> = {
  wrote: PenLine,
  character: User,
  world: Globe2,
  session: Flag,
};

function ActivityCard() {
  return (
    <section className="card card-hover p-6">
      <SectionHeading title="Recent Activity" actionLabel="View All" />
      <ul className="divide-y divide-line">
        {activity.map((item) => {
          const Icon = ACTIVITY_ICON[item.kind];
          return (
            <li key={item.id} className="flex items-center gap-3 py-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-gold">
                <Icon className="size-4" strokeWidth={1.7} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{item.text}</p>
                <p className="truncate text-xs text-ink-faint">
                  {item.context} · {item.time}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------- Footer CTA --- */

function FooterCta() {
  return (
    <section className="card card-hover flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Sigil className="size-12 shrink-0 text-gold" />
        <blockquote className="font-display text-lg italic text-ink-muted">
          &ldquo;A story isn&rsquo;t written. It&rsquo;s carved.
          <br className="hidden sm:block" /> You are the architect of
          worlds.&rdquo;
        </blockquote>
      </div>
      <Link
        href="/writing"
        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gold px-5 py-3 text-sm text-gold transition-colors hover:bg-gold hover:text-gold-contrast"
      >
        Start a New Session
        <Feather className="size-4" />
      </Link>
    </section>
  );
}
