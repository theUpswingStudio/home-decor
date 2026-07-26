import Link from "next/link";
import type { ComponentProps, ComponentPropsWithoutRef } from "react";

type ButtonVariant = "primary" | "secondary";

interface ButtonStyleProps {
  variant?: ButtonVariant;
}

type ButtonProps = ComponentPropsWithoutRef<"button"> & ButtonStyleProps;
type ButtonLinkProps = ComponentProps<typeof Link> & ButtonStyleProps;

function buttonClassName(variant: ButtonVariant, className = "") {
  return `button button--${variant} ${className}`.trim();
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonClassName(variant, className)} {...props} />
  );
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={buttonClassName(variant, className)} {...props} />;
}
