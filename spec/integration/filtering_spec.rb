# frozen_string_literal: true

require "spec_helper"

RSpec.describe "Filtering integration", type: :integration do
  let(:seller) { create(:user) }
  let(:installment) { create(:installment, seller: seller) }
  let(:member1) { create(:audience_member, seller: seller, created_at: 1.day.ago) }
  let(:member2) { create(:audience_member, seller: seller, created_at: 30.days.ago) }

  it "filters audience members through installment filter groups" do
    filter_group = create(:audience_member_filter_group, filterable: installment)
    create(:audience_member_filter,
           audience_member_filter_group: filter_group,
           filter_type: "date",
           config: { "created_after" => 7.days.ago.iso8601 })

    # Force reload to ensure associations are updated
    installment.reload
    result = installment.audience_members_filter

    expect(result).to include(member1)
    expect(result).not_to include(member2)
  end

  it "filters audience members through segments" do
    segment = create(:segment, seller: seller)
    installment.segments << segment

    filter_group = create(:audience_member_filter_group, filterable: segment)
    create(:audience_member_filter,
           audience_member_filter_group: filter_group,
           filter_type: "date",
           config: { "created_after" => 7.days.ago.iso8601 })

    # Force reload to ensure associations are updated
    installment.reload
    segment.reload
    result = installment.audience_members_filter

    expect(result).to include(member1)
    expect(result).not_to include(member2)
  end
end
