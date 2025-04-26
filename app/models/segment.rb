# frozen_string_literal: true

class Segment < ApplicationRecord
  include ExternalId

  belongs_to :seller, class_name: "User"
  has_many :audience_member_filter_groups, as: :filterable, dependent: :destroy
  has_and_belongs_to_many :installments
  has_and_belongs_to_many :workflows

  validates :name, presence: true
  validates :seller, presence: true

  def filter(scope)
    # If no filter groups, return original scope
    return scope if audience_member_filter_groups.empty?

    # Get all audience members that match ANY filter group (OR logic)
    subqueries = audience_member_filter_groups.map do |filter_group|
      filter_group.filter(scope)
    end

    # Combine with OR
    if subqueries.size == 1
      subqueries.first
    else
      combined_ids = subqueries.map do |sq|
        sq.pluck(:id)
      end.flatten.uniq

      # If no matching IDs, return an empty relation with the correct scope
      return scope.none if combined_ids.empty?

      scope.where(id: combined_ids)
    end
  end
end
