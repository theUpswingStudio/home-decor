"use client";

import { useProjectEditCount } from "@/lib/project-edit";

interface ProjectEditCountProps {
  readonly className?: string;
}

export function ProjectEditCount({ className }: ProjectEditCountProps) {
  const count = useProjectEditCount();
  return (
    <>
      <span className={className} aria-hidden="true">{count}</span>
      <span className="sr-only">
        Project Edit, {count} {count === 1 ? "entry" : "entries"}
      </span>
    </>
  );
}
