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

export const SegmentForm: React.FC<SegmentFormProps> = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [segmentName, setSegmentName] = React.useState("");
  const [contacts] = React.useState(1302);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

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
                  defaultValue="everyone"
                >
                  <option value="everyone">Everyone</option>
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"></span>
              </div>

              {/* Customize box with filter button */}
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
                  <div className="border-gray-200 absolute left-1/2 top-20 z-10 mt-2 w-48 -translate-x-1/2 rounded border bg-white shadow-lg">
                    <ul>
                      <li className="flex cursor-pointer items-center gap-2 px-4 py-2">
                        <Icon name="calendar-all" style={{ width: "16px", height: "16px" }} />
                        Date
                      </li>
                      <li className="flex cursor-pointer items-center gap-2 px-4 py-2">
                        <Icon name="outline-mail-open" style={{ width: "16px", height: "16px" }} />
                        Email
                      </li>
                      <li className="flex cursor-pointer items-center gap-2 px-4 py-2">
                        <Icon name="outline-shopping-bag" style={{ width: "16px", height: "16px" }} />
                        Product
                      </li>
                      <li className="flex cursor-pointer items-center gap-2 px-4 py-2">
                        <Icon name="outline-credit-card" style={{ width: "16px", height: "16px" }} />
                        Payment
                      </li>
                      <li className="flex cursor-pointer items-center gap-2 px-4 py-2">
                        <Icon name="globe" style={{ width: "16px", height: "16px" }} />
                        Location
                      </li>
                    </ul>
                  </div>
                ) : null}
                <p className="text-gray-500 mt-6 max-w-xs text-center text-sm">
                  Customize your email list based on when a subscriber receives your emails.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
