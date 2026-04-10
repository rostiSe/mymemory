import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { useThemeColor } from "heroui-native";
import type { ViewStyle } from "react-native";

type EntryDetailHeroProps = {
  imageUri?: string;
  heroContainerStyle: AnimatedStyle<ViewStyle>;
  heroImageStyle: AnimatedStyle<ViewStyle>;
};

/**
 * Hero region: first markdown image or neutral placeholder. Animated styles come from `useEntryDetailScroll`.
 * Uses absolute positioning so the image fills the animated height (percent/`h-full` heights often break under Reanimated).
 */
export function EntryDetailHero({
  imageUri,
  heroContainerStyle,
  heroImageStyle,
}: EntryDetailHeroProps) {
  const muted = useThemeColor("muted");
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [imageUri]);

  return (
    <Animated.View
      style={[heroContainerStyle, styles.heroRoot]}
    >
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heroRoot: {
    width: "100%",
    position: "relative",
  },
});
