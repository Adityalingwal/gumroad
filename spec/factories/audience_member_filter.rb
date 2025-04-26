# frozen_string_literal: true

FactoryBot.define do
  factory :audience_member_filter do
    association :audience_member_filter_group
    filter_type { "date" }
    config { { "created_after" => 1.day.ago.iso8601 } }
  end
end
