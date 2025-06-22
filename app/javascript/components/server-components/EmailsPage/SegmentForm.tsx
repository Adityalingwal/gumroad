import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";
import { showAlert } from "$app/components/server-components/Alert";

interface SegmentFormProps {
  isEdit?: boolean;
}

interface LocationStateWithFrom {
  from: string;
}

interface Filter {
  id: string;
  type: string;
  operator: string;
  value: string;
}

interface FilterGroup {
  id: string;
  filters: Filter[];
}

function isObjectWithFromProperty(state: unknown): state is { from: unknown } {
  return typeof state === "object" && state !== null && "from" in state;
}

function hasFrom(state: unknown): state is LocationStateWithFrom {
  return isObjectWithFromProperty(state) && typeof state.from === "string";
}

function getFromState(state: unknown): string | undefined {
  if (hasFrom(state)) {
    return state.from;
  }
  return undefined;
}

const filterOptions = [
  { value: "date", label: "Date", icon: "calendar-all" },
  { value: "email", label: "Email", icon: "outline-mail-open" },
  { value: "product", label: "Product", icon: "outline-shopping-bag" },
  { value: "payment", label: "Payment", icon: "outline-credit-card" },
  { value: "location", label: "Location", icon: "globe" },
] as const;

const operatorOptions: Record<string, { value: string; label: string }[]> = {
  payment: [
    { value: "is_more_than", label: "Is more than" },
    { value: "is_less_than", label: "Is less than" },
    { value: "is_equal_to", label: "Is equal to" },
  ],
  location: [
    { value: "is", label: "Is" },
    { value: "is_not", label: "Is not" },
  ],
  date: [
    { value: "is_after", label: "Is after" },
    { value: "is_before", label: "Is before" },
    { value: "is_in_the_last", label: "Is in the last" },
  ],
  email: [
    { value: "has_opened_in_the_last", label: "Has opened in the last" },
    { value: "has_not_opened_in_the_last", label: "Has not opened in the last" },
  ],
  product: [
    { value: "has_not_yet_bought", label: "Has not yet bought" },
    { value: "has_bought", label: "Has bought" },
    { value: "is_affiliated_to", label: "Is affiliated to" },
    { value: "is_member_of", label: "Is member of" },
  ],
};

const productSpecificOptions = [
  { value: "joining", label: "Joining" },
  { value: "affiliation", label: "Affiliation" },
  { value: "following", label: "Following" },
  { value: "purchase", label: "Purchase" },
];

const locationOptions = [
  { value: "united_states", label: "United States" },
  { value: "canada", label: "Canada" },
  { value: "united_kingdom", label: "United Kingdom" },
  { value: "australia", label: "Australia" },
  { value: "germany", label: "Germany" },
  { value: "france", label: "France" },
];

export const SegmentForm: React.FC<SegmentFormProps> = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [segmentName, setSegmentName] = React.useState("");
  const [contacts] = React.useState(102);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [filterGroups, setFilterGroups] = React.useState<FilterGroup[]>([]);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!segmentName.trim()) {
      showAlert("Please enter a segment name", "error");
      return;
    }
    const message = isEdit ? "Segment updated successfully" : "Segment created successfully";
    showAlert(message, "success");
    const from = getFromState(location.state) || "/emails/segments";
    navigate(from);
  };

  const handleCancel = () => {
    const from = getFromState(location.state) || "/emails/segments";
    navigate(from);
  };

  const addFilterGroup = () => {
    const newGroup: FilterGroup = {
      id: Date.now().toString(),
      filters: [],
    };
    setFilterGroups([...filterGroups, newGroup]);
  };

  const addFilter = (groupId: string, filterType?: string) => {
    const type = filterType || "payment";
    const operators = operatorOptions[type];
    const newFilter: Filter = {
      id: Date.now().toString(),
      type,
      operator: operators?.[0]?.value || "",
      value: "",
    };

    setFilterGroups((groups) =>
      groups.map((group) => (group.id === groupId ? { ...group, filters: [...group.filters, newFilter] } : group)),
    );
    setIsFilterOpen(false);
  };

  const removeFilter = (groupId: string, filterId: string) => {
    setFilterGroups((groups) =>
      groups.map((group) =>
        group.id === groupId ? { ...group, filters: group.filters.filter((f) => f.id !== filterId) } : group,
      ),
    );
  };

  const removeFilterGroup = (groupId: string) => {
    setFilterGroups((groups) => groups.filter((g) => g.id !== groupId));
  };

  const updateFilter = (groupId: string, filterId: string, field: keyof Filter, value: string) => {
    setFilterGroups((groups) =>
      groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              filters: group.filters.map((filter) =>
                filter.id === filterId
                  ? {
                      ...filter,
                      [field]: value,
                      ...(field === "type" && { operator: (operatorOptions[value] || [])[0]?.value || "" }),
                    }
                  : filter,
              ),
            }
          : group,
      ),
    );
  };

  const handleFilterSelect = (filterType: string) => {
    if (filterGroups.length === 0) {
      const newGroup: FilterGroup = {
        id: Date.now().toString(),
        filters: [],
      };
      setFilterGroups([newGroup]);
      setTimeout(() => addFilter(newGroup.id, filterType), 0);
    } else {
      addFilter(filterGroups[filterGroups.length - 1]?.id || "", filterType);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && event.target instanceof Node && !dropdownRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };

    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  const renderValueInput = (filter: Filter, groupId: string) => {
    if (filter.type === "location") {
      return (
        <select
          className="border-gray-300 min-w-0 flex-1 rounded border bg-white p-2 text-sm"
          value={filter.value}
          onChange={(e) => updateFilter(groupId, filter.id, "value", e.target.value)}
        >
          <option value="">Select location</option>
          {locationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (filter.type === "product") {
      return (
        <select
          className="border-gray-300 min-w-0 flex-1 rounded border bg-white p-2 text-sm"
          value={filter.value}
          onChange={(e) => updateFilter(groupId, filter.id, "value", e.target.value)}
        >
          <option value="">Select option</option>
          {productSpecificOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (filter.type === "email" && filter.operator.includes("last")) {
      return (
        <div className="flex flex-1 items-center gap-2">
          <input
            type="number"
            className="border-gray-300 w-20 rounded border p-2 text-sm"
            placeholder="0"
            value={filter.value}
            onChange={(e) => updateFilter(groupId, filter.id, "value", e.target.value)}
          />
          <span className="text-gray-600 text-sm">days</span>
        </div>
      );
    }

    if (filter.type === "payment") {
      return (
        <div className="flex flex-1 items-center gap-1">
          <span className="text-gray-600">$</span>
          <input
            type="number"
            className="border-gray-300 flex-1 rounded border p-2 text-sm"
            placeholder="0"
            value={filter.value}
            onChange={(e) => updateFilter(groupId, filter.id, "value", e.target.value)}
          />
        </div>
      );
    }

    return (
      <input
        type="text"
        className="border-gray-300 min-w-0 flex-1 rounded border p-2 text-sm"
        placeholder="Enter value"
        value={filter.value}
        onChange={(e) => updateFilter(groupId, filter.id, "value", e.target.value)}
      />
    );
  };

  return (
    <div className="segment-form-page min-h-screen bg-white">
      <header
        className="flex items-center justify-between border-b-2 px-16 py-12"
        style={{ borderBottomColor: "#6b7280" }}
      >
        <h1 className="google-sans text-5xl font-normal">{isEdit ? "Edit segment" : "New segment"}</h1>
        <div className="flex gap-3">
          <Button outline color="primary" onClick={handleCancel}>
            <Icon name="x" className="mr-1" /> Cancel
          </Button>
          <Button onClick={handleSubmit} color="accent">
            Save
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl space-x-16 pt-16">
        {/* Left column */}
        <div className="w-1/3">
          <p className="mb-4">
            Create a segment to automatically group your subscribers based on their attributes and actions.
          </p>

          <p className="mb-2">
            Once the segment is created, you can use it to send targeted emails and improve engagement.
          </p>
          <a href="#" className="text-blue-600 hover:underline">
            Learn more
          </a>
        </div>

        {/* Right column */}
        <div className="w-2/3">
          <form onSubmit={handleSubmit} className="w-full">
            {/* Segment name */}
            <div className="mb-6">
              <label htmlFor="segmentName" className="mb-2 block text-sm font-medium">
                Name
              </label>
              <input
                id="segmentName"
                type="text"
                className="border-gray-300 w-full rounded border p-2"
                placeholder="Segment name"
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
                required
              />
            </div>

            {/* Contacts + Generate */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">Contacts in this segment: {contacts.toLocaleString()}</label>
                <Button
                  type="button"
                  className="bg-gray-100 hover:bg-gray-200 flex items-center gap-1 rounded px-2 text-sm"
                  style={{ minHeight: 30, paddingTop: 0, paddingBottom: 0 }}
                >
                  <Icon name="bullseye" style={{ width: "16px", height: "16px" }} />
                  Generate with AI
                </Button>
              </div>

              {/* Everyone dropdown (static) */}
              <div className="relative mb-6">
                <select
                  className="border-gray-300 focus:border-pink-400 focus:ring-pink-200 block w-full appearance-none rounded border bg-white p-2 pr-10 text-sm focus:outline-none focus:ring-2"
                  defaultValue="customers"
                >
                  <option value="customers">Customers</option>
                  <option value="everyone">Everyone</option>
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <Icon name="outline-cheveron-down" style={{ width: "16px", height: "16px" }} />
                </span>
              </div>

              {/* Filter Groups */}
              <div className="space-y-4">
                {filterGroups.map((group) => (
                  <div key={group.id} className="border-gray-300 rounded-lg border bg-white p-4">
                    <div className="space-y-3">
                      {group.filters.map((filter, filterIndex) => (
                        <div key={filter.id} className="flex items-center gap-2">
                          {filterIndex > 0 && (
                            <select
                              className="border-gray-300 w-16 rounded border bg-white p-2 text-sm"
                              defaultValue="or"
                            >
                              <option value="or">Or</option>
                              <option value="and">And</option>
                            </select>
                          )}

                          {filterIndex === 0 && <span className="text-gray-600 whitespace-nowrap text-sm">Where</span>}

                          <select
                            className="border-gray-300 min-w-0 flex-1 rounded border bg-white p-2 text-sm"
                            value={filter.type}
                            onChange={(e) => updateFilter(group.id, filter.id, "type", e.target.value)}
                          >
                            {filterOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <select
                            className="border-gray-300 min-w-0 flex-1 rounded border bg-white p-2 text-sm"
                            value={filter.operator}
                            onChange={(e) => updateFilter(group.id, filter.id, "operator", e.target.value)}
                          >
                            {(operatorOptions[filter.type] || []).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          {renderValueInput(filter, group.id)}

                          <button
                            type="button"
                            onClick={() => removeFilter(group.id, filter.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <Icon name="trash2" style={{ width: "16px", height: "16px" }} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="border-gray-300 hover:bg-gray-50 flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm"
                      >
                        <Icon name="plus" style={{ width: "14px", height: "14px" }} />
                        Add filter
                      </button>

                      {filterGroups.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFilterGroup(group.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove group
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add filter or Add filter group buttons */}
              {filterGroups.length === 0 ? (
                <div
                  className="border-gray-400 bg-gray-50 relative mb-2 flex flex-col items-center justify-center rounded-md border border-dashed px-4 py-8"
                  style={{ minHeight: 160 }}
                >
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="hover:bg-gray-800 mb-2 flex items-center gap-2 rounded bg-black px-4 py-2 font-normal text-white"
                    style={{ minWidth: 120 }}
                  >
                    <Icon name="plus" style={{ width: "18px", height: "18px" }} />
                    Add filter
                  </button>
                  {isFilterOpen ? (
                    <div
                      ref={dropdownRef}
                      className="border-gray-200 absolute left-1/2 top-20 z-10 mt-2 w-48 -translate-x-1/2 rounded border bg-white shadow-lg"
                    >
                      <ul className="py-1">
                        {filterOptions.map((option) => (
                          <li
                            key={option.value}
                            className="block cursor-pointer hover:bg-black hover:text-white"
                            onClick={() => handleFilterSelect(option.value)}
                          >
                            <div className="flex items-center gap-2 px-4 py-2">
                              <Icon name={option.icon} style={{ width: "16px", height: "16px" }} />
                              <span>{option.label}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p className="text-gray-500 mt-6 max-w-xs text-center text-sm">
                    Customize your email list based on when a subscriber receives your emails.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={addFilterGroup}
                  className="hover:bg-gray-800 mt-4 flex w-full items-center justify-center gap-2 rounded bg-black px-4 py-2 font-normal text-white"
                >
                  <Icon name="plus" style={{ width: "18px", height: "18px" }} />
                  Add filter group
                </button>
              )}

              {/* Filter dropdown for existing groups */}
              {isFilterOpen && filterGroups.length > 0 ? (
                <div
                  ref={dropdownRef}
                  className="border-gray-200 absolute z-10 mt-2 w-48 rounded border bg-white shadow-lg"
                  style={{ left: "50%", transform: "translateX(-50%)" }}
                >
                  <ul className="py-1">
                    {filterOptions.map((option) => (
                      <li
                        key={option.value}
                        className="block cursor-pointer hover:bg-black hover:text-white"
                        onClick={() => handleFilterSelect(option.value)}
                      >
                        <div className="flex items-center gap-2 px-4 py-2">
                          <Icon name={option.icon} style={{ width: "16px", height: "16px" }} />
                          <span>{option.label}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
