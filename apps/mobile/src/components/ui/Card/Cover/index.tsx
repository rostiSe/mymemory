import { Image, type ImageSource } from "expo-image";
import { cn } from "heroui-native";
import { useEffect, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { cardCoverVariants, type CardCoverVariants } from "./index.styles";

export type CardCoverProps = CardCoverVariants & {
  /** Image URI; falsy → placeholder block. Failures fall back to the placeholder. */
  source?: string | ImageSource | null;
  /** Optional override for the placeholder block (e.g. brand logo). */
  fallback?: React.ReactNode;
  /** `expo-image` recyclingKey for FlashList safety; defaults to the URI string. */
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
  const uri = typeof source === "string" ? source : (source?.uri ?? undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const showImage = uri != null && uri.length > 0 && !failed;

  return (
    <View className={cn(cardCoverVariants({ aspect }), className)} style={style}>
      {showImage ? (
        <Image
          source={{ uri }}
          recyclingKey={recyclingKey ?? uri}
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
