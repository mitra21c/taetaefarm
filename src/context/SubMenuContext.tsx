import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface SubItem {
  label: string;
  img: string;
}

interface SubMenuContextValue {
  subItems: SubItem[];
  selected: SubItem | null;
  setSubMenu: (items: SubItem[]) => void;
  setSelected: (item: SubItem) => void;
  clearSubMenu: () => void;
}

const SubMenuContext = createContext<SubMenuContextValue | null>(null);

export function SubMenuProvider({ children }: { children: ReactNode }) {
  const [subItems, setSubItems] = useState<SubItem[]>([]);
  const [selected, setSelected] = useState<SubItem | null>(null);

  const setSubMenu = useCallback((items: SubItem[]) => {
    setSubItems(items);
    setSelected(items[0] ?? null);
  }, []);

  const clearSubMenu = useCallback(() => {
    setSubItems([]);
    setSelected(null);
  }, []);

  return (
    <SubMenuContext.Provider value={{ subItems, selected, setSubMenu, setSelected, clearSubMenu }}>
      {children}
    </SubMenuContext.Provider>
  );
}

export function useSubMenu() {
  const ctx = useContext(SubMenuContext);
  if (!ctx) throw new Error('useSubMenu must be used inside SubMenuProvider');
  return ctx;
}
