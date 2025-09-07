import * as React from "react";

import { useDomains } from "$app/components/DomainSettings";

import background from "$assets/images/auth/background.png";

export const OnboardingPage = ({ children, header }: { children: React.ReactNode; header: React.ReactNode }) => {
  const { rootDomain, scheme } = useDomains();

  return (
    <div className="grid grid-flow-col">
      <main className="squished [&>*]:border-0">
        <header className="flex items-center justify-between gap-y-[calc(2rem+1rem)] pt-4 lg:gap-y-16 lg:pb-0 lg:pt-16 [&_.actions]:col-start-2 [&_.logo-full]:col-start-1">
          <a href={`${scheme}://${rootDomain}`} className="logo-full" aria-label="Gumroad" />
          <div className="actions">{header}</div>
        </header>
        <h1 className="col-span-full whitespace-normal border-0">{children}</h1>
      </main>
      <aside className="hidden lg:relative lg:block">
        <img src={background} className="absolute left-0 top-0 h-full w-full object-cover" />
      </aside>
    </div>
  );
};
