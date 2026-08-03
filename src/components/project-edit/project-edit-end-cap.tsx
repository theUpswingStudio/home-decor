"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { useProjectEdit } from "@/lib/project-edit";
import styles from "./project-edit-end-cap.module.css";

export function ProjectEditEndCap() {
  const projectEdit = useProjectEdit();
  const hasEntries = projectEdit.status === "ready" && projectEdit.entryCount > 0;

  return (
    <>
      <section className={styles.endCap} aria-labelledby="project-edit-end-title">
        <div className={styles.copy}>
          <h2 id="project-edit-end-title">
            {hasEntries ? "You have the pieces. Now shape the project." : "A catalog is a starting point, not a room plan."}
          </h2>
          <p>
            {hasEntries
              ? `Review ${projectEdit.entryCount} saved ${projectEdit.entryCount === 1 ? "entry" : "entries"} together. Then add the room, priorities, and timing.`
              : "Save products, room directions, and material notes that feel useful. We will keep the edit in this browser."}
          </p>
        </div>
        <div className={styles.actions}>
          <ButtonLink href={hasEntries ? "/project-edit" : "/shop?entry=product"}>
            {hasEntries ? `Review Project Edit (${projectEdit.entryCount})` : "Start a Project Edit"}
          </ButtonLink>
          <ButtonLink href={hasEntries ? "/shop" : "/rooms"} variant="secondary">
            {hasEntries ? "Keep browsing" : "Explore rooms"}
          </ButtonLink>
          <p>
            Portfolio demonstration. Saved entries stay on this device. Nothing
            is reserved, purchased, or sent.
          </p>
        </div>
      </section>
      {hasEntries ? (
        <Link className={styles.mobileDock} href="/project-edit">
          <span>Project Edit</span>
          <span>{projectEdit.entryCount}</span>
        </Link>
      ) : null}
    </>
  );
}
