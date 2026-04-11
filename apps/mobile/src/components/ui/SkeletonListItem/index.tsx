import { Card, SkeletonGroup } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";

export type SkeletonListItemLayout = "entry-card" | "space-card";

export type SkeletonListItemProps = {
  layout?: SkeletonListItemLayout;
  children?: ReactNode;
};

function EntryCardSkeleton() {
  return (
    <View className="gap-2 mb-4">
      <SkeletonGroup isLoading variant="shimmer">
        <Card className="dark:bg-surface-secondary rounded-md border dark:border-accent-soft p-0">
          <Card.Body className="gap-2 p-card">
            <View className="flex-row gap-2 items-start justify-between">
              <View className="flex-row items-center gap-2 flex-1">
                <SkeletonGroup.Item className="h-5 w-5 rounded-md shrink-0" />
                <View className="flex-1 gap-2 min-w-0">
                  <SkeletonGroup.Item className="h-4 w-full rounded-md" />
                  <SkeletonGroup.Item className="h-4 w-4/5 rounded-md" />
                </View>
              </View>
              <SkeletonGroup.Item className="h-3 w-14 rounded-md shrink-0" />
            </View>
            <SkeletonGroup.Item className="h-3 w-full rounded-md" />
            <SkeletonGroup.Item className="h-3 w-11/12 rounded-md" />
          </Card.Body>
        </Card>
      </SkeletonGroup>
    </View>
  );
}

function SpaceRowSkeleton() {
  return (
    <View className="mb-2">
      <SkeletonGroup isLoading variant="shimmer">
        <View className="flex-row items-center gap-2 py-2 px-3 rounded-lg bg-surface-secondary">
          <SkeletonGroup.Item className="h-5 w-5 rounded-md" />
          <SkeletonGroup.Item className="h-4 flex-1 rounded-md" />
        </View>
      </SkeletonGroup>
    </View>
  );
}

/**
 * Reusable list-row skeleton layouts (HeroUI Native SkeletonGroup).
 * Pass `layout` for presets or `children` for a fully custom skeleton group.
 */
export function SkeletonListItem({
  layout = "entry-card",
  children,
}: SkeletonListItemProps) {
  if (children) {
    return (
      <View className="mb-4">
        <SkeletonGroup isLoading variant="shimmer">
          {children}
        </SkeletonGroup>
      </View>
    );
  }
  if (layout === "space-card") {
    return <SpaceRowSkeleton />;
  }
  return <EntryCardSkeleton />;
}
