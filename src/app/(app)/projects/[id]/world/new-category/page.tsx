"use client";

import {
  Anchor,
  BookOpen,
  Building2,
  Castle,
  Check,
  ChevronLeft,
  Coins,
  Compass,
  Crown,
  Drama,
  Eye,
  Feather,
  Flag,
  Flame,
  FlaskConical,
  Gem,
  Hourglass,
  ImagePlus,
  Key,
  Landmark,
  Map as MapIcon,
  Mountain,
  Package,
  Plus,
  Scale,
  Scroll,
  Search,
  Shield,
  Skull,
  Sparkles,
  Swords,
  TreePine,
  Upload,
  Users,
  Waves,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { createWorldCategory, useWorldCategories } from "@/lib/worldbuilding-store";
import { useProject } from "@/lib/project-store";
import { WorldTopBar } from "../_shared";

/** "Create New Category" form (matches "Create New Category (Worldbuilding).png"). */

const COLOR_SWATCHES = [
  "#d4af7a",
  "#3fa46a",
  "#4fb8a8",
  "#4f86c6",
  "#a06cc7",
  "#c0473a",
  "#e0954f",
  "#8a93a6",
];

const ICON_TABS = ["All", "Places", "People", "Magic", "Items"] as const;
type IconTab = (typeof ICON_TABS)[number];

const ICON_LIBRARY: { name: string; Icon: LucideIcon; tag: Exclude<IconTab, "All"> }[] = [
  { name: "Castle", Icon: Castle, tag: "Places" },
  { name: "Mountain", Icon: Mountain, tag: "Places" },
  { name: "Building", Icon: Building2, tag: "Places" },
  { name: "Tree", Icon: TreePine, tag: "Places" },
  { name: "Landmark", Icon: Landmark, tag: "Places" },
  { name: "Map", Icon: MapIcon, tag: "Places" },
  { name: "Users", Icon: Users, tag: "People" },
  { name: "Crown", Icon: Crown, tag: "People" },
  { name: "Drama", Icon: Drama, tag: "People" },
  { name: "Skull", Icon: Skull, tag: "People" },
  { name: "Feather", Icon: Feather, tag: "People" },
  { name: "Eye", Icon: Eye, tag: "People" },
  { name: "Sparkles", Icon: Sparkles, tag: "Magic" },
  { name: "Wand", Icon: Wand2, tag: "Magic" },
  { name: "Flame", Icon: Flame, tag: "Magic" },
  { name: "Waves", Icon: Waves, tag: "Magic" },
  { name: "Compass", Icon: Compass, tag: "Magic" },
  { name: "Key", Icon: Key, tag: "Magic" },
  { name: "Shield", Icon: Shield, tag: "Items" },
  { name: "Flag", Icon: Flag, tag: "Items" },
  { name: "Book", Icon: BookOpen, tag: "Items" },
  { name: "Scroll", Icon: Scroll, tag: "Items" },
  { name: "Gem", Icon: Gem, tag: "Items" },
  { name: "Potion", Icon: FlaskConical, tag: "Items" },
  { name: "Anchor", Icon: Anchor, tag: "Items" },
  { name: "Swords", Icon: Swords, tag: "Items" },
  { name: "Chest", Icon: Package, tag: "Items" },
  { name: "Hourglass", Icon: Hourglass, tag: "Items" },
  { name: "Coins", Icon: Coins, tag: "Items" },
  { name: "Scale", Icon: Scale, tag: "Items" },
];

const DEFAULT_VIEWS = ["Grid View", "List View", "Timeline View"] as const;

const SUGGESTED_CATEGORIES = ["Kingdoms", "Magic Systems", "Religions", "Ancient Civilizations", "Guilds & Factions"];

export default function NewWorldCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const categories = useWorldCategories();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentCategory, setParentCategory] = useState("");
  const [selectedIconName, setSelectedIconName] = useState("Castle");
  const [selectedColor, setSelectedColor] = useState(COLOR_SWATCHES[0]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [defaultView, setDefaultView] = useState<(typeof DEFAULT_VIEWS)[number]>("Grid View");
  const [visibleInSidebar, setVisibleInSidebar] = useState(true);
  const [allowSubcategories, setAllowSubcategories] = useState(true);
  const [createAnother, setCreateAnother] = useState(false);
  const [nameError, setNameError] = useState(false);

  const [iconQuery, setIconQuery] = useState("");
  const [iconTab, setIconTab] = useState<IconTab>("All");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedIcon = ICON_LIBRARY.find((i) => i.name === selectedIconName) ?? ICON_LIBRARY[0];
  const filteredIcons = ICON_LIBRARY.filter((i) => {
    if (iconTab !== "All" && i.tag !== iconTab) return false;
    if (iconQuery && !i.name.toLowerCase().includes(iconQuery.toLowerCase())) return false;
    return true;
  });

  function handleCoverPick(file: File | undefined) {
    if (!file) return;
    setCoverPreview(URL.createObjectURL(file));
  }

  function resetForm() {
    setName("");
    setDescription("");
    setParentCategory("");
    setSelectedIconName("Castle");
    setSelectedColor(COLOR_SWATCHES[0]);
    setCoverPreview(null);
    setDefaultView("Grid View");
    setVisibleInSidebar(true);
    setAllowSubcategories(true);
  }

  function handleSubmit() {
    const nameOk = name.trim().length > 0;
    setNameError(!nameOk);
    if (!nameOk || !project) return;

    createWorldCategory({
      name,
      description,
      color: selectedColor,
      Icon: selectedIcon.Icon,
    });

    if (createAnother) {
      resetForm();
      return;
    }
    router.push(`/projects/${project.id}/world`);
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
      <WorldTopBar project={project} crumb={["Worldbuilding", "New Category"]} />
      <div className="scroll-slim flex flex-1 flex-col overflow-y-auto px-6 py-6">
        <div>
          <h1 className="font-display text-3xl text-ink">Create New Category</h1>
          <p className="mt-1 text-sm text-ink-muted">Define a new worldbuilding category to organize your world.</p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="space-y-6">
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-lg text-ink">1. Basic Information</h2>
              <p className="mt-1 text-xs text-ink-muted">Set the fundamental details of your category.</p>

              <div className="mt-4">
                <label className="text-sm text-ink">
                  Category Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  maxLength={60}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim()) setNameError(false);
                  }}
                  placeholder="e.g. Kingdoms, Magic Systems, Ancient Artifacts"
                  className={`mt-1.5 w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${
                    nameError ? "border-danger" : "border-line focus:border-line-strong"
                  }`}
                />
                <div className="mt-1 text-right text-xs text-ink-faint">{name.length} / 60</div>
              </div>

              <div className="mt-2">
                <label className="text-sm text-ink">Description</label>
                <textarea
                  value={description}
                  maxLength={200}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this category will contain and its purpose in your world..."
                  rows={3}
                  className="mt-1.5 w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
                />
                <div className="mt-1 text-right text-xs text-ink-faint">{description.length} / 200</div>
              </div>

              <div className="mt-2">
                <label className="text-sm text-ink">
                  Parent Category <span className="text-ink-faint">(Optional)</span>
                </label>
                <p className="mt-0.5 text-xs text-ink-muted">Organize this category under an existing category.</p>
                <DropdownSelect
                  value={parentCategory}
                  onChange={setParentCategory}
                  options={categories.map((c) => c.label)}
                  placeholder="Select parent category"
                  className="mt-1.5"
                />
              </div>
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-lg text-ink">2. Visual Identity</h2>
              <p className="mt-1 text-xs text-ink-muted">Choose how this category will appear in your worldbuilding hub.</p>

              <div className="mt-4">
                <label className="text-sm text-ink">Icon</label>
                <div className="mt-1.5 flex items-center gap-3">
                  <span
                    className="grid size-14 shrink-0 place-items-center rounded-xl border"
                    style={{ borderColor: selectedColor, color: selectedColor }}
                  >
                    <selectedIcon.Icon className="size-6" />
                  </span>
                  <span className="rounded-xl border border-line-strong px-4 py-2.5 text-sm text-ink-muted">
                    Change Icon
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm text-ink">Color Theme</label>
                <p className="mt-0.5 text-xs text-ink-muted">This color will represent the category across the app.</p>
                <div className="mt-2 flex flex-wrap gap-2.5">
                  {COLOR_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Select color ${color}`}
                      onClick={() => setSelectedColor(color)}
                      className="grid size-9 place-items-center rounded-full border-2 transition-transform hover:scale-105"
                      style={{ background: color, borderColor: selectedColor === color ? "var(--ink)" : "transparent" }}
                    >
                      {selectedColor === color && <Check className="size-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm text-ink">
                  Cover Image <span className="text-ink-faint">(Optional)</span>
                </label>
                <p className="mt-0.5 text-xs text-ink-muted">Add a cover image to visually represent this category.</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong py-8 text-center transition-colors hover:border-gold"
                >
                  {coverPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverPreview} alt="Cover preview" className="h-28 rounded-lg object-cover" />
                  ) : (
                    <>
                      <ImagePlus className="size-6 text-ink-faint" strokeWidth={1.5} />
                      <span className="mt-1 text-sm text-ink">Upload image</span>
                      <span className="text-xs text-ink-faint">or drag and drop</span>
                      <span className="text-xs text-ink-faint">JPG, PNG, WebP (max 5MB)</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleCoverPick(e.target.files?.[0])}
                />
              </div>
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-lg text-ink">3. Category Settings</h2>
              <p className="mt-1 text-xs text-ink-muted">Customize how this category behaves in your workspace.</p>

              <div className="mt-4">
                <label className="text-sm text-ink">Default View</label>
                <p className="mt-0.5 text-xs text-ink-muted">Choose the default layout when opening this category.</p>
                <div className="mt-2 grid grid-cols-3 gap-2.5">
                  {DEFAULT_VIEWS.map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setDefaultView(view)}
                      className={`rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                        defaultView === view ? "border-gold text-gold" : "border-line text-ink-muted hover:text-ink"
                      }`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-4 border-t border-line pt-4">
                <ToggleRow
                  title="Visible in Sidebar"
                  detail="Show this category in the main sidebar navigation."
                  checked={visibleInSidebar}
                  onChange={setVisibleInSidebar}
                />
                <ToggleRow
                  title="Allow Subcategories"
                  detail="Allow nested categories under this one."
                  checked={allowSubcategories}
                  onChange={setAllowSubcategories}
                />
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 pb-8">
              <button
                type="button"
                onClick={() => router.push(`/projects/${project.id}/world`)}
                className="text-sm text-ink-muted transition-colors hover:text-ink"
              >
                Cancel
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    checked={createAnother}
                    onChange={(e) => setCreateAnother(e.target.checked)}
                    className="accent-gold"
                  />
                  Create another
                </label>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl border border-line-strong px-4 py-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  Save as Template
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex items-center gap-1.5 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
                >
                  <Plus className="size-3.5" />
                  Create Category
                </button>
              </div>
            </div>
          </div>

          {/* Right rail */}
          <aside className="space-y-6">
            <section className="card p-5">
              <h2 className="font-display text-lg text-ink">Live Preview</h2>
              <p className="mt-1 text-xs text-ink-muted">See how your category will look.</p>
              <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-xl border border-line-strong">
                <LivePreviewArt />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-canvas/40 text-center">
                  <span
                    className="grid size-16 place-items-center rounded-full border-2"
                    style={{ borderColor: selectedColor, color: selectedColor }}
                  >
                    <selectedIcon.Icon className="size-7" />
                  </span>
                  <p className="font-display text-xl text-ink">{name.trim() || "Category Name"}</p>
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                    style={{ color: selectedColor, background: `color-mix(in srgb, ${selectedColor} 18%, transparent)` }}
                  >
                    <span className="size-1.5 rounded-full" style={{ background: selectedColor }} />
                    Worldbuilding Category
                  </span>
                </div>
              </div>
            </section>

            <section className="card p-5">
              <h2 className="font-display text-lg text-ink">Icon Library</h2>
              <p className="mt-1 text-xs text-ink-muted">Choose an icon that best represents this category.</p>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
                <Search className="size-3.5 shrink-0 text-ink-faint" />
                <input
                  value={iconQuery}
                  onChange={(e) => setIconQuery(e.target.value)}
                  placeholder="Search icons..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ICON_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setIconTab(tab)}
                    className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                      iconTab === tab ? "bg-surface-2 text-ink" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-6 gap-1.5">
                {filteredIcons.map((i) => (
                  <button
                    key={i.name}
                    type="button"
                    title={i.name}
                    onClick={() => setSelectedIconName(i.name)}
                    className={`grid aspect-square place-items-center rounded-lg border transition-colors ${
                      selectedIconName === i.name
                        ? "border-gold text-gold"
                        : "border-transparent text-ink-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    <i.Icon className="size-4" />
                  </button>
                ))}
                {filteredIcons.length === 0 && (
                  <p className="col-span-6 py-4 text-center text-xs text-ink-faint">No icons match.</p>
                )}
              </div>
              <button type="button" className="mt-3 flex items-center gap-1 text-sm text-gold hover:opacity-80">
                More Icons
                <Upload className="size-3.5 rotate-45" />
              </button>
            </section>

            <section className="card p-5">
              <h2 className="font-display text-lg text-ink">Suggested Categories</h2>
              <p className="mt-1 text-xs text-ink-muted">Popular categories for your world.</p>
              <ul className="mt-3 space-y-1">
                {SUGGESTED_CATEGORIES.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => setName(s)}
                      className="flex w-full items-center justify-between rounded-lg px-1.5 py-2 text-sm text-ink transition-colors hover:bg-surface-2"
                    >
                      {s}
                      <Plus className="size-3.5 text-ink-faint" />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="mt-2 flex items-center gap-1 text-sm text-gold hover:opacity-80">
                View All Suggestions
                <ChevronLeft className="size-3.5 rotate-180" />
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function LivePreviewArt() {
  return (
    <svg viewBox="0 0 300 225" className="size-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="lp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2a3a" />
          <stop offset="100%" stopColor="#0e0d12" />
        </linearGradient>
      </defs>
      <rect width="300" height="225" fill="url(#lp-sky)" />
      <path d="M 130 225 L 130 140 L 145 140 L 145 120 L 160 120 L 160 140 L 175 140 L 175 225 Z" fill="#100f16" />
      <path d="M 100 225 L 100 170 L 200 170 L 200 225 Z" fill="#151420" />
    </svg>
  );
}

function ToggleRow({
  title,
  detail,
  checked,
  onChange,
}: {
  title: string;
  detail: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
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
