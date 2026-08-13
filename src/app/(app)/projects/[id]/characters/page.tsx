"use client";

import {
  Award,
  ArrowUpDown,
  BookOpen,
  ChevronLeft,
  Crown,
  Eye,
  Filter,
  Pin,
  Plus,
  Search,
  Sparkles,
  Swords,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CharacterPortrait } from "@/components/ui/character-portrait";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { OptionsMenu } from "@/components/ui/options-menu";
import { characterCounts, type Character, type LifeEventType } from "@/lib/character-data";
import { deleteCharacter, useCharacterRelationships, useCharacters } from "@/lib/character-store";
import { useProject } from "@/lib/project-store";
import { BOND_META, CharactersTopBar, DEFAULT_BOND_COLOR, ROLE_META } from "./_shared";

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
  const characters = useCharacters(id);
  const preselect = useSearchParams().get("c");
  const [tab, setTab] = useState<FilterTab>("All Characters");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(preselect ?? characters[0]?.id ?? null);
  const [profileTab, setProfileTab] = useState<ProfileTab>("Profile");

  const filtered = characters.filter((c) => {
    if (tab !== "All Characters" && c.role !== tab) return false;
    if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
  const selectedBase = characters.find((c) => c.id === selectedId) ?? filtered[0];
  // Must run before any early return — Rules of Hooks.
  const selectedRelationships = useCharacterRelationships(selectedBase?.id);

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

  const selected = selectedBase ? { ...selectedBase, relationships: selectedRelationships } : undefined;

  function selectCharacter(charId: string) {
    setSelectedId(charId);
    setProfileTab("Profile");
  }

  async function handleDeleteCharacter(charId: string) {
    await deleteCharacter(charId);
    setSelectedId(null);
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

          {selected ? (
            <CharacterDetail
              character={selected}
              allCharacters={characters}
              tab={profileTab}
              setTab={setProfileTab}
              onSelectRelated={selectCharacter}
              onDelete={handleDeleteCharacter}
            />
          ) : (
            <div className="grid place-items-center rounded-xl border border-dashed border-line-strong text-center">
              <div className="p-8">
                <p className="text-sm text-ink-muted">No characters yet.</p>
                <Link
                  href={`/projects/${project.id}/characters/new`}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
                >
                  <Plus className="size-4" />
                  New Character
                </Link>
              </div>
            </div>
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
  allCharacters,
  tab,
  setTab,
  onSelectRelated,
  onDelete,
}: {
  character: Character;
  allCharacters: Character[];
  tab: ProfileTab;
  setTab: (t: ProfileTab) => void;
  onSelectRelated: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const meta = ROLE_META[character.role];
  const isProfile = tab === "Profile";
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const optionsItems = [
    { label: "Delete Character", Icon: Trash2, danger: true, onClick: () => setConfirmingDelete(true) },
  ];
  return (
    <div className="scroll-slim overflow-y-auto pb-2 pl-1 pr-1">
      <div className="card p-5">
        {isProfile ? (
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
                <OptionsMenu ariaLabel="More options" items={optionsItems} />
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
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-display text-2xl text-ink">
                {character.name}
                {character.role === "Main" && <meta.Icon className="size-5 text-gold" />}
              </h2>
              <p className="mt-1 text-sm font-medium" style={{ color: meta.colorVar }}>
                {character.role === "Main" ? "Main Character" : character.role}
              </p>
            </div>
            <OptionsMenu ariaLabel="More options" items={optionsItems} />
          </div>
        )}

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

        {isProfile ? (
          <ProfileTabContent
            character={character}
            allCharacters={allCharacters}
            onViewAllRelationships={() => setTab("Relationships")}
          />
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_260px]">
            <div className="min-w-0">
              {tab === "Background" && <BackgroundTabContent character={character} />}
              {tab === "Personality" && <PersonalityTabContent character={character} />}
              {tab === "Relationships" && (
                <RelationshipsGraph
                  character={character}
                  allCharacters={allCharacters}
                  onSelectRelated={onSelectRelated}
                />
              )}
              {tab === "Notes" && <NotesTabContent character={character} />}
              {tab === "Timeline" && <TimelineTabContent character={character} />}
            </div>
            <aside className="space-y-5 lg:sticky lg:top-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-line-strong">
                <CharacterPortrait seed={character.id} className="size-full" />
              </div>
              <section className="card-2 p-4">
                <h3 className="text-sm font-medium text-ink">At a Glance</h3>
                <dl className="mt-3 space-y-2.5 text-sm">
                  {[
                    ["Age", character.age > 0 ? String(character.age) : "Unknown"],
                    ["Gender", character.gender],
                    ["Role in Story", character.roleInStory],
                    ["Occupation", character.occupation],
                    ["Location", character.location],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <dt className="text-ink-faint">{label}</dt>
                      <dd className="truncate text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </aside>
          </div>
        )}
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this character?"
          description={`"${character.name}" and everything on their profile — background, relationships, notes — will be permanently deleted. This can't be undone.`}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={async () => {
            await onDelete(character.id);
            setConfirmingDelete(false);
          }}
        />
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

function ProfileTabContent({
  character,
  allCharacters,
  onViewAllRelationships,
}: {
  character: Character;
  allCharacters: Character[];
  onViewAllRelationships: () => void;
}) {
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

      {character.relationships.length > 0 && (
        <section className="card-2 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-ink">Relationships</h3>
            <button
              type="button"
              onClick={onViewAllRelationships}
              className="flex items-center gap-1 text-xs text-gold hover:opacity-80"
            >
              View All ({character.relationships.length})
              <ChevronLeft className="size-3.5 rotate-180" />
            </button>
          </div>
          <RelationshipPreviewList character={character} allCharacters={allCharacters} />
        </section>
      )}
    </div>
  );
}

function RelationshipPreviewList({
  character,
  allCharacters,
}: {
  character: Character;
  allCharacters: Character[];
}) {
  return (
    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
      {character.relationships.slice(0, 4).map((r) => {
        const other = allCharacters.find((c) => c.id === r.characterId);
        const bond = BOND_META[r.bond] ?? { color: DEFAULT_BOND_COLOR };
        return (
          <div key={r.characterId} className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2">
            <span className="size-8 shrink-0 overflow-hidden rounded-full border border-line-strong">
              <CharacterPortrait seed={r.characterId} className="size-full" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{other?.name ?? r.characterId}</p>
              <p className="flex items-center gap-1 text-xs" style={{ color: bond.color }}>
                <span className="size-1.5 rounded-full" style={{ background: bond.color }} />
                {r.bond}
              </p>
            </div>
          </div>
        );
      })}
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
  const hasCore = character.motivation || character.goal || character.fear || character.secret;
  if (!character.background && !character.lifeEvents && !character.culturalBackground && !hasCore) {
    return <EmptyTab label="background" />;
  }
  return (
    <div className="space-y-5">
      {character.background && (
        <section className="card-2 p-4">
          <h3 className="text-sm font-medium text-ink">Background</h3>
          <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-muted">
            {character.background.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {(character.lifeEvents || character.culturalBackground) && (
        <div className="grid gap-5 sm:grid-cols-2">
          {character.lifeEvents && (
            <section className="card-2 p-4">
              <h3 className="text-sm font-medium text-ink">Key Life Events</h3>
              <ol className="mt-3 space-y-3 border-l border-line pl-4">
                {character.lifeEvents.map((e) => (
                  <li key={`${e.year}-${e.title}`} className="relative text-sm">
                    <span className="absolute -left-[1.15rem] top-1.5 size-2 rounded-full border-2 border-canvas bg-gold" />
                    <span className="text-ink-faint">{e.year}</span> <span className="text-ink">{e.title}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {character.culturalBackground && (
            <section className="card-2 p-4">
              <h3 className="text-sm font-medium text-ink">Cultural Background</h3>
              <dl className="mt-3 space-y-2.5 text-sm">
                {[
                  ["Origin", character.culturalBackground.origin],
                  ["Upbringing", character.culturalBackground.upbringing],
                  ["Education", character.culturalBackground.education],
                  ["Beliefs", character.culturalBackground.beliefs],
                  ["Languages", character.culturalBackground.languages],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-ink-faint">{label}</dt>
                    <dd className="text-right text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      )}

      {hasCore && (
        <section className="card-2 p-4">
          <h3 className="text-sm font-medium text-ink">Core Identity</h3>
          <div className="mt-3 space-y-3">
            {[
              ["Motivation", character.motivation],
              ["Goal", character.goal],
              ["Greatest Fear", character.fear],
              ["Secret", character.secret],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-medium text-ink-muted">{label}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink">{value}</p>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PersonalityTabContent({ character }: { character: Character }) {
  const hasExtras = character.strengths || character.weaknesses || character.internalConflict;
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
      <div className="space-y-5">
        <section className="card-2 p-4">
          <h3 className="text-sm font-medium text-ink">Personality Overview</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{character.overview}</p>
        </section>

        <section className="card-2 p-4">
          <h3 className="text-sm font-medium text-ink">Personality Traits</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {character.personalityTraits.map((t) => (
              <span key={t} className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs text-gold">
                {t}
              </span>
            ))}
            {character.personalityTraits.length === 0 && <span className="text-sm text-ink-faint">None yet.</span>}
          </div>
        </section>

        {(character.strengths || character.weaknesses) && (
          <section className="card-2 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-ink">Strengths</h3>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-muted">
                  {(character.strengths ?? []).map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-success" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink">Weaknesses</h3>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-muted">
                  {(character.weaknesses ?? []).map((w) => (
                    <li key={w} className="flex gap-2">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-danger" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="space-y-5">
        {character.internalConflict && (
          <section className="card-2 p-4">
            <h3 className="text-sm font-medium text-ink">Internal Conflict</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{character.internalConflict}</p>
          </section>
        )}
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
        {!hasExtras && <section className="card-2 p-4">
          <h3 className="text-sm font-medium text-ink">Archetype</h3>
          <p className="mt-2 text-sm text-ink-muted">{character.archetype ?? "Not set."}</p>
        </section>}
      </div>
    </div>
  );
}

const LIFE_EVENT_META: Record<LifeEventType, { Icon: typeof Crown; label: string }> = {
  milestone: { Icon: Crown, label: "Milestone" },
  personal: { Icon: UserIcon, label: "Personal" },
  conflict: { Icon: Swords, label: "Conflict" },
  achievement: { Icon: Award, label: "Achievement" },
  discovery: { Icon: Eye, label: "Discovery" },
};

function RelationshipsGraph({
  character,
  allCharacters,
  onSelectRelated,
}: {
  character: Character;
  allCharacters: Character[];
  onSelectRelated: (id: string) => void;
}) {
  if (character.relationships.length === 0) return <EmptyTab label="relationships" />;
  // The radial layout supports up to 6 satellite nodes before it gets unreadable.
  const rels = character.relationships.slice(0, 6);
  const positions = RELATIONSHIP_LAYOUTS[rels.length as keyof typeof RELATIONSHIP_LAYOUTS];

  const summary = new Map<string, number>();
  for (const r of character.relationships) summary.set(r.bond, (summary.get(r.bond) ?? 0) + 1);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
      <section className="card-2 p-4">
        <h3 className="text-sm font-medium text-ink">Relationships</h3>
        <div className="relative mx-auto mt-4 aspect-square w-full max-w-[520px]">
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible">
            {rels.map((r, i) => {
              const p = positions[i];
              const bond = BOND_META[r.bond] ?? { color: DEFAULT_BOND_COLOR };
              const dotX = 50 + (p.x - 50) * 0.72;
              const dotY = 50 + (p.y - 50) * 0.72;
              return (
                <g key={r.characterId}>
                  <line x1={50} y1={50} x2={p.x} y2={p.y} stroke={bond.color} strokeOpacity={0.7} strokeWidth={0.6} />
                  <circle cx={dotX} cy={dotY} r={1.1} fill={bond.color} />
                </g>
              );
            })}
          </svg>

          <button
            type="button"
            className="absolute left-1/2 top-1/2 flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
          >
            <span className="size-16 overflow-hidden rounded-full border-2 border-gold">
              <CharacterPortrait seed={character.id} className="size-full" />
            </span>
            <span className="text-center text-xs font-medium leading-tight text-ink">{character.name}</span>
            <span className="text-center text-[0.65rem] text-gold">({character.roleInStory})</span>
          </button>

          {rels.map((r, i) => {
            const p = positions[i];
            const other = allCharacters.find((c) => c.id === r.characterId);
            const bond = BOND_META[r.bond] ?? { color: DEFAULT_BOND_COLOR };
            return (
              <button
                key={r.characterId}
                type="button"
                onClick={() => onSelectRelated(r.characterId)}
                className="absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 transition-transform hover:scale-105"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <span className="size-14 overflow-hidden rounded-full border-2" style={{ borderColor: bond.color }}>
                  <CharacterPortrait seed={r.characterId} className="size-full" />
                </span>
                <span className="truncate text-center text-xs text-ink">{other?.name ?? r.characterId}</span>
                <span className="text-center text-[0.65rem]" style={{ color: bond.color }}>
                  Bond &bull; {r.bond}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="space-y-5">
        <section className="card-2 p-4">
          <h3 className="text-sm font-medium text-ink">Relationship Key</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {(Object.keys(BOND_META) as (keyof typeof BOND_META)[]).map((bond) => (
              <li key={bond} className="flex items-center gap-2 text-ink-muted">
                <span className="h-0.5 w-4 shrink-0 rounded-full" style={{ background: BOND_META[bond].color }} />
                {bond}
              </li>
            ))}
          </ul>
        </section>
        <section className="card-2 p-4">
          <h3 className="text-sm font-medium text-ink">Relationship Summary</h3>
          <dl className="mt-3 space-y-2 text-sm">
            {Array.from(summary.entries()).map(([bond, count]) => (
              <div key={bond} className="flex items-center justify-between text-ink-muted">
                <dt>{bond}</dt>
                <dd className="text-ink">{count}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

const RELATIONSHIP_LAYOUTS = {
  1: [{ x: 50, y: 12 }],
  2: [
    { x: 18, y: 50 },
    { x: 82, y: 50 },
  ],
  3: [
    { x: 50, y: 8 },
    { x: 14, y: 82 },
    { x: 86, y: 82 },
  ],
  4: [
    { x: 18, y: 15 },
    { x: 82, y: 15 },
    { x: 18, y: 85 },
    { x: 82, y: 85 },
  ],
  5: [
    { x: 50, y: 6 },
    { x: 90, y: 34 },
    { x: 74, y: 90 },
    { x: 26, y: 90 },
    { x: 10, y: 34 },
  ],
  6: [
    { x: 18, y: 12 },
    { x: 82, y: 12 },
    { x: 6, y: 50 },
    { x: 94, y: 50 },
    { x: 18, y: 88 },
    { x: 82, y: 88 },
  ],
};

function NotesTabContent({ character }: { character: Character }) {
  const notes = character.notes ?? [];
  if (notes.length === 0) return <EmptyTab label="notes" />;
  return (
    <section className="card-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-ink">Notes</h3>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-gold/40 px-3 py-1.5 text-xs text-gold transition-colors hover:bg-gold/10"
        >
          <Plus className="size-3.5" />
          New Note
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map((note) => (
          <div key={note.title} className="rounded-xl border border-line p-3.5">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium text-ink">{note.title}</h4>
              {note.pinned && <Pin className="size-3.5 shrink-0 text-gold" />}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{note.body}</p>
            <div className="mt-3 flex items-center justify-between text-ink-faint">
              <span className="text-[0.65rem]">{note.date}</span>
              <BookOpen className="size-3.5" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TimelineTabContent({ character }: { character: Character }) {
  const [filter, setFilter] = useState<"All" | LifeEventType>("All");
  const events = character.lifeEvents ?? [];
  if (events.length === 0) return <EmptyTab label="timeline" />;
  const filtered = filter === "All" ? events : events.filter((e) => e.type === filter);

  return (
    <section className="card-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-ink">Timeline</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-gold/40 px-3 py-1.5 text-xs text-gold transition-colors hover:bg-gold/10"
          >
            <Plus className="size-3.5" />
            Add Event
          </button>
          <div className="card-2 flex items-center gap-1 p-1">
            <button
              type="button"
              onClick={() => setFilter("All")}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                filter === "All" ? "bg-gold text-gold-contrast" : "text-ink-muted hover:text-ink"
              }`}
            >
              All
            </button>
            {(Object.keys(LIFE_EVENT_META) as LifeEventType[]).map((type) => {
              const { Icon } = LIFE_EVENT_META[type];
              return (
                <button
                  key={type}
                  type="button"
                  aria-label={LIFE_EVENT_META[type].label}
                  onClick={() => setFilter(type)}
                  className={`grid size-7 place-items-center rounded-md transition-colors ${
                    filter === type ? "bg-gold text-gold-contrast" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <Icon className="size-3.5" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ol className="mt-4 space-y-4 border-l border-line pl-5">
        {filtered.map((e) => {
          const { Icon } = LIFE_EVENT_META[e.type];
          return (
            <li key={`${e.year}-${e.title}`} className="relative">
              <span className="absolute -left-[1.65rem] top-0.5 size-2.5 rounded-full border-2 border-canvas bg-gold" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-ink-faint">{e.year}</p>
                  <p className="text-sm font-medium text-ink">{e.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{e.description}</p>
                </div>
                <Icon className="size-4 shrink-0 text-gold" />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-line-strong py-12 text-center">
      <div>
        <Sparkles className="mx-auto size-6 text-ink-faint" />
        <p className="mt-2 text-sm text-ink-muted">No {label} added yet.</p>
      </div>
    </div>
  );
}
