import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ScrollContextType {
  navBarOpacity: number;
  setNavBarOpacity: (opacity: number) => void;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export const ScrollProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [navBarOpacity, setNavBarOpacity] = useState(1);

  return (
    <ScrollContext.Provider value={{ navBarOpacity, setNavBarOpacity }}>
      {children}
    </ScrollContext.Provider>
  );
};

export const useScroll = () => {
  const context = useContext(ScrollContext);
  if (!context) {
    // Return default value if context is not available
    return { navBarOpacity: 1, setNavBarOpacity: () => {} };
  }
  return context;
};

