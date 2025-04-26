import React from "react";
import { useLoaderData } from "react-router-dom";
import { cast } from "ts-safe-cast";

import { deleteInstallment, getPublishedInstallments, Pagination, PublishedInstallment } from "$app/data/installments";
import { assertDefined } from "$app/utils/assert";
import { formatStatNumber } from "$app/utils/formatStatNumber";
import { AbortError, assertResponseError } from "$app/utils/request";

import { Button, NavigationButton } from "$app/components/Button";
import { useCurrentSeller } from "$app/components/CurrentSeller";
import { Icon } from "$app/components/Icons";
import { Modal } from "$app/components/Modal";
import { showAlert } from "$app/components/server-components/Alert";
import {
  EditEmailButton,
  EmptyStatePlaceholder,
  Layout,
  NewEmailButton,
  useSearchContext,
  ViewEmailButton,
} from "$app/components/server-components/EmailsPage";
import { useDebouncedCallback } from "$app/components/useDebouncedCallback";
import { useOnChange } from "$app/components/useOnChange";
import { useUserAgentInfo } from "$app/components/UserAgent";

import publishedPlaceholder from "$assets/images/placeholders/published_posts.png";

export const PublishedTab = () => {
  const data = cast<{ installments: PublishedInstallment[]; pagination: Pagination } | undefined>(useLoaderData());
  const [installments, setInstallments] = React.useState(data?.installments ?? []);
  const [pagination, setPagination] = React.useState(data?.pagination ?? { count: 0, next: null });
  const currentSeller = assertDefined(useCurrentSeller(), "currentSeller is required");
  const uid = React.useId();
  const [selectedInstallmentId, setSelectedInstallmentId] = React.useState<string | null>(null);
  const [deletingInstallment, setDeletingInstallment] = React.useState<{
    id: string;
    name: string;
    state: "delete-confirmation" | "deleting";
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const selectedInstallment = selectedInstallmentId
    ? (installments.find((i) => i.external_id === selectedInstallmentId) ?? null)
    : null;

  const [query] = useSearchContext();
  const activeFetchRequest = React.useRef<{ cancel: () => void } | null>(null);

  const fetchInstallments = async ({ reset }: { reset: boolean }) => {
    const nextPage = reset ? 1 : pagination.next;
    if (!nextPage) return;
    setIsLoading(true);
    try {
      activeFetchRequest.current?.cancel();
      const request = getPublishedInstallments({ page: nextPage, query });
      activeFetchRequest.current = request;
      const response = await request.response;
      setInstallments(reset ? response.installments : [...installments, ...response.installments]);
      setPagination(response.pagination);
      activeFetchRequest.current = null;
      setIsLoading(false);
    } catch (e) {
      if (e instanceof AbortError) return;
      activeFetchRequest.current = null;
      setIsLoading(false);
      assertResponseError(e);
      showAlert("Sorry, something went wrong. Please try again.", "error");
    }
  };
  const debouncedFetchInstallments = useDebouncedCallback(
    (options: { reset: boolean }) => void fetchInstallments(options),
    500,
  );

  useOnChange(() => {
    debouncedFetchInstallments({ reset: true });
  }, [query]);

  const handleDelete = async () => {
    if (!deletingInstallment) return;
    try {
      setDeletingInstallment({ ...deletingInstallment, state: "deleting" });
      await deleteInstallment(deletingInstallment.id);
      setInstallments(installments.filter((installment) => installment.external_id !== deletingInstallment.id));
      setDeletingInstallment(null);
      showAlert("Email deleted!", "success");
    } catch (e) {
      assertResponseError(e);
      showAlert("Sorry, something went wrong. Please try again.", "error");
    }
  };

  const userAgentInfo = useUserAgentInfo();

  return (
    <Layout selectedTab="published">
      <div style={{ paddingTop: "var(--spacer-6)" }}>
        {installments.length > 0 ? (
          <>
            <table
              aria-label="Published"
              aria-live="polite"
              aria-busy={isLoading}
              style={{ marginBottom: "var(--spacer-4)" }}
            >
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Emailed</th>
                  <th>Opened</th>
                  <th>Clicks</th>
                  <th>
                    Views{" "}
                    <div
                      className="has-tooltip top"
                      aria-describedby={`views-tooltip-${uid}`}
                      style={{ whiteSpace: "normal" }}
                    >
                      <Icon name="info-circle" />
                      <div role="tooltip" id={`views-tooltip-${uid}`}>
                        Views only apply to emails published on your profile.
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {installments.map((installment) => (
                  <tr
                    key={installment.external_id}
                    aria-selected={installment.external_id === selectedInstallmentId}
                    onClick={() => setSelectedInstallmentId(installment.external_id)}
                  >
                    <td data-label="Subject">{installment.name}</td>
                    <td data-label="Date" style={{ whiteSpace: "nowrap" }}>
                      {new Date(installment.published_at).toLocaleDateString(userAgentInfo.locale, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: currentSeller.timeZone.name,
                      })}
                    </td>
                    <td data-label="Emailed" style={{ whiteSpace: "nowrap" }}>
                      {installment.send_emails ? formatStatNumber({ value: installment.sent_count }) : "n/a"}
                    </td>
                    <td data-label="Opened" style={{ whiteSpace: "nowrap" }}>
                      {installment.send_emails
                        ? formatStatNumber({ value: installment.open_rate, suffix: "%" })
                        : "n/a"}
                    </td>
                    <td data-label="Clicks" style={{ whiteSpace: "nowrap" }}>
                      {installment.clicked_urls.length > 0 ? (
                        <span className="has-tooltip" aria-describedby={`url-clicks-${installment.external_id}`}>
                          {formatStatNumber({ value: installment.click_count })}
                          <div
                            role="tooltip"
                            id={`url-clicks-${installment.external_id}`}
                            style={{ padding: 0, width: "20rem" }}
                          >
                            <table>
                              <tbody>
                                {installment.clicked_urls.map(({ url, count }) => (
                                  <tr key={`${installment.external_id}-${url}`}>
                                    <th
                                      scope="row"
                                      style={{ whiteSpace: "break-spaces", maxWidth: "calc(20rem * 0.7)" }}
                                    >
                                      {url}
                                    </th>
                                    <td>{formatStatNumber({ value: count })}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </span>
                      ) : (
                        formatStatNumber({ value: installment.click_count })
                      )}
                    </td>
                    <td data-label="Views" style={{ whiteSpace: "nowrap" }}>
                      {formatStatNumber({
                        value: installment.view_count,
                        placeholder: "n/a",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination.next ? (
              <Button color="primary" disabled={isLoading} onClick={() => void fetchInstallments({ reset: false })}>
                Load more
              </Button>
            ) : null}
            {selectedInstallment ? (
              <aside>
                <header>
                  <h2>{selectedInstallment.name}</h2>
                  <button className="close" aria-label="Close" onClick={() => setSelectedInstallmentId(null)} />
                </header>
                <table style={{ marginBottom: "var(--spacer-4)", width: "100%" }}>
                  <tbody>
                    <tr>
                      <th style={{ textAlign: "left", width: "40%" }}>Sent</th>
                      <td>
                        {new Date(selectedInstallment.published_at).toLocaleString(userAgentInfo.locale, {
                          timeZone: currentSeller.timeZone.name,
                        })}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left" }}>Emailed</th>
                      <td>
                        {selectedInstallment.send_emails
                          ? formatStatNumber({ value: selectedInstallment.sent_count })
                          : "n/a"}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left" }}>Opened</th>
                      <td>
                        {selectedInstallment.send_emails
                          ? selectedInstallment.open_rate !== null
                            ? `${formatStatNumber({ value: selectedInstallment.open_count })} (${formatStatNumber({ value: selectedInstallment.open_rate, suffix: "%" })})`
                            : formatStatNumber({ value: selectedInstallment.open_rate })
                          : "n/a"}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left" }}>Clicks</th>
                      <td>
                        {selectedInstallment.send_emails
                          ? selectedInstallment.click_rate !== null
                            ? `${formatStatNumber({ value: selectedInstallment.click_count })} (${formatStatNumber({ value: selectedInstallment.click_rate, suffix: "%" })})`
                            : formatStatNumber({ value: selectedInstallment.click_rate })
                          : "n/a"}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left" }}>Bounced</th>
                      <td>4%</td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left" }}>Unsubscribers</th>
                      <td>8</td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left" }}>Post views</th>
                      <td>1,929</td>
                    </tr>
                  </tbody>
                </table>
                {/* Dummy resend data for preview */}
                {[
                  {
                    resent_at: "2025-02-23T12:15:00Z",
                    subject: "ICYM - New bundle brushes ✨",
                    sent_count: 8231,
                    open_count: 120,
                    open_rate: 32,
                    click_count: 300,
                    click_rate: 28,
                    bounced: "2%",
                    unsubscribers: 3,
                    post_views: 900,
                  },
                ].map((resend, idx) => (
                  <table key={idx} style={{ marginBottom: "var(--spacer-4)", width: "100%" }}>
                    <tbody>
                      <tr>
                        <th style={{ textAlign: "left", width: "40%" }}>Resent</th>
                        <td>
                          {new Date(resend.resent_at).toLocaleString(userAgentInfo.locale, {
                            timeZone: currentSeller.timeZone.name,
                          })}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: "left" }}>Subject</th>
                        <td>{resend.subject}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: "left" }}>Emailed</th>
                        <td>{formatStatNumber({ value: resend.sent_count })}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: "left" }}>Opened</th>
                        <td>{`${formatStatNumber({ value: resend.open_count })} (${formatStatNumber({ value: resend.open_rate, suffix: "%" })})`}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: "left" }}>Clicks</th>
                        <td>{`${formatStatNumber({ value: resend.click_count })} (${formatStatNumber({ value: resend.click_rate, suffix: "%" })})`}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: "left" }}>Bounced</th>
                        <td>{resend.bounced}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: "left" }}>Unsubscribers</th>
                        <td>{resend.unsubscribers}</td>
                      </tr>
                      <tr>
                        <th style={{ textAlign: "left" }}>Post views</th>
                        <td>{formatStatNumber({ value: resend.post_views })}</td>
                      </tr>
                    </tbody>
                  </table>
                ))}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--spacer-4)",
                    marginBottom: "var(--spacer-4)",
                  }}
                >
                  <NavigationButton href={`/emails/${selectedInstallment.external_id}/recipients`}>
                    <Icon name="people-fill" />
                    View recipients
                  </NavigationButton>
                  <ViewEmailButton installment={selectedInstallment} />
                  {selectedInstallment.shown_on_profile ? (
                    <NavigationButton href={selectedInstallment.full_url} target="_blank" rel="noopener noreferrer">
                      <Icon name="file-earmark-medical-fill"></Icon>
                      View post
                    </NavigationButton>
                  ) : null}
                </div>
                <div style={{ display: "grid", gridAutoFlow: "column", gap: "var(--spacer-4)" }}>
                  <NewEmailButton copyFrom={selectedInstallment.external_id} />
                  <EditEmailButton id={selectedInstallment.external_id} />
                  <Button
                    color="danger"
                    onClick={() =>
                      setDeletingInstallment({
                        id: selectedInstallment.external_id,
                        name: selectedInstallment.name,
                        state: "delete-confirmation",
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
              </aside>
            ) : null}
            {deletingInstallment ? (
              <Modal
                open
                allowClose={deletingInstallment.state === "delete-confirmation"}
                onClose={() => setDeletingInstallment(null)}
                title="Delete email?"
                footer={
                  <>
                    <Button
                      disabled={deletingInstallment.state === "deleting"}
                      onClick={() => setDeletingInstallment(null)}
                    >
                      Cancel
                    </Button>
                    {deletingInstallment.state === "deleting" ? (
                      <Button color="danger" disabled>
                        Deleting...
                      </Button>
                    ) : (
                      <Button color="danger" onClick={() => void handleDelete()}>
                        Delete email
                      </Button>
                    )}
                  </>
                }
              >
                <h4>
                  Are you sure you want to delete the email "{deletingInstallment.name}"? Customers who had access will
                  no longer be able to see it. This action cannot be undone.
                </h4>
              </Modal>
            ) : null}
          </>
        ) : (
          <EmptyStatePlaceholder
            title="Connect with your customers."
            description="Post new updates, send email broadcasts, and use powerful automated workflows to connect and grow your audience."
            placeholderImage={publishedPlaceholder}
          />
        )}
      </div>
    </Layout>
  );
};
