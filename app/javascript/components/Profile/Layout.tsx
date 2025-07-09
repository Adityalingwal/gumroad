import cx from "classnames";
import * as React from "react";

import { CreatorProfile } from "$app/parsers/profile";

import { NavigationButton } from "$app/components/Button";
import { CartNavigationButton } from "$app/components/Checkout/CartNavigationButton";
import { useCartItemsCount } from "$app/components/Checkout/useCartItemsCount";
import { useDomains } from "$app/components/DomainSettings";
import { Icon } from "$app/components/Icons";
import { useLoggedInUser } from "$app/components/LoggedInUser";

import { FollowForm } from "./FollowForm";

type Props = {
  className?: string;
  creatorProfile: CreatorProfile;
  hideFollowForm?: boolean;
  children?: React.ReactNode;
};

export const Layout = ({ className, creatorProfile, hideFollowForm, children }: Props) => {
  const cartItemsCount = useCartItemsCount();
  const { rootDomain } = useDomains();
  const loggedInUser = useLoggedInUser();

  const isReader = className?.includes("reader");

  return (
    <div className={cx("profile grid grid-rows-[auto_1fr] min-h-full", className)}>
      <header className="text-base grid grid-cols-1 lg:grid-flow-col lg:gap-6 lg:px-[max((100%-71.25rem)/2,2rem)] lg:py-5 lg:items-center lg:border-b lg:border-current/[var(--border-alpha)]">
        <section className="flex items-center gap-3 border-b border-current/[var(--border-alpha)] p-4 lg:border-0 lg:p-0">
          {(loggedInUser?.isGumroadAdmin || loggedInUser?.isImpersonating) &&
          creatorProfile.external_id !== loggedInUser.id ? (
            <NavigationButton
              style={{ position: "absolute", left: "var(--spacer-3)" }}
              color="filled"
              href={Routes.admin_impersonate_url({ user_identifier: creatorProfile.external_id })}
            >
              Impersonate
            </NavigationButton>
          ) : null}
          <img className="user-avatar" src={creatorProfile.avatar_url} alt="Profile Picture" />
          <a href={Routes.root_path()} style={{ textDecoration: "none" }}>
            {creatorProfile.name}
          </a>
        </section>
        {!hideFollowForm ? (
          <section className="flex items-center gap-3 border-b border-current/[var(--border-alpha)] p-4 col-span-2 lg:border-0 lg:p-0 lg:row-auto lg:col-auto">
            <FollowForm creatorProfile={creatorProfile} />
          </section>
        ) : null}
        {creatorProfile.twitter_handle || cartItemsCount ? (
          <section className="flex items-center gap-3 border-b border-current/[var(--border-alpha)] p-4 row-[1] col-[2] lg:border-0 lg:p-0 lg:row-auto lg:col-auto">
            {creatorProfile.twitter_handle ? (
              <NavigationButton outline href={`https://twitter.com/${creatorProfile.twitter_handle}`} target="_blank">
                <Icon name="twitter" />
              </NavigationButton>
            ) : null}
            <CartNavigationButton />
          </section>
        ) : null}
      </header>
      <main className={cx("custom-sections", isReader && "reader")}>
        <div className={isReader ? "lg:pr-[max((100%-50rem)-2rem,2rem)]" : ""}>
          {children}
        </div>
        <footer className="lg:px-[max((100%-71.25rem)/2,2rem)] lg:py-5 lg:text-left">
          Powered by&ensp;
          <a href={Routes.root_url({ host: rootDomain })} className="logo-full" aria-label="Gumroad" />
        </footer>
      </main>
    </div>
  );
};

export default Layout;
