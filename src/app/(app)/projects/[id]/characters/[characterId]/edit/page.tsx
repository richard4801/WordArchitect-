"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCharacter } from "@/lib/character-store";
import { useProject } from "@/lib/project-store";
import { CharacterForm } from "../../new/page";

/** Edit Character — same form as /characters/new, pre-filled and in edit mode. */
export default function EditCharacterPage() {
  const { id, characterId } = useParams<{ id: string; characterId: string }>();
  const project = useProject(id);
  const character = useCharacter(id, characterId);

  if (project && !character) {
    return (
      <div className="grid h-dvh place-items-center text-center">
        <div>
          <p className="font-display text-2xl text-ink">Character not found</p>
          <Link
            href={`/projects/${id}/characters`}
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gold hover:opacity-80"
          >
            <ChevronLeft className="size-4" />
            Back to Characters
          </Link>
        </div>
      </div>
    );
  }

  return <CharacterForm character={character} />;
}
