import type { ReactNode } from "react";

interface SectionHeadingProps {
  title: string;
  description?: string;
  action?: ReactNode;
  level?: "h1" | "h2";
  className?: string;
}

export function SectionHeading({
  title,
  description,
  action,
  level = "h2",
  className = "",
}: SectionHeadingProps) {
  const Heading = level;

  return (
    <div className={`section-heading ${className}`.trim()}>
      <div className="section-heading__copy">
        <Heading className="section-heading__title">{title}</Heading>
        {description ? (
          <p className="section-heading__description">{description}</p>
        ) : null}
      </div>
      {action ? <div className="section-heading__action">{action}</div> : null}
    </div>
  );
}
