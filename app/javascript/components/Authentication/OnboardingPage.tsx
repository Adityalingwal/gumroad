import * as React from "react";

import { useDomains } from "$app/components/DomainSettings";

import background from "$assets/images/auth/background.png";

export const OnboardingPage = ({ header, children }: { header: React.ReactNode; children: React.ReactNode }) => {
  const { rootDomain, scheme } = useDomains();
  return (
    <div className="scoped-tailwind-preflight grid min-h-screen lg:grid-flow-col">
      <main className="mx-auto w-full max-w-lg px-4 pt-4 sm:px-6 lg:pt-8">
        <header className="grid gap-4 lg:gap-8">
          <a href={`${scheme}://${rootDomain}`} className="logo-full" aria-label="Gumroad" />
          {header}
        </header>
        <div>{children}</div>
      </main>
      <aside className="relative hidden lg:block">
        <img src={background} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </aside>
    </div>
  );
};
