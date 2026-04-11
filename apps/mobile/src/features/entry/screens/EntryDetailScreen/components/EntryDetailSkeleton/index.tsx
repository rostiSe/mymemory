import { View } from "react-native";
import { SkeletonGroup } from "heroui-native";
import { ENTRY_DETAIL_HERO_MAX_HEIGHT_PX } from "@/theme/layout-imperative";

/**
 * Placeholder layout matching entry detail (hero + header + summary card) while the row loads.
 */
export function EntryDetailSkeleton() {
  return (
    <View className="flex-1 bg-background">
      <View
        className="bg-surface-secondary w-full"
        style={{ height: ENTRY_DETAIL_HERO_MAX_HEIGHT_PX }}
      />
      <View className="bg-background -mt-6 flex-1 rounded-t-lg px-(--spacing-screen) pb-8 pt-6">
        <SkeletonGroup isLoading variant="shimmer">
          <View className="gap-4">
            <View className="gap-2">
              <SkeletonGroup.Item className="h-8 w-full rounded-md" />
              <SkeletonGroup.Item className="h-8 w-4/5 rounded-md" />
              <SkeletonGroup.Item className="h-4 w-3/5 rounded-md" />
            </View>
            <View className="bg-surface-secondary gap-3 rounded-2xl p-4">
              <SkeletonGroup.Item className="h-3 w-24 rounded-md" />
              <SkeletonGroup.Item className="h-4 w-full rounded-md" />
              <SkeletonGroup.Item className="h-4 w-full rounded-md" />
              <SkeletonGroup.Item className="h-4 w-11/12 rounded-md" />
            </View>
          </View>
        </SkeletonGroup>
      </View>
    </View>
  );
}
