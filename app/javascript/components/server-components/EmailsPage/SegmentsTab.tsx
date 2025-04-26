import React from "react";

import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";
import { Popover } from "$app/components/Popover";
import { showAlert } from "$app/components/server-components/Alert";
import { Layout, NewSegmentButton } from "$app/components/server-components/EmailsPage";

type Segment = {
  external_id: string;
  name: string;
  created_at: Date;
  last_used_at: Date;
  subscriber_count: number;
  opens_rate: number;
  clicks_rate: number;
};

export const SegmentsTab: React.FC = () => {
  const [selectedSegmentId, setSelectedSegmentId] = React.useState<string | null>(null);
  const [openPopoverId, setOpenPopoverId] = React.useState<string | null>(null);
  const [segments, setSegments] = React.useState<Segment[]>([
    {
      external_id: "1",
      name: "Active subscribers",
      created_at: new Date("2025-02-13T00:00:00Z"),
      last_used_at: new Date("2025-02-14T00:00:00Z"),
      subscriber_count: 1302,
      opens_rate: 0,
      clicks_rate: 0,
    },
    {
      external_id: "2",
      name: "Casual subscribers",
      created_at: new Date("2024-05-01T00:00:00Z"),
      last_used_at: new Date("2024-05-01T00:00:00Z"),
      subscriber_count: 830,
      opens_rate: 0,
      clicks_rate: 0,
    },
    {
      external_id: "3",
      name: "Cold subscribers",
      created_at: new Date("2024-04-27T00:00:00Z"),
      last_used_at: new Date("2024-04-27T00:00:00Z"),
      subscriber_count: 567,
      opens_rate: 0,
      clicks_rate: 0,
    },
  ]);

  const handleDeleteSegment = (id: string) => {
    setSegments(segments.filter((segment) => segment.external_id !== id));
    setSelectedSegmentId(null);
    showAlert("Segment deleted successfully", "success");
  };

  const handleDuplicateSegment = (segmentToDuplicate: Segment) => {
    const newSegment = {
      ...segmentToDuplicate,
      external_id: `${Date.now()}`,
      name: `${segmentToDuplicate.name} (copy)`,
      created_at: new Date(),
      last_used_at: new Date(),
    };

    setSegments([...segments, newSegment]);
    showAlert("Segment duplicated successfully", "success");
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <Layout selectedTab="segments">
      <div className="segments-container px-8 py-6">
        {segments.length > 0 ? (
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Created</th>
                <th>Last used</th>
                <th>Audience</th>
                <th>Opens</th>
                <th>Clicks</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((segment: Segment) => {
                const isSelected = segment.external_id === selectedSegmentId;
                return (
                  <tr
                    key={segment.external_id}
                    onClick={() => setSelectedSegmentId(isSelected ? null : segment.external_id)}
                    aria-selected={isSelected}
                  >
                    <td>{segment.name}</td>
                    <td>{formatDate(segment.created_at)}</td>
                    <td>{formatDate(segment.last_used_at)}</td>
                    <td>{segment.subscriber_count.toLocaleString()}</td>
                    <td>{segment.opens_rate}%</td>
                    <td>{segment.clicks_rate}%</td>
                    <td className="actions">
                      <div className="buttons">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/emails/segments/${segment.external_id}/edit`;
                          }}
                          style={{ marginRight: "10px" }}
                          title="Edit segment"
                        >
                          <Icon name="pencil" />
                        </Button>
                        <Popover
                          open={openPopoverId === segment.external_id}
                          onToggle={(open) => setOpenPopoverId(open ? segment.external_id : null)}
                          trigger={
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenPopoverId(openPopoverId === segment.external_id ? null : segment.external_id);
                              }}
                              title="More actions"
                            >
                              <Icon name="three-dots" />
                            </Button>
                          }
                          position="bottom"
                        >
                          {(close) => (
                            <>
                              <button
                                className="popover-action"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateSegment(segment);
                                  close();
                                }}
                              >
                                <Icon name="outline-duplicate" style={{ width: "20px", height: "20px" }} />
                                Duplicate
                              </button>
                              <button
                                className="popover-action danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSegment(segment.external_id);
                                  close();
                                }}
                              >
                                <Icon name="trash2" style={{ width: "20px", height: "20px" }} />
                                Delete
                              </button>
                            </>
                          )}
                        </Popover>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="placeholder">
            <h2>Create your first segment</h2>
            <p>Segments help you target specific groups of subscribers</p>
            <NewSegmentButton />
          </div>
        )}
      </div>

      {selectedSegmentId ? (
        <aside>
          <header>
            <h2>Segment details</h2>
            <button className="close" onClick={() => setSelectedSegmentId(null)} title="Close" />
          </header>
          <div className="stack">
            {(() => {
              const segment = segments.find((s) => s.external_id === selectedSegmentId);
              if (!segment) return null;

              return (
                <>
                  <div>
                    <h4>Name</h4>
                    <div>{segment.name}</div>
                  </div>

                  <div>
                    <h4>Subscribers</h4>
                    <div>{segment.subscriber_count.toLocaleString()}</div>
                  </div>

                  <div>
                    <h4>Created</h4>
                    <div>{formatDate(segment.created_at)}</div>
                  </div>

                  <div>
                    <h4>Last used</h4>
                    <div>{formatDate(segment.last_used_at)}</div>
                  </div>

                  <div className="actions">
                    <Button
                      color="primary"
                      onClick={() => {
                        window.location.href = `/emails/segments/${segment.external_id}/edit`;
                      }}
                    >
                      Edit segment
                    </Button>

                    <Button color="danger" onClick={() => handleDeleteSegment(segment.external_id)}>
                      Delete segment
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </aside>
      ) : null}
    </Layout>
  );
};
