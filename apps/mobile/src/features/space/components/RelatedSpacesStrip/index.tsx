import { RelatedSpaceCard } from "@/features/space/components/RelatedSpaceCard";
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
            <RelatedSpaceCard
              key={item.space.id}
              item={item}
              onPress={onPressCard}
            />
          ))}
        </ScrollView>
      </View>
    );
  };
