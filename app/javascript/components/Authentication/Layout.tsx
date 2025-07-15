import * as React from "react";

import { useDomains } from "$app/components/DomainSettings";
import { OnboardingPage } from "$app/components/OnboardingPage";

import background from "$assets/images/auth/background.png";

export const Layout = ({ children, header }: { children: React.ReactNode; header: React.ReactNode }) => {
  const { rootDomain, scheme } = useDomains();

  return (
    <OnboardingPage header={header}>
      <main className="squished">
        <header>
          <a href={`${scheme}://${rootDomain}`} className="logo-full" aria-label="Gumroad" />
          {header}
        </header>
        <div>{children}</div>
      </main>
      <aside>
        <img src={background} />
      </aside>
    </OnboardingPage>
  );
};
