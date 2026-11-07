import "./spinner.css";

interface ISpinner {
  /** Width and height of the spinner in pixels. */
  size?: number;
  /** Whether to display "Loading..." beneath the spinner. */
  withText?: boolean;
}

/** Spinning loading placeholder. */
const Spinner = ({ size = 30, withText = true, text, ...props }: ISpinner) => (
  <div space={2} justifyContent="center" alignItems="center" {...props}>
    <div className="spinner" style={{ width: size, height: size }}>
      {Array.from(Array(12).keys()).map((i) => <div key={i}>&nbsp;</div>)}
    </div>

    {withText && (
      <p theme="muted" tracking="wide">
        {text || "Loading…"}
      </p>
    )}
  </div>
);

export { Spinner };
