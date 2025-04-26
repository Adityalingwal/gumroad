  # frozen_string_literal: true

  FactoryBot.define do
    factory :segment do
      association :seller, factory: :user
      name { "Test Segment" }
    end
  end
