import React, { useState, createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';

export const SidebarContext = createContext({ collapsed: false, setCollapsed: () => { } });
export const useSidebar = () => useContext(SidebarContext);

const AppLayout = ({ children }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="flex h-[100dvh] overflow-hidden bg-muted/30">
        {/* Desktop Sidebar */}
        <div className={`hidden lg:block shrink-0 z-20 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
          <Sidebar />
        </div>

        {/* Main Content Wrapper */}
        <div className="flex flex-1 flex-col overflow-hidden relative z-10 min-w-0">
          <Header />

          {/* Scrollable Page Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
            <div className="mx-auto max-w-7xl h-full">
              <AnimatePresence mode="wait">
                <React.Fragment key={location.pathname}>
                  {children}
                </React.Fragment>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
};

export default AppLayout;
