# frozen_string_literal: true

require "spec_helper"

RSpec.describe Segment, type: :model do
  let(:user) { create(:user) }

  describe "validations" do
    it "requires name" do
      segment = build(:segment, name: nil)
      expect(segment).not_to be_valid
      expect(segment.errors.full_messages).to include("Name can't be blank")
    end

    it "requires seller" do
      segment = build(:segment, seller: nil)
      expect(segment).not_to be_valid
      expect(segment.errors.full_messages).to include("Seller can't be blank")
    end
  end

  describe "associations" do
    it { should belong_to(:seller) }
    it { should have_many(:audience_member_filter_groups) }
    it { should have_and_belong_to_many(:installments) }
    it { should have_and_belong_to_many(:workflows) }
  end

  describe "#filter" do
    it "combines filter groups with OR logic" do
      # Use a self-contained test to avoid shared user state
      test_seller = create(:user)
      segment = create(:segment, seller: test_seller)
      audience_member_1 = create(:audience_member, seller: test_seller, created_at: 1.day.ago)
      audience_member_2 = create(:audience_member, seller: test_seller, created_at: 3.days.ago)

      # Create first filter group that matches audience_member_1
      group1 = create(:audience_member_filter_group, filterable: segment)
      create(:audience_member_filter,
             audience_member_filter_group: group1,
             filter_type: "date",
             config: { "created_after" => 2.days.ago.iso8601 })

      # Create second filter group that matches audience_member_2
      group2 = create(:audience_member_filter_group, filterable: segment)
      create(:audience_member_filter,
             audience_member_filter_group: group2,
             filter_type: "date",
             config: { "created_before" => 2.days.ago.iso8601 })

      # Force reload to ensure associations are updated
      segment.reload

      result = segment.filter(AudienceMember.where(seller_id: test_seller.id))

      expect(result).to include(audience_member_1)
      expect(result).to include(audience_member_2)
    end
  end
end
