import cx from "classnames";
import * as React from "react";
import { Link, useLoaderData, useNavigate, useRevalidator } from "react-router-dom";
import { cast } from "ts-safe-cast";

import {
  WorkflowFormContext,
  Workflow,
  WorkflowType,
  createWorkflow,
  LegacyWorkflowTrigger,
  updateWorkflow,
  SaveActionName,
  ProductOption,
  VariantOption,
} from "$app/data/workflows";
import { asyncVoid } from "$app/utils/promise";
import { assertResponseError } from "$app/utils/request";

import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";
import { NumberInput } from "$app/components/NumberInput";
import { showAlert } from "$app/components/server-components/Alert";
import {
  Layout,
  EditPageNavigation,
  sendToPastCustomersCheckboxLabel,
  PublishButton,
} from "$app/components/server-components/WorkflowsPage";
import { TagInput } from "$app/components/TagInput";
import { WithTooltip } from "$app/components/WithTooltip";

import abandonedCartTriggerImage from "$assets/images/workflows/triggers/abandoned_cart.svg";
import audienceTriggerImage from "$assets/images/workflows/triggers/audience.svg";
import memberCancelsTriggerImage from "$assets/images/workflows/triggers/member_cancels.svg";
import newAffiliateTriggerImage from "$assets/images/workflows/triggers/new_affiliate.svg";
import newSubscriberTriggerImage from "$assets/images/workflows/triggers/new_subscriber.svg";
import purchaseTriggerImage from "$assets/images/workflows/triggers/purchase.svg";

// "legacy_audience" is for backwards compatibility and is only shown while editing an existing workflow of that type
export type WorkflowTrigger =
  | "legacy_audience"
  | "purchase"
  | "new_subscriber"
  | "member_cancels"
  | "new_affiliate"
  | "abandoned_cart";

export const determineWorkflowTrigger = (workflow: Workflow): WorkflowTrigger => {
  if (workflow.workflow_type === "abandoned_cart") return "abandoned_cart";
  if (workflow.workflow_type === "audience") return "legacy_audience";
  if (workflow.workflow_type === "follower") return "new_subscriber";
  if (workflow.workflow_type === "affiliate") return "new_affiliate";
  if (workflow.workflow_trigger === "member_cancellation") return "member_cancels";
  return "purchase";
};

const determineWorkflowType = (
  trigger: WorkflowTrigger,
  boughtItems: (ProductOption | VariantOption)[],
): WorkflowType => {
  if (trigger === "abandoned_cart") return "abandoned_cart";
  if (trigger === "legacy_audience") return "audience";
  if (trigger === "new_subscriber") return "follower";
  if (trigger === "new_affiliate") return "affiliate";
  if (boughtItems.length === 1) return boughtItems[0]?.type === "variant" ? "variant" : "product";
  return "seller";
};

const selectableProductAndVariantOptions = (
  options: WorkflowFormContext["products_and_variant_options"],
  alwaysIncludeIds: string[],
) => options.filter((o) => alwaysIncludeIds.includes(o.id) || !o.archived);

type WorkflowFormState = {
  name: string;
  trigger: WorkflowTrigger;
  sendToPastCustomers: boolean;
  affiliatedProducts: string[];
  bought: string[];
  notBought: string[];
  paidMoreThan: number | null;
  paidLessThan: number | null;
  afterDate: string;
  beforeDate: string;
  fromCountry: string;
};
const WorkflowForm = () => {
  const navigate = useNavigate();
  const { context, workflow } = cast<{ context: WorkflowFormContext; workflow?: Workflow }>(useLoaderData());
  const loaderDataRevalidator = useRevalidator();
  const wasPublishedPreviously = !!workflow?.first_published_at;
  const [formState, setFormState] = React.useState<WorkflowFormState>(() => {
    if (!workflow)
      return {
        name: "",
        trigger: "purchase",
        sendToPastCustomers: false,
        affiliatedProducts: [],
        bought: [],
        notBought: [],
        paidMoreThan: null,
        paidLessThan: null,
        afterDate: "",
        beforeDate: "",
        fromCountry: "",
      };

    const bought =
      workflow.workflow_type === "variant" && workflow.variant_external_id
        ? [workflow.variant_external_id]
        : workflow.workflow_type === "product" && workflow.unique_permalink
          ? [workflow.unique_permalink]
          : [...(workflow.bought_products ?? []), ...(workflow.bought_variants ?? [])];
    return {
      name: workflow.name,
      trigger: determineWorkflowTrigger(workflow),
      sendToPastCustomers: workflow.send_to_past_customers,
      affiliatedProducts: workflow.affiliate_products ?? [],
      bought,
      notBought: workflow.not_bought_products || workflow.not_bought_variants || [],
      paidMoreThan: workflow.paid_more_than ? parseInt(workflow.paid_more_than.replaceAll(",", ""), 10) : null,
      paidLessThan: workflow.paid_less_than ? parseInt(workflow.paid_less_than.replaceAll(",", ""), 10) : null,
      afterDate: workflow.created_after ?? "",
      beforeDate: workflow.created_before ?? "",
      fromCountry: workflow.bought_from ?? "",
    };
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const [invalidFields, setInvalidFields] = React.useState<Set<keyof WorkflowFormState>>(() => new Set());
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const paidMoreThanInputRef = React.useRef<HTMLInputElement>(null);
  const afterDateInputRef = React.useRef<HTMLInputElement>(null);

  const triggerSupportsBoughtFilter = formState.trigger !== "legacy_audience" && formState.trigger !== "new_affiliate";
  const triggerSupportsNotBoughtFilter =
    formState.trigger === "legacy_audience" ||
    formState.trigger === "purchase" ||
    formState.trigger === "new_subscriber" ||
    formState.trigger === "abandoned_cart";
  const triggerSupportsDateFilters = formState.trigger !== "abandoned_cart";
  const triggerSupportsPaidFilters = formState.trigger === "purchase" || formState.trigger === "member_cancels";
  const triggerSupportsFromCountryFilter = formState.trigger === "purchase" || formState.trigger === "member_cancels";

  const updateFormState = (value: Partial<WorkflowFormState>) => {
    const updatedInvalidFields = new Set(invalidFields);

    Object.keys(value).forEach((field) => {
      if (!updatedInvalidFields.has(field)) return;
      if (field === "paidMoreThan" || field === "paidLessThan") {
        updatedInvalidFields.delete("paidMoreThan");
        updatedInvalidFields.delete("paidLessThan");
      } else if (field === "afterDate" || field === "beforeDate") {
        updatedInvalidFields.delete("afterDate");
        updatedInvalidFields.delete("beforeDate");
      } else {
        updatedInvalidFields.delete(field);
      }
    });

    setFormState((prev) => ({ ...prev, ...value }));
    setInvalidFields(updatedInvalidFields);
  };

  const validate = () => {
    const invalidFieldNames = new Set<keyof WorkflowFormState>();
    const invalidFieldRefs = [];

    if (formState.name.trim() === "") {
      invalidFieldNames.add("name");
      invalidFieldRefs.push(nameInputRef);
    }

    if (wasPublishedPreviously) return invalidFieldNames.size === 0;

    if (
      triggerSupportsPaidFilters &&
      formState.paidMoreThan &&
      formState.paidLessThan &&
      formState.paidMoreThan > formState.paidLessThan
    ) {
      invalidFieldNames.add("paidMoreThan");
      invalidFieldNames.add("paidLessThan");
      invalidFieldRefs.push(paidMoreThanInputRef);
    }

    if (
      triggerSupportsDateFilters &&
      formState.afterDate &&
      formState.beforeDate &&
      new Date(formState.afterDate) > new Date(formState.beforeDate)
    ) {
      invalidFieldNames.add("afterDate");
      invalidFieldNames.add("beforeDate");
      invalidFieldRefs.push(afterDateInputRef);
    }

    setInvalidFields(invalidFieldNames);

    invalidFieldRefs[0]?.current?.focus();

    return invalidFieldNames.size === 0;
  };

  const handleSave = asyncVoid(async (saveActionName: SaveActionName = "save") => {
    if (!validate()) return;

    const boughtItems = formState.bought.flatMap(
      (itemId) => context.products_and_variant_options.find(({ id }) => itemId === id) ?? [],
    );
    const workflowType = determineWorkflowType(formState.trigger, boughtItems);
    const workflowTrigger: LegacyWorkflowTrigger =
      formState.trigger === "member_cancels" ? "member_cancellation" : null;
    const productPermalink =
      workflowType === "product" || workflowType === "variant" ? (boughtItems[0]?.product_permalink ?? null) : null;
    const variantId = workflowType === "variant" ? (boughtItems[0]?.id ?? null) : null;
    const bought = triggerSupportsBoughtFilter
      ? boughtItems.reduce(
          (acc: { productIds: string[]; variantIds: string[] }, item) => {
            acc[item.type === "variant" ? "variantIds" : "productIds"].push(item.id);
            return acc;
          },
          { productIds: [], variantIds: [] },
        )
      : { productIds: [], variantIds: [] };
    const notBought = triggerSupportsNotBoughtFilter
      ? formState.notBought.reduce(
          (acc: { productIds: string[]; variantIds: string[] }, itemId) => {
            const item = context.products_and_variant_options.find(({ id }) => itemId === id);
            if (item) acc[item.type === "variant" ? "variantIds" : "productIds"].push(item.id);
            return acc;
          },
          { productIds: [], variantIds: [] },
        )
      : { productIds: [], variantIds: [] };
    const payload = {
      name: formState.name,
      workflow_type: workflowType,
      workflow_trigger: workflowTrigger,
      bought_products: bought.productIds,
      bought_variants: bought.variantIds,
      variant_external_id: variantId,
      permalink: productPermalink,
      not_bought_products: notBought.productIds,
      not_bought_variants: notBought.variantIds,
      paid_more_than: triggerSupportsPaidFilters ? formState.paidMoreThan : null,
      paid_less_than: triggerSupportsPaidFilters ? formState.paidLessThan : null,
      created_after: triggerSupportsDateFilters ? formState.afterDate : "",
      created_before: triggerSupportsDateFilters ? formState.beforeDate : "",
      bought_from: triggerSupportsFromCountryFilter ? formState.fromCountry : null,
      affiliate_products: formState.trigger === "new_affiliate" ? formState.affiliatedProducts : [],
      send_to_past_customers: formState.sendToPastCustomers,
      save_action_name: saveActionName,
    };

    try {
      setIsSaving(true);
      const response = await (workflow ? updateWorkflow(workflow.external_id, payload) : createWorkflow(payload));
      if (response.success) {
        if (saveActionName === "save") {
          showAlert("Changes saved!", "success");
          navigate(`/workflows/${response.workflow_id}/emails`);
        } else {
          showAlert(saveActionName === "save_and_publish" ? "Workflow published!" : "Unpublished!", "success");
          loaderDataRevalidator.revalidate();
        }
      } else {
        showAlert(response.message, "error");
      }
    } catch (e) {
      assertResponseError(e);
      showAlert("Sorry, something went wrong. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  });

  const abandonedCartButton = (
    <Button
      className="vertical"
      role="radio"
      disabled={wasPublishedPreviously || !context.eligible_for_abandoned_cart_workflows}
      aria-checked={formState.trigger === "abandoned_cart"}
      onClick={() => updateFormState({ trigger: "abandoned_cart" })}
    >
      <img src={abandonedCartTriggerImage} width={40} height={40} />
      <div>
        <h4>Abandoned cart</h4>A customer doesn't complete checking out
      </div>
    </Button>
  );

  return (
    <Layout
      title={workflow ? workflow.name : "New workflow"}
      navigation={workflow ? <EditPageNavigation workflowExternalId={workflow.external_id} /> : null}
      actions={
        <>
          <Link to="/workflows" className="button" inert={isSaving}>
            <Icon name="x-square" />
            Cancel
          </Link>
          <Button color="primary" onClick={() => handleSave()} disabled={isSaving}>
            {workflow ? "Save changes" : "Save and continue"}
          </Button>
          {workflow ? (
            <PublishButton
              isPublished={workflow.published}
              wasPublishedPreviously={wasPublishedPreviously}
              isDisabled={isSaving}
              sendToPastCustomers={
                formState.trigger === "abandoned_cart"
                  ? null
                  : {
                      enabled: formState.sendToPastCustomers,
                      toggle: (value) => updateFormState({ sendToPastCustomers: value }),
                      label: sendToPastCustomersCheckboxLabel(formState.trigger),
                    }
              }
              onClick={handleSave}
            />
          ) : null}
        </>
      }
    >
      <form>
        <section>
          <header>Workflows allow you to send scheduled emails to a subset of your audience based on a trigger.</header>
          <fieldset className={cx({ danger: invalidFields.has("name") })}>
            <legend>
              <label htmlFor="name">Name</label>
            </legend>
            <input
              id="name"
              type="text"
              ref={nameInputRef}
              placeholder="Name of workflow"
              maxLength={255}
              value={formState.name}
              onChange={(e) => updateFormState({ name: e.target.value })}
            />
          </fieldset>
          <fieldset>
            <legend>
              <label htmlFor="trigger">Trigger</label>
            </legend>
            <div
              className="radio-buttons"
              role="radiogroup"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))",
              }}
            >
              {workflow && workflow.workflow_type === "audience" ? (
                <Button
                  className="vertical"
                  role="radio"
                  disabled={wasPublishedPreviously}
                  aria-checked={formState.trigger === "legacy_audience"}
                  onClick={() => updateFormState({ trigger: "legacy_audience" })}
                >
                  <img src={audienceTriggerImage} width={40} height={40} />
                  <div>
                    <h4>Audience</h4>A user becomes a customer, subscriber or an affiliate
                  </div>
                </Button>
              ) : null}
              <Button
                className="vertical"
                role="radio"
                disabled={wasPublishedPreviously}
                aria-checked={formState.trigger === "purchase"}
                onClick={() => updateFormState({ trigger: "purchase" })}
              >
                <img src={purchaseTriggerImage} width={40} height={40} />
                <div>
                  <h4>Purchase</h4>A customer purchases your product
                </div>
              </Button>
              <Button
                className="vertical"
                role="radio"
                disabled={wasPublishedPreviously}
                aria-checked={formState.trigger === "new_subscriber"}
                onClick={() => updateFormState({ trigger: "new_subscriber" })}
              >
                <img src={newSubscriberTriggerImage} width={40} height={40} />
                <div>
                  <h4>New subscriber</h4>A user subscribes to your email list
                </div>
              </Button>
              <Button
                className="vertical"
                role="radio"
                disabled={wasPublishedPreviously}
                aria-checked={formState.trigger === "member_cancels"}
                onClick={() => updateFormState({ trigger: "member_cancels" })}
              >
                <img src={memberCancelsTriggerImage} width={40} height={40} style={{ objectFit: "contain" }} />
                <div>
                  <h4>Member cancels</h4>A membership product subscriber cancels
                </div>
              </Button>
              <Button
                className="vertical"
                role="radio"
                disabled={wasPublishedPreviously}
                aria-checked={formState.trigger === "new_affiliate"}
                onClick={() => updateFormState({ trigger: "new_affiliate" })}
              >
                <img src={newAffiliateTriggerImage} width={40} height={40} style={{ objectFit: "contain" }} />
                <div>
                  <h4>New affiliate</h4>A user becomes an affiliate of yours
                </div>
              </Button>
              {context.eligible_for_abandoned_cart_workflows ? (
                abandonedCartButton
              ) : (
                <WithTooltip tip="You must have at least one completed payout to create abandoned cart workflows">
                  {abandonedCartButton}
                </WithTooltip>
              )}
            </div>
            {wasPublishedPreviously || formState.trigger === "abandoned_cart" ? null : (
              <label>
                <input
                  type="checkbox"
                  checked={formState.sendToPastCustomers}
                  onChange={(e) => updateFormState({ sendToPastCustomers: e.target.checked })}
                />
                {sendToPastCustomersCheckboxLabel(formState.trigger)}
              </label>
            )}
          </fieldset>
          <div style={{ marginBottom: "var(--spacer-4)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "var(--spacer-3)",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "normal" }}>Recipients</h3>
              <Button small outline>
                <Icon name="solid-star" />
                Generate with AI
              </Button>
            </div>

            <div style={{ marginBottom: "var(--spacer-3)" }}>
              <select
                style={{
                  width: "100%",
                  padding: "var(--spacer-2) var(--spacer-3)",
                  border: "1px solid black",
                  borderRadius: "var(--border-radius)",
                  background: "white",
                  appearance: "none",
                }}
                disabled={wasPublishedPreviously}
                value="customers"
              >
                <option value="customers">Customers</option>
              </select>
            </div>
          </div>

          {/* First Filter Group */}
          <div
            style={{
              border: "1px solid black",
              borderRadius: "var(--border-radius)",
              padding: "var(--spacer-4)",
              marginBottom: "var(--spacer-3)",
              background: "white",
            }}
          >
            {/* Date Filter Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
                gap: "var(--spacer-2)",
                alignItems: "center",
                marginBottom: "var(--spacer-3)",
              }}
            >
              <div
                style={{
                  padding: "var(--spacer-2) var(--spacer-3)",
                  border: "1px solid black",
                  borderRadius: "var(--border-radius)",
                }}
              >
                Where
              </div>
              <select
                style={{
                  padding: "var(--spacer-2) var(--spacer-3)",
                  border: "1px solid black",
                  borderRadius: "var(--border-radius)",
                  background: "white",
                  appearance: "none",
                }}
              >
                <option>Date</option>
              </select>
              <select
                style={{
                  padding: "var(--spacer-2) var(--spacer-3)",
                  border: "1px solid black",
                  borderRadius: "var(--border-radius)",
                  background: "white",
                  appearance: "none",
                }}
              >
                <option>Purchase</option>
              </select>
              <select
                style={{
                  padding: "var(--spacer-2) var(--spacer-3)",
                  border: "1px solid black",
                  borderRadius: "var(--border-radius)",
                  background: "white",
                  appearance: "none",
                }}
              >
                <option>Is after</option>
              </select>
              <Button className="icon-only" small>
                <Icon name="trash2" />
              </Button>
            </div>

            <div style={{ marginBottom: "var(--spacer-3)" }}>
              <input
                type="date"
                placeholder="dd/mm/yyyy"
                style={{
                  width: "100%",
                  padding: "var(--spacer-2) var(--spacer-3)",
                  border: "1px solid black",
                  borderRadius: "var(--border-radius)",
                }}
                value={formState.afterDate}
                onChange={(e) => updateFormState({ afterDate: e.target.value })}
                disabled={wasPublishedPreviously}
              />
            </div>

            {/* Product Filter Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
                gap: "var(--spacer-2)",
                alignItems: "center",
                marginBottom: "var(--spacer-3)",
              }}
            >
              <div
                style={{
                  padding: "var(--spacer-2) var(--spacer-3)",
                  border: "1px solid black",
                  borderRadius: "var(--border-radius)",
                }}
              >
                And
              </div>
              <select
                style={{
                  padding: "var(--spacer-2) var(--spacer-3)",
                  border: "1px solid black",
                  borderRadius: "var(--border-radius)",
                  background: "white",
                  appearance: "none",
                }}
              >
                <option>Product</option>
              </select>
              <select
                style={{
                  padding: "var(--spacer-2) var(--spacer-3)",
                  border: "1px solid black",
                  borderRadius: "var(--border-radius)",
                  background: "white",
                  appearance: "none",
                }}
              >
                <option>Has bought</option>
              </select>
              <select
                style={{
                  padding: "var(--spacer-2) var(--spacer-3)",
                  border: "1px solid black",
                  borderRadius: "var(--border-radius)",
                  background: "white",
                  appearance: "none",
                }}
              >
                <option>All</option>
              </select>
              <Button className="icon-only" small>
                <Icon name="trash2" />
              </Button>
            </div>

            {/* Product Tags */}
            <div style={{ marginBottom: "var(--spacer-3)" }}>
              <TagInput
                placeholder="Any product"
                isDisabled={wasPublishedPreviously}
                tagIds={formState.bought}
                tagList={selectableProductAndVariantOptions(context.products_and_variant_options, formState.bought)}
                onChangeTagIds={(bought) => updateFormState({ bought })}
              />
            </div>

            {/* Not Bought Filter Row */}
            {triggerSupportsNotBoughtFilter ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
                    gap: "var(--spacer-2)",
                    alignItems: "center",
                    marginBottom: "var(--spacer-3)",
                  }}
                >
                  <div
                    style={{
                      padding: "var(--spacer-2) var(--spacer-3)",
                      border: "1px solid black",
                      borderRadius: "var(--border-radius)",
                    }}
                  >
                    And
                  </div>
                  <select
                    style={{
                      padding: "var(--spacer-2) var(--spacer-3)",
                      border: "1px solid black",
                      borderRadius: "var(--border-radius)",
                      background: "white",
                      appearance: "none",
                    }}
                  >
                    <option>Product</option>
                  </select>
                  <select
                    style={{
                      padding: "var(--spacer-2) var(--spacer-3)",
                      border: "1px solid black",
                      borderRadius: "var(--border-radius)",
                      background: "white",
                      appearance: "none",
                    }}
                  >
                    <option>Has not yet bought</option>
                  </select>
                  <select
                    style={{
                      padding: "var(--spacer-2) var(--spacer-3)",
                      border: "1px solid black",
                      borderRadius: "var(--border-radius)",
                      background: "white",
                      appearance: "none",
                    }}
                  >
                    <option>Any</option>
                  </select>
                  <Button className="icon-only" small>
                    <Icon name="trash2" />
                  </Button>
                </div>

                {/* Not Bought Tags */}
                <div style={{ marginBottom: "var(--spacer-3)" }}>
                  <div style={{ display: "flex", gap: "var(--spacer-2)", flexWrap: "wrap" }}>
                    {formState.notBought.map((itemId) => {
                      const item = context.products_and_variant_options.find(({ id }) => itemId === id);
                      return item ? (
                        <span
                          key={itemId}
                          style={{
                            background: "black",
                            color: "white",
                            padding: "var(--spacer-1) var(--spacer-2)",
                            borderRadius: "999px",
                            fontSize: "0.875rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--spacer-1)",
                          }}
                        >
                          {item.label}
                          <button
                            style={{
                              background: "none",
                              border: "none",
                              color: "white",
                              cursor: "pointer",
                              padding: "0",
                              lineHeight: "1",
                            }}
                            onClick={() =>
                              updateFormState({ notBought: formState.notBought.filter((id) => id !== itemId) })
                            }
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </>
            ) : null}

            {/* Add Filter Button */}
            <Button
              style={{
                width: "100%",
                border: "1px solid black",
                background: "white",
                color: "black",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--spacer-2)",
                padding: "var(--spacer-2)",
              }}
              disabled={wasPublishedPreviously}
            >
              <Icon name="plus" />
              Add filter
            </Button>
          </div>

          {/* OR Section - outside container */}
          <div style={{ marginBottom: "var(--spacer-3)" }}>
            <select
              style={{
                padding: "var(--spacer-2) var(--spacer-3)",
                border: "1px solid black",
                borderRadius: "var(--border-radius)",
                background: "white",
                appearance: "none",
              }}
              disabled={wasPublishedPreviously}
              value="or"
            >
              <option value="or">Or</option>
            </select>
          </div>

          {/* Second Filter Group - separate container */}
          <div
            style={{
              border: "1px solid black",
              borderRadius: "var(--border-radius)",
              padding: "var(--spacer-4)",
              marginBottom: "var(--spacer-4)",
              background: "white",
            }}
          >
            {triggerSupportsPaidFilters ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr auto",
                  gap: "var(--spacer-2)",
                  alignItems: "center",
                  marginBottom: "var(--spacer-3)",
                }}
              >
                <div
                  style={{
                    padding: "var(--spacer-2) var(--spacer-3)",
                    border: "1px solid black",
                    borderRadius: "var(--border-radius)",
                  }}
                >
                  Where
                </div>
                <select
                  style={{
                    padding: "var(--spacer-2) var(--spacer-3)",
                    border: "1px solid black",
                    borderRadius: "var(--border-radius)",
                    background: "white",
                    appearance: "none",
                  }}
                >
                  <option>Payment</option>
                </select>
                <select
                  style={{
                    padding: "var(--spacer-2) var(--spacer-3)",
                    border: "1px solid black",
                    borderRadius: "var(--border-radius)",
                    background: "white",
                    appearance: "none",
                  }}
                >
                  <option>Is more than</option>
                </select>
                <Button className="icon-only" small>
                  <Icon name="trash2" />
                </Button>
              </div>
            ) : null}
            <div
              className={cx("input", { disabled: wasPublishedPreviously })}
              style={{ marginBottom: "var(--spacer-3)" }}
            >
              <div className="pill" style={{ borderRight: "1px solid black" }}>
                {context.currency_symbol}
              </div>
              <NumberInput
                onChange={(paidMoreThan) => updateFormState({ paidMoreThan })}
                value={formState.paidMoreThan}
              >
                {(inputProps) => (
                  <input
                    type="text"
                    disabled={wasPublishedPreviously}
                    autoComplete="off"
                    placeholder="0"
                    style={{
                      border: "none",
                      outline: "none",
                      padding: "var(--spacer-2)",
                      width: "100%",
                      background: "transparent",
                    }}
                    {...inputProps}
                  />
                )}
              </NumberInput>
            </div>

            {triggerSupportsFromCountryFilter ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
                  gap: "var(--spacer-2)",
                  alignItems: "center",
                  marginBottom: "var(--spacer-3)",
                }}
              >
                <div
                  style={{
                    padding: "var(--spacer-2) var(--spacer-3)",
                    border: "1px solid black",
                    borderRadius: "var(--border-radius)",
                  }}
                >
                  Or
                </div>
                <select
                  style={{
                    padding: "var(--spacer-2) var(--spacer-3)",
                    border: "1px solid black",
                    borderRadius: "var(--border-radius)",
                    background: "white",
                    appearance: "none",
                  }}
                >
                  <option>Location</option>
                </select>
                <select
                  style={{
                    padding: "var(--spacer-2) var(--spacer-3)",
                    border: "1px solid black",
                    borderRadius: "var(--border-radius)",
                    background: "white",
                    appearance: "none",
                  }}
                >
                  <option>Is</option>
                </select>
                <select
                  style={{
                    padding: "var(--spacer-2) var(--spacer-3)",
                    border: "1px solid black",
                    borderRadius: "var(--border-radius)",
                    background: "white",
                    appearance: "none",
                  }}
                  disabled={wasPublishedPreviously}
                  value={formState.fromCountry}
                  onChange={(e) => updateFormState({ fromCountry: e.target.value })}
                >
                  <option value="">United States</option>
                  {context.countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
                <Button className="icon-only" small>
                  <Icon name="trash2" />
                </Button>
              </div>
            ) : null}

            {/* Add Filter Button for second group */}
            <Button
              style={{
                width: "100%",
                border: "1px solid black",
                background: "white",
                color: "black",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--spacer-2)",
                padding: "var(--spacer-2)",
              }}
              disabled={wasPublishedPreviously}
            >
              <Icon name="plus" />
              Add filter
            </Button>
          </div>

          {/* Add Filter Group Button - black background */}
          <Button
            style={{
              width: "100%",
              backgroundColor: "black",
              color: "white",
              border: "none",
              padding: "var(--spacer-3)",
              borderRadius: "var(--border-radius)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--spacer-2)",
              marginBottom: "var(--spacer-4)",
            }}
            disabled={wasPublishedPreviously}
          >
            <Icon name="plus" />
            Add filter group
          </Button>

          {/* Affiliated Products Section for New Affiliate Trigger */}
          {formState.trigger === "new_affiliate" ? (
            <fieldset>
              <legend>
                <label htmlFor="affiliated_products">Affiliated products</label>
              </legend>
              <TagInput
                inputId="affiliated_products"
                placeholder="Select products..."
                isDisabled={wasPublishedPreviously}
                tagIds={formState.affiliatedProducts}
                tagList={selectableProductAndVariantOptions(
                  context.affiliate_product_options,
                  formState.affiliatedProducts,
                )}
                onChangeTagIds={(affiliatedProducts) => updateFormState({ affiliatedProducts })}
              />
              {wasPublishedPreviously ? null : (
                <label>
                  <input
                    type="checkbox"
                    checked={
                      formState.affiliatedProducts.length ===
                      selectableProductAndVariantOptions(
                        context.affiliate_product_options,
                        formState.affiliatedProducts,
                      ).length
                    }
                    onChange={(e) =>
                      updateFormState({
                        affiliatedProducts: e.target.checked
                          ? selectableProductAndVariantOptions(
                              context.affiliate_product_options,
                              formState.affiliatedProducts,
                            ).map(({ id }) => id)
                          : [],
                      })
                    }
                  />
                  All products
                </label>
              )}
            </fieldset>
          ) : null}
        </section>
      </form>
    </Layout>
  );
};

export default WorkflowForm;
