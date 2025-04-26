# frozen_string_literal: true

require "spec_helper"

RSpec.describe AudienceMemberFilter, type: :model do
  let(:user) { create(:user) }
  let(:filter_group) { create(:audience_member_filter_group) }

  describe "validations" do
    it "requires filter_type" do
      filter = build(:audience_member_filter, filter_type: nil)
      expect(filter).not_to be_valid
      expect(filter.errors.full_messages).to include("Filter type can't be blank")
    end

    it "requires config" do
      filter = build(:audience_member_filter, config: nil)
      expect(filter).not_to be_valid
      expect(filter.errors.full_messages).to include("Config can't be blank")
    end
  end

  describe ".filter" do
    let(:user) { create(:user) }
    let(:audience_member) { create(:audience_member, seller: user, created_at: 1.day.ago) }

    context "with date filter" do
      it "filters by created_after" do
        filter = create(:audience_member_filter,
                        filter_type: "date",
                        config: { "created_after" => 2.days.ago.iso8601 })

        result = described_class.filter(
          seller_id: user.id,
          filter_type: filter.filter_type,
          config: filter.config
        )

        expect(result).to include(audience_member)
      end

      it "filters by created_before" do
        filter = create(:audience_member_filter,
                        filter_type: "date",
                        config: { "created_before" => 2.hours.ago.iso8601 })

        result = described_class.filter(
          seller_id: user.id,
          filter_type: filter.filter_type,
          config: filter.config
        )

        expect(result).to include(audience_member)
      end
    end
  end
end
