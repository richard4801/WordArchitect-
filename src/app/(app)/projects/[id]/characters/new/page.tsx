"use client";

import {
  AlignLeft,
  Bold,
  BookOpen,
  Calendar,
  ChevronLeft,
  Globe,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Lock,
  NotebookPen,
  Plus,
  Sparkles,
  Underline,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CharacterPortrait } from "@/components/ui/character-portrait";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import type { Character, CharacterRole } from "@/lib/character-data";
import { createCharacter, updateCharacter } from "@/lib/character-store";
import { useProject } from "@/lib/project-store";
import { CharactersTopBar } from "../_shared";

/**
 * New/Edit Character form (matches resources/+ New Character.png). One
 * shared component for both: passing `character` switches it into edit
 * mode (fields pre-filled from the existing character, submit calls
 * updateCharacter() instead of createCharacter()). `new/page.tsx`'s
 * default export renders it with no character; `[characterId]/edit/
 * page.tsx` looks the character up and passes it in.
 */

const TABS = ["Overview", "Appearance", "Personality", "Background", "Relationships", "Arc", "Notes"] as const;
type Tab = (typeof TABS)[number];

const ROLE_OPTIONS: CharacterRole[] = ["Main", "Supporting", "Minor", "Extra"];
const GENDER_OPTIONS = ["Female", "Male", "Non-binary", "Other"];
const STATUS_OPTIONS = ["Alive", "Deceased", "Missing", "Unknown"];
const ALIGNMENT_OPTIONS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
];
const ARCHETYPE_OPTIONS = [
  "The Hero",
  "The Mentor",
  "The Guardian",
  "The Trickster",
  "The Shadow",
  "The Herald",
  "The Ally",
  "The Shapeshifter",
];

const QUICK_LINKS = [
  { icon: UserPlus, title: "Add to Relationships", detail: "Connect this character" },
  { icon: Calendar, title: "Add to Timeline", detail: "Add key life events" },
  { icon: Globe, title: "Add to World", detail: "Link to locations, items, etc." },
  { icon: NotebookPen, title: "Add to Notes", detail: "Capture ideas & references" },
];

export default function NewCharacterPage() {
  return <CharacterForm />;
}

export function CharacterForm({ character }: { character?: Character }) {
  const isEdit = Boolean(character);
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("Overview");

  const [fullName, setFullName] = useState(character?.name ?? "");
  const [nickname, setNickname] = useState(character?.nickname ?? "");
  const [role, setRole] = useState<CharacterRole | "">(character?.role ?? "");
  const [age, setAge] = useState(character && character.age > 0 ? String(character.age) : "");
  const [gender, setGender] = useState(character?.gender ?? "");
  const [occupation, setOccupation] = useState(character?.occupation ?? "");
  const [status, setStatus] = useState(character?.status ?? "");
  const [alignment, setAlignment] = useState(character?.alignment ?? "");

  const [povCharacter, setPovCharacter] = useState(character?.povCharacter ?? false);
  const [archetype, setArchetype] = useState(character?.archetype ?? "");
  const [motivation, setMotivation] = useState(character?.motivation ?? "");
  const [goal, setGoal] = useState(character?.goal ?? "");
  const [fear, setFear] = useState(character?.fear ?? "");
  const [secret, setSecret] = useState(character?.secret ?? "");

  const [traits, setTraits] = useState<string[]>(
    character?.personalityTraits ?? (isEdit ? [] : ["Determined", "Introspective", "Compassionate", "Observant"]),
  );
  const [traitDraft, setTraitDraft] = useState("");
  const [addingTrait, setAddingTrait] = useState(false);

  const [summary, setSummary] = useState(character?.overview ?? "");

  const [portraitSeed, setPortraitSeed] = useState<string | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createAnother, setCreateAnother] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [roleError, setRoleError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function addTrait() {
    const t = traitDraft.trim();
    if (t && !traits.includes(t)) setTraits((prev) => [...prev, t]);
    setTraitDraft("");
    setAddingTrait(false);
  }

  function removeTrait(t: string) {
    setTraits((prev) => prev.filter((x) => x !== t));
  }

  function handlePortraitPick(file: File | undefined) {
    if (!file) return;
    setPortraitPreview(URL.createObjectURL(file));
  }

  function generateAiPortrait() {
    setPortraitPreview(null);
    setPortraitSeed(`${fullName || "character"}-${Math.random().toString(36).slice(2, 8)}`);
  }

  function resetForm() {
    setFullName("");
    setNickname("");
    setRole("");
    setAge("");
    setGender("");
    setOccupation("");
    setStatus("");
    setAlignment("");
    setPovCharacter(false);
    setArchetype("");
    setMotivation("");
    setGoal("");
    setFear("");
    setSecret("");
    setTraits([]);
    setSummary("");
    setPortraitSeed(null);
    setPortraitPreview(null);
    setTab("Overview");
  }

  async function handleSubmit() {
    const nameOk = fullName.trim().length > 0;
    const roleOk = role !== "";
    setNameError(!nameOk);
    setRoleError(!roleOk);
    if (!nameOk || !roleOk || !project) return;

    const input = {
      name: fullName,
      nickname: nickname || undefined,
      role: role as CharacterRole,
      age: age ? Number(age) : undefined,
      gender: gender || undefined,
      occupation: occupation || undefined,
      status: status || undefined,
      alignment: alignment || undefined,
      archetype: archetype || undefined,
      povCharacter,
      motivation: motivation || undefined,
      goal: goal || undefined,
      fear: fear || undefined,
      secret: secret || undefined,
      quickTraits: traits,
      summary: summary || undefined,
    };

    setSubmitError(null);
    setSubmitting(true);
    try {
      if (character) {
        await updateCharacter(character.id, input);
        router.push(`/projects/${project.id}/characters?c=${character.id}`);
        return;
      }
      const newId = await createCharacter(project.id, input);
      if (createAnother) {
        setSubmitting(false);
        resetForm();
        return;
      }
      router.push(`/projects/${project.id}/characters?c=${newId}`);
    } catch (err) {
      setSubmitting(false);
      setSubmitError(
        err instanceof Error ? err.message : `Couldn't ${character ? "save" : "create"} the character. Try again.`,
      );
    }
  }

  if (!project) {
    return (
      <div className="grid h-dvh place-items-center text-center">
        <div>
          <p className="font-display text-2xl text-ink">Project not found</p>
          <button
            onClick={() => router.push("/projects")}
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gold hover:opacity-80"
          >
            <ChevronLeft className="size-4" />
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <CharactersTopBar project={project} crumb={["Characters", isEdit ? "Edit Character" : "New Character"]} />
      <div className="scroll-slim flex flex-1 flex-col overflow-y-auto px-6 py-6">
        <div>
          <h1 className="font-display text-3xl text-ink">{isEdit ? "Edit Character" : "New Character"}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {isEdit ? "Update this character's profile." : "Create a memorable character that will live in your story."}
          </p>
        </div>

        <div className="mt-5 flex items-center gap-6 overflow-x-auto border-b border-line text-sm">
          {TABS.map((t) => (
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

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
          <div className="space-y-6">
            {tab === "Overview" ? (
              <>
                <section className="card p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg text-ink">Basic Information</h2>
                    <span className="grid size-8 place-items-center rounded-lg bg-gold/10 text-gold">
                      <Sparkles className="size-4" />
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                    <Field label="Full Name" required>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (e.target.value.trim()) setNameError(false);
                        }}
                        placeholder="e.g. Lyriana Veyra"
                        className={inputClass(nameError)}
                      />
                    </Field>
                    <Field label="Nickname(s)">
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="e.g. Lyra, Vega"
                        className={inputClass()}
                      />
                    </Field>

                    <Field label="Role in Story" required>
                      <DropdownSelect
                        value={role}
                        onChange={(v) => {
                          setRole(v as CharacterRole);
                          setRoleError(false);
                        }}
                        options={ROLE_OPTIONS}
                        placeholder="Select role"
                        error={roleError}
                      />
                    </Field>
                    <Field label="Age">
                      <input
                        type="number"
                        min={0}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 22"
                        className={inputClass()}
                      />
                    </Field>

                    <Field label="Gender">
                      <DropdownSelect value={gender} onChange={setGender} options={GENDER_OPTIONS} placeholder="Select gender" />
                    </Field>
                    <Field label="Occupation">
                      <input
                        type="text"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        placeholder="e.g. Wayfarer"
                        className={inputClass()}
                      />
                    </Field>

                    <Field label="Status">
                      <DropdownSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} placeholder="Select status" />
                    </Field>
                    <Field label="Alignment">
                      <DropdownSelect
                        value={alignment}
                        onChange={setAlignment}
                        options={ALIGNMENT_OPTIONS}
                        placeholder="Select alignment"
                      />
                    </Field>
                  </div>
                </section>

                <section className="card p-5 sm:p-6">
                  <h2 className="font-display text-lg text-ink">Core Identity</h2>

                  <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm text-ink">POV Character</label>
                      <div className="mt-1.5 flex items-center gap-2">
                        {(["Yes", "No"] as const).map((opt) => {
                          const active = povCharacter === (opt === "Yes");
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setPovCharacter(opt === "Yes")}
                              className={`rounded-xl border px-4 py-2 text-sm transition-colors ${
                                active ? "border-gold text-gold" : "border-line text-ink-muted hover:text-ink"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <Field label="Archetype">
                      <DropdownSelect
                        value={archetype}
                        onChange={setArchetype}
                        options={ARCHETYPE_OPTIONS}
                        placeholder="Select archetype"
                      />
                    </Field>
                  </div>

                  <div className="mt-4 space-y-4">
                    <Field label="Motivation">
                      <textarea
                        value={motivation}
                        onChange={(e) => setMotivation(e.target.value)}
                        placeholder="What drives this character?"
                        rows={2}
                        className={`${inputClass()} resize-y`}
                      />
                    </Field>
                    <Field label="Goal">
                      <textarea
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="What does this character want to achieve?"
                        rows={2}
                        className={`${inputClass()} resize-y`}
                      />
                    </Field>
                    <Field label="Greatest Fear">
                      <textarea
                        value={fear}
                        onChange={(e) => setFear(e.target.value)}
                        placeholder="What are they afraid of?"
                        rows={2}
                        className={`${inputClass()} resize-y`}
                      />
                    </Field>
                    <div>
                      <label className="text-sm text-ink">Secret</label>
                      <div className="relative mt-1.5">
                        <textarea
                          value={secret}
                          onChange={(e) => setSecret(e.target.value)}
                          placeholder="What are they hiding?"
                          rows={2}
                          className={`${inputClass()} resize-y pr-10`}
                        />
                        <Lock className="absolute right-3.5 top-3 size-3.5 text-ink-faint" />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="card p-5 sm:p-6">
                  <h2 className="font-display text-lg text-ink">Quick Traits</h2>
                  <p className="mt-1 text-xs text-ink-muted">Add key personality traits</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {traits.map((t) => (
                      <span
                        key={t}
                        className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs text-gold"
                      >
                        {t}
                        <button type="button" onClick={() => removeTrait(t)} aria-label={`Remove ${t}`}>
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}

                    {addingTrait ? (
                      <input
                        autoFocus
                        value={traitDraft}
                        onChange={(e) => setTraitDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTrait();
                          }
                          if (e.key === "Escape") {
                            setTraitDraft("");
                            setAddingTrait(false);
                          }
                        }}
                        onBlur={addTrait}
                        placeholder="Trait name..."
                        className="w-32 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingTrait(true)}
                        className="flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
                      >
                        <Plus className="size-3" />
                        Add Trait
                      </button>
                    )}
                  </div>
                </section>

                <section className="card p-5 sm:p-6">
                  <h2 className="font-display text-lg text-ink">Character Summary</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-1 rounded-t-xl border border-b-0 border-line bg-surface-2/40 px-2 py-1.5">
                    {[Bold, Italic, Underline, List, ListOrdered, AlignLeft, Link2, BookOpen].map((Icon, i) => (
                      <button
                        key={i}
                        type="button"
                        tabIndex={-1}
                        className="grid size-7 place-items-center rounded-md text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        <Icon className="size-3.5" />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={summary}
                    maxLength={1000}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Write a short summary of your character..."
                    rows={4}
                    className="w-full resize-y rounded-b-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
                  />
                  <div className="mt-1 text-right text-xs text-ink-faint">{summary.length} / 1000</div>
                </section>
              </>
            ) : (
              <section className="card grid place-items-center p-16 text-center">
                <div>
                  <Sparkles className="mx-auto size-6 text-gold" />
                  <p className="mt-3 font-display text-xl text-ink">{tab}</p>
                  <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
                    This section will be available in a future update — for now, the Overview tab covers everything
                    needed to create your character.
                  </p>
                </div>
              </section>
            )}
          </div>

          {/* Right rail */}
          <aside className="space-y-6">
            <section className="card p-5">
              <h2 className="font-display text-lg text-ink">Character Portrait</h2>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gold/40 text-center transition-colors hover:border-gold"
              >
                {portraitPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={portraitPreview} alt="Portrait preview" className="size-full rounded-xl object-cover" />
                ) : portraitSeed ? (
                  <CharacterPortrait seed={portraitSeed} className="size-full rounded-xl" />
                ) : (
                  <>
                    <ImagePlus className="size-7 text-gold" strokeWidth={1.5} />
                    <span className="mt-1 text-sm text-ink">Upload image</span>
                    <span className="text-xs text-ink-faint">or drag and drop</span>
                    <span className="text-xs text-ink-faint">JPG, PNG, WebP (max 10MB)</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handlePortraitPick(e.target.files?.[0])}
              />

              <div className="mt-4 flex items-center justify-between">
                <h3 className="text-sm text-ink">AI Portrait</h3>
                <span className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[0.65rem] text-gold">Beta</span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">Generate a portrait for your character.</p>
              <button
                type="button"
                onClick={generateAiPortrait}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line-strong py-2.5 text-sm text-ink transition-colors hover:border-gold hover:text-gold"
              >
                <Sparkles className="size-3.5" />
                Generate with AI
              </button>
            </section>

            <section className="card p-5">
              <h2 className="font-display text-lg text-ink">At a Glance</h2>
              <dl className="mt-3 space-y-2.5 text-sm">
                {[
                  ["Full Name", fullName],
                  ["Age", age],
                  ["Gender", gender],
                  ["Role", role],
                  ["Occupation", occupation],
                  ["Location", ""],
                  ["Status", status],
                  ["Alignment", alignment],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <dt className="text-ink-muted">{label}</dt>
                    <dd className="truncate text-ink">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="card p-5">
              <h2 className="font-display text-lg text-ink">Quick Links</h2>
              <ul className="mt-3 space-y-3.5">
                {QUICK_LINKS.map((l) => (
                  <li key={l.title} className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold">
                      <l.icon className="size-4" strokeWidth={1.7} />
                    </span>
                    <span>
                      <span className="block text-sm text-ink">{l.title}</span>
                      <span className="block text-xs text-ink-faint">{l.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pb-8 pt-5">
          <button
            type="button"
            onClick={() =>
              router.push(
                isEdit && character
                  ? `/projects/${project.id}/characters?c=${character.id}`
                  : `/projects/${project.id}/characters`,
              )
            }
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
          <div className="flex flex-wrap items-center gap-3">
            {submitError && <p className="text-sm text-danger">{submitError}</p>}
            {!isEdit && (
              <label className="flex items-center gap-2 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={createAnother}
                  onChange={(e) => setCreateAnother(e.target.checked)}
                  className="accent-gold"
                />
                Create another
              </label>
            )}
            {!isEdit && (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl border border-line-strong px-4 py-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
              >
                <Users className="size-3.5" />
                Save as Template
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Sparkles className="size-3.5" />
              {submitting ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save Changes" : "Create Character"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function inputClass(error = false) {
  return `w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${
    error ? "border-danger" : "border-line focus:border-line-strong"
  }`;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm text-ink">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
