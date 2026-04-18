import { SpaceCard } from "@/components/ui/Card/variants/SpaceCard/index";
import { useRelatedSpaces } from "@/features/space/hooks/useRelatedSpaces";
import { router } from "expo-router";
import type { FC } from "react";
import { useCallback } from "react";
import { ScrollView, Text, View } from "react-native";
import { relatedSpacesStripVariants } from "./index.styles";

export type RelatedSpacesStripProps = {
  spaceId: string;
};

export const RelatedSpacesStrip: FC<RelatedSpacesStripProps> =
  function RelatedSpacesStrip({ spaceId }) {
    const { data, isPending, isError } = useRelatedSpaces(spaceId);
    const { section, header } = relatedSpacesStripVariants();

    const onPressCard = useCallback((id: string) => {
      router.push({ pathname: "/space/[id]", params: { id } });
    }, []);

    if (isPending || isError || !data?.length) {
      return null;
    }

    return (
      <View className={section()}>
        <Text className={header()}>Related spaces</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="flex-row items-center gap-2 px-screen"
        >
          {data.map((item) => (
            <View key={item.space.id} className="w-72 max-w-[85vw]">
              <SpaceCard
                withBottomGap={false}
                item={{
                  id: item.space.id,
                  name: item.space.name,
                  description: item.space.description ?? undefined,
                  entryCount: 0,
                  compilationStatus: item.space.compilationStatus,
                  lastCompiledAt:
                    item.space.lastCompiledAt == null
                      ? null
                      : typeof item.space.lastCompiledAt === "string"
                        ? item.space.lastCompiledAt
                        : item.space.lastCompiledAt.toISOString(),
                  origin: item.space.origin ?? "user",
                }}
                sharedPageCount={item.sharedPageCount}
                onPress={onPressCard}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };
