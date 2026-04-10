import { Path, Svg } from "react-native-svg";

type ShareQuickMarkProps = {
  color: string;
  size?: number;
};

/** Wordless mark from `splash-logo-*.svg` (viewBox 0 0 176 176). */
export function ShareQuickMark({ color, size = 72 }: ShareQuickMarkProps) {
  const stroke = {
    stroke: color,
    strokeWidth: 7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 176 176" fill="none">
      <Path d="M42 112L65 64L88 112L111 64L134 112" {...stroke} />
      <Path d="M42 112L88 64" {...stroke} />
      <Path d="M88 112L65 64" {...stroke} />
      <Path d="M88 112L111 64" {...stroke} />
      <Path d="M134 112L88 64" {...stroke} />
    </Svg>
  );
}
