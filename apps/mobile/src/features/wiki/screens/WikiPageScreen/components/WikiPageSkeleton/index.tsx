import { ScreenInset } from "@/components/layout/ScreenInset";
import { Card, SkeletonGroup } from "heroui-native";
import { View } from "react-native";

export function WikiPageSkeleton() {
  return (
    <ScreenInset className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <View className="px-screen flex-1 pt-4">
      <SkeletonGroup isLoading variant="shimmer">
        <View className="mb-3 flex-row gap-2">
          <SkeletonGroup.Item className="h-7 w-20 rounded-full" />
          <SkeletonGroup.Item className="h-7 w-16 rounded-full" />
        </View>
        <SkeletonGroup.Item className="mb-2 h-9 w-full rounded-md" />
        <SkeletonGroup.Item className="mb-4 h-4 w-40 rounded-md" />
        <SkeletonGroup.Item className="mb-2 h-10 w-full rounded-md" />
        <SkeletonGroup.Item className="mb-2 h-10 w-full rounded-md" />
        <SkeletonGroup.Item className="mb-6 h-10 w-11/12 rounded-md" />
        <Card className="mb-4 rounded-lg p-0">
          <Card.Body className="gap-2 px-card py-card">
            <SkeletonGroup.Item className="h-5 w-1/2 rounded-md" />
            <SkeletonGroup.Item className="h-4 w-full rounded-md" />
            <SkeletonGroup.Item className="h-4 w-full rounded-md" />
            <SkeletonGroup.Item className="h-4 w-4/5 rounded-md" />
            <View className="mt-2 flex-row gap-2">
              <SkeletonGroup.Item className="h-8 w-16 rounded-full" />
              <SkeletonGroup.Item className="h-8 w-20 rounded-full" />
            </View>
          </Card.Body>
        </Card>
        <Card className="rounded-lg p-0">
          <Card.Body className="gap-2 px-card py-card">
            <SkeletonGroup.Item className="h-5 w-1/3 rounded-md" />
            <SkeletonGroup.Item className="h-4 w-full rounded-md" />
            <SkeletonGroup.Item className="h-4 w-full rounded-md" />
          </Card.Body>
        </Card>
      </SkeletonGroup>
      </View>
    </ScreenInset>
  );
}
