import * as React from "react";

import { useDomains } from "$app/components/DomainSettings";

import background from "$assets/images/auth/background.png";
import OnboardingPage from "$app/components/OnboardingPage";

export const Layout = ({ children, header }: { children: React.ReactNode; header: React.ReactNode }) => {
  const { rootDomain, scheme } = useDomains();

  return (
    <OnboardingPage>
      <main className="mx-auto w-[calc(100%-2*var(--spacer-4))] max-w-[var(--main-stack-width)] [&>*]:border-0">
        <header className="flex items-center justify-between gap-y-[calc(1.5rem+1rem)] pt-4 lg:gap-y-8 lg:pt-8 lg:pb-0">
          <a href={`${scheme}://${rootDomain}`} className="logo-full" aria-label="Gumroad" />
          <div className="actions">{header}</div>
        </header>
        <h1 className="whitespace-normal border-0">{children}</h1>
      </main>
      <aside className="hidden lg:block lg:relative">
        <img src={background} className="absolute top-0 left-0 h-full w-full object-cover" />
      </aside>
    </OnboardingPage>
  );
};
