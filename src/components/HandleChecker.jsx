export function HandleChecker({
  validity: { minChar, maxChar, firstChar, specialChar },
}) {
  return (
    <div className="password-meter text-left mb-4 mt-3">
      <ul className="text-muted-foreground">
        <HandleCheckerItem
          isValid={minChar && maxChar}
          text="Between 5 and 15 characters"
        />
        <HandleCheckerItem
          isValid={firstChar}
          text="First character of the string should be alphabetic"
        />
        <HandleCheckerItem
          isValid={specialChar}
          text="Should only contain alphanumeric characters and/or underscores (_)"
        />
      </ul>
    </div>
  );
}

const HandleCheckerItem = ({ isValid, text }) => {
  const highlightClass = isValid
    ? "d-none"
    : isValid !== null
      ? "text-red-700"
      : "";
  return <li className={highlightClass}>{text}</li>;
};
