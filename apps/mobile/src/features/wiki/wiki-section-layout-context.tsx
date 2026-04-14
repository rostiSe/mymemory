import { createContext, useContext } from "react";

export type WikiSectionLayoutHandler = (sectionId: string, y: number) => void;

export const WikiSectionLayoutContext = createContext<
  WikiSectionLayoutHandler | undefined
>(undefined);

export function useWikiSectionLayoutHandler(): WikiSectionLayoutHandler | undefined {
  return useContext(WikiSectionLayoutContext);
}
