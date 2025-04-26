# frozen_string_literal: true

class AudienceMemberFilterGroup < ApplicationRecord
  belongs_to :filterable, polymorphic: true, optional: true
  belongs_to :segment, optional: true
  has_many :audience_member_filters, dependent: :destroy

  def self.filter(seller_id:, group_ids:)
    groups = AudienceMemberFilterGroup.where(id: group_ids)
    return AudienceMember.where(seller_id: seller_id) if groups.empty?

    # Get first group's filtered audience members
    first_group = groups.first
    relation = filter_by_group(seller_id, first_group)

    # Apply AND logic for remaining groups
    groups.drop(1).each do |group|
      relation = relation.merge(filter_by_group(seller_id, group))
    end

    relation.distinct
  end

  def self.filter_by_group(seller_id, group)
    scope = AudienceMember.where(seller_id: seller_id)

    # If no filters, return all audience members
    return scope if group.audience_member_filters.empty?

    # Get all filters
    filters = group.audience_member_filters.to_a

    # Apply each filter with AND logic
    current_scope = scope
    filters.each do |filter|
      current_scope = filter.filter(current_scope)
    end

    current_scope
  end

  def filter(scope)
    # If no filters, return original scope
    return scope if audience_member_filters.empty?

    # Apply each filter with AND logic
    current_scope = scope
    audience_member_filters.each do |filter|
      current_scope = filter.filter(current_scope)
    end

    current_scope
  end

  def seller_id
    if filterable.respond_to?(:seller_id)
      filterable.seller_id
    elsif filterable.respond_to?(:seller)
      filterable.seller.id
    elsif segment.present?
      segment.seller_id
    end
  end
end
