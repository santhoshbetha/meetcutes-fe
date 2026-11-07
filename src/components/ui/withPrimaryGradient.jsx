import React from "react";

/**
 * withPrimaryGradient HOC
 * Wraps a component and ensures the `bg-primary-gradient` utility is applied.
 * It forwards refs and preserves the wrapped component's display name.
 *
 * Usage:
 *   export default withPrimaryGradient(MyComponent);
 */
export default function withPrimaryGradient(WrappedComponent) {
  const WithPrimaryGradient = React.forwardRef(function WithPrimaryGradient(props, ref) {
    const { className = "", ...rest } = props;
    const combined = `bg-primary-gradient ${className}`.trim();
    return <WrappedComponent ref={ref} className={combined} {...rest} />;
  });

  const wrappedName = WrappedComponent.displayName || WrappedComponent.name || "Component";
  WithPrimaryGradient.displayName = `withPrimaryGradient(${wrappedName})`;

  return WithPrimaryGradient;
}
