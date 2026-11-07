import React from "react";

/**
 * PrimaryGradient
 * Simple wrapper that applies the `bg-primary-gradient` utility and forwards props.
 * Usage: <PrimaryGradient as="section" className="p-6">...</PrimaryGradient>
 */
export default function PrimaryGradient({ as = "div", className = "", children, ...props }) {
  const Component = as;
  const combined = `bg-primary-gradient ${className}`.trim();
  return (
    <Component className={combined} {...props}>
      {children}
    </Component>
  );
}

