import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { useThemeColor } from "heroui-native";
import type { ViewStyle } from "react-native";
import { ENTRY_DETAIL_HERO_MAX_HEIGHT_PX } from "@/theme/layout-imperative";

type EntryDetailHeroProps = {
  imageUri?: string;
  heroImageStyle: AnimatedStyle<ViewStyle>;
};

/**
 * Hero region: first markdown image or neutral placeholder.
 * Fixed height + overflow hidden; scroll motion is transform-only via `heroImageStyle`.
 */
export function EntryDetailHero({ imageUri, heroImageStyle }: EntryDetailHeroProps) {
  const muted = useThemeColor("muted");
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [imageUri]);

  return (
    <View style={styles.heroRoot}>
      {imageUri && !loadFailed ? (
        <Animated.View style={[StyleSheet.absoluteFill, heroImageStyle]}>
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityLabel="Entry preview image"
            onError={() => setLoadFailed(true)}
          />
        </Animated.View>
      ) : (
        <View
          style={StyleSheet.absoluteFill}
          className="items-center justify-center bg-surface-secondary"
        >
          <MaterialIcons name="image-not-supported" size={48} color={muted} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroRoot: {
    width: "100%",
    position: "relative",
    height: ENTRY_DETAIL_HERO_MAX_HEIGHT_PX,
    overflow: "hidden",
  },
});
