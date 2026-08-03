"use client";

import Link from "next/link";
import { useState } from "react";
import { projectEditStore, useProjectEdit } from "@/lib/project-edit";
import styles from "./project-edit-save-action.module.css";

type SaveTarget =
  | { readonly type: "product"; readonly id: string; readonly variantId?: string }
  | { readonly type: "room"; readonly id: string }
  | { readonly type: "material"; readonly id: string };

interface ProjectEditSaveActionProps {
  readonly target: SaveTarget;
  readonly label: string;
  readonly savedLabel?: string;
  readonly className?: string;
}

export function ProjectEditSaveAction({
  target,
  label,
  savedLabel = "In Project Edit",
  className,
}: ProjectEditSaveActionProps) {
  const projectEdit = useProjectEdit();
  const [announcement, setAnnouncement] = useState("");
  const saved = projectEdit.entries.some((entry) => {
    if (target.type === "product") {
      return (
        entry.type === "product" &&
        entry.productId === target.id &&
        (target.variantId === undefined || entry.variantId === target.variantId)
      );
    }
    if (target.type === "room") {
      return entry.type === "room" && entry.roomId === target.id;
    }
    return entry.type === "material" && entry.collectionId === target.id;
  });

  if (saved) {
    return (
      <Link className={`${styles.saved} ${className ?? ""}`} href="/project-edit">
        {savedLabel}
      </Link>
    );
  }

  return (
    <>
      <button
        className={`${styles.action} ${className ?? ""}`}
        type="button"
        disabled={projectEdit.status !== "ready"}
        onClick={() => {
          const result =
            target.type === "product"
              ? projectEditStore.saveProduct(target.id, target.variantId)
              : target.type === "room"
                ? projectEditStore.saveRoom(target.id)
                : projectEditStore.saveMaterial(target.id);

          if (result.changed) {
            setAnnouncement(`${label} saved to Project Edit.`);
          } else if (result.reason === "entry-limit") {
            setAnnouncement("Project Edit is full. Remove an entry before saving another.");
          } else {
            setAnnouncement("This entry is already in Project Edit.");
          }
        }}
      >
        {label}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}
