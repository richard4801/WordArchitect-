"use client";

import {
  AlignLeft,
  ArrowRight,
  BarChart3,
  Bold,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  Clock,
  Eye,
  FileText,
  Globe,
  Heart,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Plus,
  Sparkles,
  Strikethrough,
  Sword,
  Underline,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createProject } from "@/lib/project-store";

const PRIMARY_GENRES = [
  "Epic Fantasy",
  "Dark Fantasy",
  "High Fantasy",
  "Urban Fantasy",
  "Romance",
  "Mystery",
  "Thriller",
  "Adventure",
  "Historical Fiction",
  "Sci-Fi",
  "Horror",
  "Literary Fiction",
];

const SUBGENRE_OPTIONS = [
  "Coming of Age",
  "Dark Academia",
  "Enemies to Lovers",
  "Found Family",
  "Grimdark",
  "Gothic",
  "Political Intrigue",
  "Portal Fantasy",
  "Slow Burn",
  "Steampunk",
  "Sword and Sorcery",
  "Time Travel",
];

const POV_OPTIONS = ["First Person", "Third Person", "Third Person Limited", "Dual POV", "Epistolary"];
const TENSE_OPTIONS = ["Past Tense", "Present Tense"];
const LANGUAGE_OPTIONS = ["English", "Spanish", "French", "German", "Portuguese"];
const AUDIENCE_OPTIONS = ["Adult", "Young Adult", "New Adult", "Middle Grade"];

type TemplateId = "blank" | "fantasy" | "romance";

const TEMPLATES: {
  id: TemplateId;
  title: string;
  detail: string;
  icon: typeof FileText;
  genre?: string;
  subgenres?: string[];
}[] = [
  { id: "blank", title: "Blank Project", detail: "Start from scratch with an empty project.", icon: FileText },
  {
    id: "fantasy",
    title: "Fantasy Template",
    detail: "Pre-built structure for fantasy stories.",
    icon: Sword,
    genre: "Epic Fantasy",
    subgenres: ["Sword and Sorcery", "Political Intrigue"],
  },
  {
    id: "romance",
    title: "Romance Template",
    detail: "Pre-built structure for romance stories.",
    icon: Heart,
    genre: "Romance",
    subgenres: ["Slow Burn", "Enemies to Lovers"],
  },
];

const WHATS_INCLUDED = [
  { icon: BookOpen, title: "Organized chapters", detail: "Plan and organize your story." },
  { icon: Users, title: "Character tracking", detail: "Build and track your characters." },
  { icon: Globe, title: "Worldbuilding tools", detail: "Create rich worlds and lore." },
  { icon: BarChart3, title: "Writing analytics", detail: "Track your progress and goals." },
  { icon: Sparkles, title: "AI Assistant", detail: "Get help when you need it." },
];

export default function NewProjectPage() {
  const router = useRouter();

  const [template, setTemplate] = useState<TemplateId>("blank");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [primaryGenre, setPrimaryGenre] = useState("");
  const [subgenres, setSubgenres] = useState<string[]>([]);
  const [subgenrePickerOpen, setSubgenrePickerOpen] = useState(false);
  const [themes, setThemes] = useState("");
  const [pov, setPov] = useState("");
  const [tense, setTense] = useState("");
  const [language, setLanguage] = useState("English");
  const [audience, setAudience] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [allowCollab, setAllowCollab] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [titleError, setTitleError] = useState(false);
  const [genreError, setGenreError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function applyTemplate(id: TemplateId) {
    setTemplate(id);
    const t = TEMPLATES.find((tpl) => tpl.id === id)!;
    if (t.genre) setPrimaryGenre(t.genre);
    if (t.subgenres) setSubgenres(t.subgenres);
  }

  function toggleSubgenre(name: string) {
    setSubgenres((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  }

  function handleCoverPick(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  }

  function handleSubmit() {
    const titleOk = title.trim().length > 0;
    const genreOk = primaryGenre.trim().length > 0;
    setTitleError(!titleOk);
    setGenreError(!genreOk);
    if (!titleOk || !genreOk) return;

    const id = createProject({
      title,
      tagline,
      description,
      genre: primaryGenre,
      subgenres,
      pov,
      tense,
      language,
    });
    router.push(`/projects/${id}`);
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-6 pt-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-4" />
        Back to Projects
      </Link>

      <div>
        <h1 className="font-display text-4xl text-ink">New Project</h1>
        <p className="mt-1 text-sm text-ink-muted">Create a new home for your story.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="space-y-6">
          {/* 1. Project Basics */}
          <section className="card p-5 sm:p-6">
            <h2 className="text-gold">
              <span className="font-display text-lg">1. Project Basics</span>
            </h2>

            <div className="mt-4">
              <label className="text-sm text-ink">
                Project Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={title}
                maxLength={100}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (e.target.value.trim()) setTitleError(false);
                }}
                placeholder="e.g. The Chronicles of Elarion"
                className={`mt-1.5 w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${
                  titleError ? "border-danger" : "border-line focus:border-line-strong"
                }`}
              />
              <div className="mt-1 text-right text-xs text-ink-faint">{title.length} / 100</div>
            </div>

            <div className="mt-2">
              <label className="text-sm text-ink">Tagline (Optional)</label>
              <input
                type="text"
                value={tagline}
                maxLength={150}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="A short tagline for your story"
                className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
              />
              <div className="mt-1 text-right text-xs text-ink-faint">{tagline.length} / 150</div>
            </div>

            <div className="mt-2">
              <label className="text-sm text-ink">Description (Optional)</label>
              {/* Visual formatting toolbar to match the mockup. No rich-text engine
                  wired up yet — these buttons are inert placeholders. */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1 rounded-t-xl border border-b-0 border-line bg-surface-2/40 px-2 py-1.5">
                {[Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlignLeft, Link2, ImageIcon].map(
                  (Icon, i) => (
                    <button
                      key={i}
                      type="button"
                      tabIndex={-1}
                      className="grid size-7 place-items-center rounded-md text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <Icon className="size-3.5" />
                    </button>
                  ),
                )}
              </div>
              <textarea
                value={description}
                maxLength={2000}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your story, its premise, themes, or anything you want to remember..."
                rows={5}
                className="w-full resize-y rounded-b-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
              />
              <div className="mt-1 text-right text-xs text-ink-faint">{description.length} / 2000</div>
            </div>
          </section>

          {/* 2. Genre & Categories */}
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg text-gold">2. Genre & Categories</h2>

            <div className="mt-4">
              <label className="text-sm text-ink">
                Primary Genre <span className="text-danger">*</span>
              </label>
              <div className="relative mt-1.5">
                <select
                  value={primaryGenre}
                  onChange={(e) => {
                    setPrimaryGenre(e.target.value);
                    if (e.target.value) setGenreError(false);
                  }}
                  className={`w-full appearance-none rounded-xl border bg-surface px-4 py-2.5 text-sm focus:outline-none ${
                    primaryGenre ? "text-ink" : "text-ink-faint"
                  } ${titleError || genreError ? "" : ""} ${
                    genreError ? "border-danger" : "border-line focus:border-line-strong"
                  }`}
                >
                  <option value="">Select primary genre</option>
                  {PRIMARY_GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
              </div>
            </div>

            <div className="relative mt-4">
              <label className="text-sm text-ink">Subgenres (Optional)</label>
              <button
                type="button"
                onClick={() => setSubgenrePickerOpen((o) => !o)}
                className="mt-1.5 flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 py-2.5 text-left text-sm focus:border-line-strong focus:outline-none"
              >
                <span className={subgenres.length ? "text-ink" : "text-ink-faint"}>
                  {subgenres.length ? subgenres.join(", ") : "Select one or more subgenres"}
                </span>
                <ChevronDown className="size-3.5 shrink-0 text-ink-faint" />
              </button>

              {subgenrePickerOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close subgenre picker"
                    onClick={() => setSubgenrePickerOpen(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="card-2 absolute inset-x-0 top-full z-20 mt-1.5 max-h-56 overflow-y-auto p-2">
                    {SUBGENRE_OPTIONS.map((s) => (
                      <label
                        key={s}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        <input
                          type="checkbox"
                          checked={subgenres.includes(s)}
                          onChange={() => toggleSubgenre(s)}
                          className="accent-gold"
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="mt-4">
              <label className="text-sm text-ink">Themes (Optional)</label>
              <input
                type="text"
                value={themes}
                onChange={(e) => setThemes(e.target.value)}
                placeholder="Add themes separated by commas"
                className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
              />
              <p className="mt-1.5 text-xs text-ink-faint">
                Examples: Power, Betrayal, Redemption, Love
              </p>
            </div>
          </section>

          {/* 3. Project Settings */}
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg text-gold">3. Project Settings</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                icon={Eye}
                label="POV (Point of View)"
                value={pov}
                onChange={setPov}
                placeholder="Select POV"
                options={POV_OPTIONS}
              />
              <SelectField
                icon={Clock}
                label="Tense"
                value={tense}
                onChange={setTense}
                placeholder="Select tense"
                options={TENSE_OPTIONS}
              />
              <SelectField
                icon={Globe}
                label="Language"
                value={language}
                onChange={setLanguage}
                placeholder="Select language"
                options={LANGUAGE_OPTIONS}
              />
              <SelectField
                icon={Users}
                label="Target Audience"
                value={audience}
                onChange={setAudience}
                placeholder="Select audience"
                options={AUDIENCE_OPTIONS}
              />
            </div>

            <div className="mt-5 space-y-4 border-t border-line pt-4">
              <ToggleRow
                icon={Eye}
                title="Public Project"
                detail="Allow others to view your project (you can change this later)"
                checked={isPublic}
                onChange={setIsPublic}
              />
              <ToggleRow
                icon={UserPlus}
                title="Allow Collaboration"
                detail="Invite others to collaborate on this project"
                checked={allowCollab}
                onChange={setAllowCollab}
              />
            </div>
          </section>

          {/* 4. Cover */}
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg text-gold">
              4. Cover <span className="font-sans text-sm font-normal text-ink-faint">(Optional)</span>
            </h2>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 flex w-full items-center gap-4 rounded-xl border border-dashed border-line-strong p-5 text-left transition-colors hover:border-gold"
            >
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="size-16 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line-strong text-ink-muted">
                  <Plus className="size-5" />
                </span>
              )}
              <span>
                <span className="block text-sm text-ink">
                  {coverPreview ? "Change Cover Image" : "Upload Cover Image"}
                </span>
                <span className="block text-xs text-ink-faint">
                  Recommended: 1200 x 1600px (3:4) · JPG, PNG or WebP, Max 5MB
                </span>
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleCoverPick(e.target.files?.[0])}
            />
          </section>

          <div className="flex items-center justify-end gap-3 pb-8">
            <Link
              href="/projects"
              className="rounded-xl border border-line px-5 py-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
            >
              Create Project
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Right rail */}
        <aside className="scroll-slim space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:pr-1">
          <section className="card p-5">
            <h2 className="font-display text-lg text-ink">Project Template</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Start with a template to speed up your process.
            </p>
            <div className="mt-4 space-y-2.5">
              {TEMPLATES.map((t) => {
                const Icon = t.icon;
                const active = template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t.id)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                      active ? "border-gold bg-gold/5" : "border-line hover:border-line-strong"
                    }`}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-gold">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink">{t.title}</span>
                      <span className="block text-xs text-ink-faint">{t.detail}</span>
                    </span>
                    <span
                      className={`mt-1 grid size-4 shrink-0 place-items-center rounded-full border ${
                        active ? "border-gold bg-gold" : "border-line-strong"
                      }`}
                    >
                      {active && <span className="size-1.5 rounded-full bg-gold-contrast" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-lg text-ink">What&rsquo;s Included</h2>
            <ul className="mt-3 space-y-3.5">
              {WHATS_INCLUDED.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-line text-gold">
                      <Icon className="size-3.5" strokeWidth={1.7} />
                    </span>
                    <span>
                      <span className="block text-sm text-ink">{item.title}</span>
                      <span className="block text-xs text-ink-faint">{item.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SelectField({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm text-ink">
        <Icon className="size-3.5 text-ink-faint" />
        {label}
      </label>
      <div className="relative mt-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none rounded-xl border border-line bg-surface px-4 py-2.5 text-sm focus:border-line-strong focus:outline-none ${
            value ? "text-ink" : "text-ink-faint"
          }`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  detail,
  checked,
  onChange,
}: {
  icon: typeof Eye;
  title: string;
  detail: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-ink-faint" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">{title}</p>
        <p className="text-xs text-ink-faint">{detail}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={`relative h-5 w-9 shrink-0 rounded-full border border-line transition-colors ${
          checked ? "bg-gold/30" : "bg-surface-2"
        }`}
      >
        <span
          className={`absolute top-0.5 size-3.5 rounded-full transition-all ${
            checked ? "left-4 bg-gold" : "left-0.5 bg-ink-faint"
          }`}
        />
      </button>
    </div>
  );
}
