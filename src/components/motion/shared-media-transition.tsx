import { ViewTransition, type ReactNode } from "react";

export type SharedMediaKind = "product" | "room" | "look" | "collection";

export function sharedMediaName(kind: SharedMediaKind, slug: string) {
  return `shared-media-${kind}-${slug}`;
}

export function sharedMediaTransitionType(kind: SharedMediaKind, slug: string) {
  return `${kind}-detail-${slug}`;
}

interface SharedMediaTransitionProps {
  children: ReactNode;
  kind: SharedMediaKind;
  slug: string;
}

export function SharedMediaTransition({
  children,
  kind,
  slug,
}: SharedMediaTransitionProps) {
  return (
    <ViewTransition
      name={sharedMediaName(kind, slug)}
      default="none"
      enter="none"
      exit="none"
      update="none"
      share={{
        [sharedMediaTransitionType(kind, slug)]: "shared-media-share",
        default: "shared-media-share",
      }}
    >
      {children}
    </ViewTransition>
  );
}
