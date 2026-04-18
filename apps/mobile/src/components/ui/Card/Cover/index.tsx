import { Image, type ImageProps, type ImageSource } from "expo-image";
import { cn } from "heroui-native";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { cardCoverVariants, type CardCoverVariants } from "./index.styles";

/** URI string for reset keys and recycling fallbacks; does not replace full `source` on `<Image>`. */
function uriFromSource(source: ImageProps["source"] | null | undefined): string | undefined {
  if (source == null) return undefined;
  if (typeof source === "string") return source;
  if (typeof source === "number") return undefined;
  if (Array.isArray(source)) {
    const first = source[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "uri" in first) {
      return (first as ImageSource).uri ?? undefined;
    }
    return undefined;
  }
  if (typeof source === "object" && "uri" in source) {
    return (source as ImageSource).uri ?? undefined;
  }
  return undefined;
}

function hasRenderableSource(source: ImageProps["source"] | null | undefined): boolean {
  if (source == null) return false;
  if (typeof source === "string") return source.length > 0;
  if (typeof source === "number") return true;
  if (Array.isArray(source)) return source.length > 0;
  if (typeof source === "object") {
    const s = source as ImageSource;
    return (
      (s.uri != null && s.uri.length > 0) || !!s.blurhash || !!s.thumbhash
    );
  }
  return false;
}

/**
 * When `uri` is missing (e.g. `require()` number, blurhash-only, or array without
 * string URI yet), still yield a stable string for FlashList recycling.
 */
function recyclingKeyExtra(
  source: ImageProps["source"] | null | undefined,
): string | undefined {
  if (source == null) return undefined;
  if (typeof source === "number") return String(source);
  if (Array.isArray(source) && source.length > 0) {
    const first = source[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const f = first as ImageSource;
      return f.cacheKey ?? f.uri ?? f.blurhash ?? f.thumbhash ?? undefined;
    }
    return undefined;
  }
  if (typeof source === "object" && !Array.isArray(source)) {
    const o = source as ImageSource;
    return o.cacheKey ?? o.blurhash ?? o.thumbhash ?? undefined;
  }
  return undefined;
}

export type CardCoverProps = CardCoverVariants & {
  /** Passed through to `expo-image` (URL string, `ImageSource`, `require()`, arrays, etc.). */
  source?: ImageProps["source"];
  /** Optional override for the placeholder block (e.g. brand logo). */
  fallback?: ReactNode;
  /** `expo-image` recyclingKey for FlashList safety; defaults from URI / cache / hash / numeric id. */
  recyclingKey?: string;
  /** Optional override for the card cover container. */
  className?: string;
  /** Merged onto the outer slot (e.g. fixed height when `aspect="fill"`). */
  style?: StyleProp<ViewStyle>;
};

/**
 * Image cover slot for `Card.Root`. Default `aspect` ratios reserve height from width;
 * use `aspect="fill"` plus an explicit height (`style` / `className`) for a fixed strip
 * where the image crops with `contentFit="cover"`.
 */
export function CardCover({
  source,
  fallback,
  aspect,
  recyclingKey,
  className,
  style,
}: CardCoverProps) {
  const uri = uriFromSource(source);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const showImage = hasRenderableSource(source) && !failed;

  const recyclingKeyResolved =
    recyclingKey ?? uri ?? recyclingKeyExtra(source);

  return (
    <View className={cn(cardCoverVariants({ aspect }), className)} style={style}>
      {showImage && source != null ? (
        <Image
          source={source}
          recyclingKey={recyclingKeyResolved}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          placeholderContentFit="cover"
          transition={200}
          accessibilityIgnoresInvertColors
          onError={() => setFailed(true)}
        />
      ) : (
        fallback
      )}
    </View>
  );
}
