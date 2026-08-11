"use client";

import {
  ArrowUpDown,
  ChevronLeft,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CharacterPortrait } from "@/components/ui/character-portrait";
import { characterCounts, type Character, findCharacter } from "@/lib/character-data";
import { useCharacters } from "@/lib/character-store";
import { useProject } from "@/lib/project-store";
import { CharactersTopBar, ROLE_META } from "./_shared";

/**
 * The Characters workspace's default landing page — a list+detail split
 * view (matches resources/Characters.png). Full-bleed, own top bar, same
 * pattern as chapters/outlines: too much horizontal content (a character
 * list rail + a full profile panel) for the standard tab-chrome layout.
 *
 * Accepts an optional ?c=<characterId> so the All Characters grid (and
 * relationship cards) can deep-link straight to a specific character —
 * useSearchParams needs a Suspense boundary, hence the wrapper below.
 */

const FILTER_TABS = ["All Characters", "Main", "Supporting", "Minor"] as const;
type FilterTab = (typeof FILTER_TABS)[number];
const PROFILE_TABS = ["Profile", "Background", "Personality", "Relationships", "Notes", "Timeline"] as const;
type ProfileTab = (typeof PROFILE_TABS)[number];

export default function CharactersPage() {
  return (
    <Suspense fallback={null}>
      <CharactersPageInner />
    </Suspense>
  );
}

function CharactersPageInner() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const characters = useCharacters();
  const preselect = useSearchParams().get("c");
  const [tab, setTab] = useState<FilterTab>("All Characters");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(preselect ?? characters[0].id);
  const [profileTab, setProfileTab] = useState<ProfileTab>("Profile");

  if (!project) {
    return (
      <div className="grid h-dvh place-items-center text-center">
        <div>
          <p className="font-display text-2xl text-ink">Project not found</p>
          <Link href="/projects" className="mt-4 inline-flex items-center gap-1.5 text-sm text-gold hover:opacity-80">
            <ChevronLeft className="size-4" />
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const counts = characterCounts(characters);
  const tabCounts: Record<FilterTab, number> = {
    "All Characters": counts.all,
    Main: counts.main,
    Supporting: counts.supporting,
    Minor: counts.minor,
  };

  const filtered = characters.filter((c) => {
    if (tab !== "All Characters" && c.role !== tab) return false;
    if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
  const selected = characters.find((c) => c.id === selectedId) ?? filtered[0];

  function selectCharacter(charId: string) {
    setSelectedId(charId);
    setProfileTab("Profile");
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <CharactersTopBar project={project} crumb={["Characters"]} />
      <div className="scroll-slim flex flex-1 flex-col overflow-y-auto px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-ink">Characters</h1>
            <p className="mt-1 text-sm text-ink-muted">Build unforgettable people who bring your story to life.</p>
          </div>
          <Link
            href={`/projects/${project.id}/characters/new`}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            New Character
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="btn-raised flex min-w-[220px] flex-1 items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-ink-faint">
            <Search className="size-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search characters..."
              className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </div>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line-strong px-3.5 py-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <Filter className="size-3.5" />
            Filter
          </button>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line-strong px-3.5 py-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowUpDown className="size-3.5" />
            Sort
          </button>
        </div>

        <div className="mt-5 flex items-center gap-6 overflow-x-auto border-b border-line text-sm">
          {FILTER_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap pb-3 transition-colors ${
                tab === t ? "text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t}
              <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs text-ink-faint">{tabCounts[t]}</span>
              {tab === t && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-gold" />}
            </button>
          ))}
        </div>

        <div className="mt-5 grid min-h-[600px] flex-1 grid-cols-[300px_1fr] gap-5">
          <div className="scroll-slim overflow-y-auto pr-1">
            <div className="space-y-1.5">
              {filtered.map((c) => (
                <CharacterRow key={c.id} character={c} selected={c.id === selected?.id} onSelect={() => selectCharacter(c.id)} />
              ))}
              {filtered.length === 0 && <p className="p-3 text-sm text-ink-faint">No characters match.</p>}
            </div>
            <Link
              href={`/projects/${project.id}/characters/all`}
              className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-line-strong py-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              View All Characters
              <ChevronLeft className="size-3.5 rotate-180" />
            </Link>
          </div>

          {selected && (
            <CharacterDetail
              character={selected}
              tab={profileTab}
              setTab={setProfileTab}
              onSelectRelated={selectCharacter}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CharacterRow({
  character,
  selected,
  onSelect,
}: {
  character: Character;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = ROLE_META[character.role];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
        selected ? "border-gold bg-surface-2" : "border-transparent hover:bg-surface-2/60"
      }`}
    >
      <span className="size-11 shrink-0 overflow-hidden rounded-full border border-line-strong">
        <CharacterPortrait seed={character.id} className="size-full" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink">{character.name}</span>
        <span className="block truncate text-xs text-ink-faint">{character.role === "Main" ? "Main Character" : character.role}</span>
      </span>
      <meta.Icon className="size-4 shrink-0" style={{ color: meta.colorVar }} />
    </button>
  );
}

function CharacterDetail({
  character,
  tab,
  setTab,
  onSelectRelated,
}: {
  character: Character;
  tab: ProfileTab;
  setTab: (t: ProfileTab) => void;
  onSelectRelated: (id: string) => void;
}) {
  const meta = ROLE_META[character.role];
  return (
    <div className="scroll-slim overflow-y-auto pb-2 pl-1 pr-1">
      <div className="card p-5">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl border border-line-strong sm:w-40">
            <CharacterPortrait seed={character.id} className="size-full" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-2xl text-ink">
                {character.name}
                {character.role === "Main" && <meta.Icon className="size-5 text-gold" />}
              </h2>
              <button
                type="button"
                aria-label="More options"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </div>
            <p className="mt-1 text-sm font-medium" style={{ color: meta.colorVar }}>
              {character.role === "Main" ? "Main Character" : character.role}
            </p>
            {character.quote && (
              <blockquote className="mt-3 font-display text-base italic leading-snug text-ink-muted">
                &ldquo;{character.quote}&rdquo;
              </blockquote>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-3">
              <DetailField label="Age" value={character.age > 0 ? String(character.age) : "Unknown"} />
              <DetailField label="Gender" value={character.gender} />
              <DetailField label="Role in Story" value={character.roleInStory} />
              <DetailField label="Occupation" value={character.occupation} />
              <DetailField label="Location" value={character.location} />
              <DetailField label="Status" value={character.status} />
            </dl>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-5 overflow-x-auto border-b border-line text-sm">
          {PROFILE_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`relative shrink-0 whitespace-nowrap pb-3 transition-colors ${
                tab === t ? "text-gold" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t}
              {tab === t && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-gold" />}
            </button>
          ))}
        </div>

        {tab === "Profile" && <ProfileTabContent character={character} />}
        {tab === "Background" && <BackgroundTabContent character={character} />}
        {tab === "Personality" && <PersonalityTabContent character={character} />}
        {tab === "Relationships" && <RelationshipsTabContent character={character} onSelectRelated={onSelectRelated} full />}
        {tab === "Notes" && <EmptyTab label="notes" />}
        {tab === "Timeline" && <TimelineTabContent character={character} />}
      </div>

      {tab === "Profile" && character.relationships.length > 0 && (
        <div className="card mt-5 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg text-ink">Relationships</h3>
            <button type="button" onClick={() => setTab("Relationships")} className="flex items-center gap-1 text-sm text-gold hover:opacity-80">
              View All ({character.relationships.length})
              <ChevronLeft className="size-3.5 rotate-180" />
            </button>
          </div>
          <RelationshipsTabContent character={character} onSelectRelated={onSelectRelated} />
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-faint">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function ProfileTabContent({ character }: { character: Character }) {
  return (
    <div className="mt-5 space-y-5">
      <section className="card-2 p-4">
        <h3 className="text-sm font-medium text-ink">Overview</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{character.overview}</p>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <section className="card-2 p-4">
          <h3 className="text-sm font-medium text-ink">Physical Description</h3>
          {character.physicalDescription.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-muted">
              {character.physicalDescription.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-faint" />
                  {d}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-faint">Not described yet.</p>
          )}
        </section>

        <div className="space-y-5">
          <section className="card-2 p-4">
            <h3 className="text-sm font-medium text-ink">Personality Traits</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {character.personalityTraits.map((t) => (
                <span key={t} className="rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink-muted">
                  {t}
                </span>
              ))}
              {character.personalityTraits.length === 0 && <span className="text-sm text-ink-faint">None yet.</span>}
            </div>
          </section>

          <section className="card-2 p-4">
            <h3 className="text-sm font-medium text-ink">Motivations</h3>
            {character.motivations.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-muted">
                {character.motivations.map((m) => (
                  <li key={m} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-faint" />
                    {m}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-faint">Not defined yet.</p>
            )}
          </section>
        </div>
      </div>

      {character.arc && (
        <section className="card-2 p-5">
          <h3 className="text-sm font-medium text-ink">Character Arc</h3>
          <ArcTimeline arc={character.arc} />
        </section>
      )}
    </div>
  );
}

function ArcTimeline({ arc }: { arc: NonNullable<Character["arc"]> }) {
  const stages = [
    { label: "Beginning", text: arc.beginning },
    { label: "Middle", text: arc.middle },
    { label: "Climax", text: arc.climax },
    { label: "End", text: arc.end },
  ];
  return (
    <div className="mt-4 grid grid-cols-4 gap-3">
      {stages.map((s, i) => (
        <div key={s.label} className="relative">
          <div className="flex items-center">
            <span
              className={`size-2.5 shrink-0 rounded-full ${i === 0 ? "bg-gold" : "border-2 border-line-strong bg-canvas"}`}
            />
            {i < stages.length - 1 && <span className="h-px flex-1 bg-line-strong" />}
          </div>
          <p className={`mt-2 text-xs font-medium ${i === 0 ? "text-gold" : "text-ink"}`}>{s.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-faint">{s.text}</p>
        </div>
      ))}
    </div>
  );
}

function BackgroundTabContent({ character }: { character: Character }) {
  const rows = [
    { label: "Motivation", value: character.motivation },
    { label: "Goal", value: character.goal },
    { label: "Greatest Fear", value: character.fear },
    { label: "Secret", value: character.secret },
  ].filter((r) => r.value);
  return (
    <div className="mt-5 space-y-4">
      {rows.length === 0 && <EmptyTab label="background" />}
      {rows.map((r) => (
        <section key={r.label} className="card-2 p-4">
          <h3 className="text-sm font-medium text-ink">{r.label}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{r.value}</p>
        </section>
      ))}
    </div>
  );
}

function PersonalityTabContent({ character }: { character: Character }) {
  return (
    <div className="mt-5 space-y-5">
      <section className="card-2 p-4">
        <h3 className="text-sm font-medium text-ink">Traits</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {character.personalityTraits.map((t) => (
            <span key={t} className="rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink-muted">
              {t}
            </span>
          ))}
        </div>
      </section>
      <div className="grid gap-5 sm:grid-cols-2">
        <section className="card-2 p-4">
          <h3 className="text-sm font-medium text-ink">Archetype</h3>
          <p className="mt-2 text-sm text-ink-muted">{character.archetype ?? "Not set."}</p>
        </section>
        <section className="card-2 p-4">
          <h3 className="text-sm font-medium text-ink">Alignment</h3>
          <p className="mt-2 text-sm text-ink-muted">{character.alignment}</p>
        </section>
      </div>
    </div>
  );
}

const STRENGTH_META: Record<Character["relationships"][number]["strength"], { color: string; width: string }> = {
  Strong: { color: "var(--success)", width: "85%" },
  Moderate: { color: "var(--warn)", width: "55%" },
  Tense: { color: "var(--danger)", width: "40%" },
};

function RelationshipsTabContent({
  character,
  onSelectRelated,
  full,
}: {
  character: Character;
  onSelectRelated: (id: string) => void;
  full?: boolean;
}) {
  if (character.relationships.length === 0) {
    return full ? <EmptyTab label="relationships" /> : null;
  }
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${full ? "mt-5" : "mt-4"}`}>
      {character.relationships.map((r) => {
        const other = findCharacter(r.characterId);
        const strength = STRENGTH_META[r.strength];
        return (
          <button
            key={r.characterId}
            type="button"
            onClick={() => onSelectRelated(r.characterId)}
            className="card-2 flex flex-col gap-2 p-4 text-left transition-colors hover:bg-surface-2"
          >
            <div className="flex items-center gap-2.5">
              <span className="size-9 shrink-0 overflow-hidden rounded-full border border-line-strong">
                <CharacterPortrait seed={r.characterId} className="size-full" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{other?.name ?? r.characterId}</p>
                <p className="text-xs text-ink-faint">Bond: {r.bond}</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-ink-muted">{r.description}</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full" style={{ width: strength.width, background: strength.color }} />
              </div>
              <span className="text-[0.65rem] text-ink-faint">{r.strength}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TimelineTabContent({ character }: { character: Character }) {
  if (!character.arc) return <EmptyTab label="timeline" />;
  return (
    <div className="mt-5 space-y-3">
      {(["beginning", "middle", "climax", "end"] as const).map((key, i) => (
        <div key={key} className="card-2 flex gap-3 p-4">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold text-xs font-medium text-gold-contrast">
            {i + 1}
          </span>
          <div>
            <p className="text-sm font-medium capitalize text-ink">{key}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{character.arc![key]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="mt-5 grid place-items-center rounded-xl border border-dashed border-line-strong py-12 text-center">
      <div>
        <Sparkles className="mx-auto size-6 text-ink-faint" />
        <p className="mt-2 text-sm text-ink-muted">No {label} added yet.</p>
      </div>
    </div>
  );
}
