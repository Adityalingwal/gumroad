import React from "react";

interface MainLayoutProps {
  children: React.ReactNode;
  nav?: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  heroHeader?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  nav,
  header,
  className = "",
  bodyClassName = "",
  heroHeader,
}) => {
  return (
    <div className={`grid grid-cols-1 grid-rows-1 ${bodyClassName}`}>
      {nav}
      {heroHeader && (
        <header className="hero relative z-[20] bg-[var(--body-bg)] border-b border-current/[var(--border-alpha)] col-span-2 row-[-3]">
          <div className="flex flex-wrap gap-1 gap-x-4 items-center sm:flex-nowrap lg:flex-wrap">
            <div className="w-full h-4 sm:hidden lg:block lg:order-1"></div>
            <div className="text-2xl mr-auto">
              {heroHeader}
            </div>
          </div>
        </header>
      )}
      {header && (
        <header className="sticky-top border-b border-current/[var(--border-alpha)] col-span-2 row-[-3] p-4 lg:px-[max((100%-71.25rem)/2,2rem)] lg:py-8 pt-6 pb-6 grid grid-cols-[1fr_auto] items-center gap-4 gap-x-3">
          <div className="col-[1/-1]">
            {header}
          </div>
        </header>
      )}
      <div className={`overflow-auto col-span-1 row-span-1 print:overflow-initial ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default MainLayout;
