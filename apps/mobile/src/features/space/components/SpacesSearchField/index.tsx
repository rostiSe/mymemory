import { SearchField } from "heroui-native";
import { useEffect, useState } from "react";

const DEBOUNCE_MS = 150;

type SpacesSearchFieldProps = {
  onQueryChange: (trimmed: string) => void;
  className?: string;
};

export function SpacesSearchField({
  onQueryChange,
  className,
}: SpacesSearchFieldProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      onQueryChange(value.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value, onQueryChange]);

  return (
    <SearchField
      value={value}
      onChange={setValue}
      className={className}
      accessibilityLabel="Search spaces"
    >
      <SearchField.Group className="rounded-card border border-border bg-surface">
        <SearchField.SearchIcon />
        <SearchField.Input
          placeholder="Search spaces"
          className="rounded-card"
        />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
}
