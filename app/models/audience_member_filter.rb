# frozen_string_literal: true

require "json_schemer"

class AudienceMemberFilter < ApplicationRecord
  belongs_to :audience_member_filter_group

  validates :filter_type, presence: true
  validates :config, presence: true
  validate :validate_config_schema
  validate :validate_date_range, if: -> { filter_type == "date" && config.present? }

  FILTER_TYPES = %w[date product payment location recipient].freeze

  def self.filter(seller_id:, filter_type:, config:, scope: nil)
    scope ||= AudienceMember.where(seller_id: seller_id)

    case filter_type
    when "date"
      filter_by_date(scope, config)
    when "product"
      filter_by_product(scope, config)
    when "payment"
      filter_by_payment(scope, config)
    when "location"
      filter_by_location(scope, config)
    when "recipient"
      filter_by_recipient(scope, config)
    else
      scope
    end
  end

  def filter(scope)
    self.class.filter(
      seller_id: audience_member_filter_group.seller_id,
      filter_type: filter_type,
      config: config,
      scope: scope
    )
  end

  private
    def self.filter_by_date(scope, config)
      after = config["created_after"]
      before = config["created_before"]
      if after.present? && before.present?
        after_date = Time.zone.parse(after) rescue nil
        before_date = Time.zone.parse(before) rescue nil
        return scope.none unless after_date && before_date && before_date >= after_date
        scope = scope.where("audience_members.created_at >= ? AND audience_members.created_at <= ?", after_date, before_date)
      elsif after.present?
        after_date = Time.zone.parse(after) rescue nil
        scope = scope.where("audience_members.created_at >= ?", after_date) if after_date
      elsif before.present?
        before_date = Time.zone.parse(before) rescue nil
        scope = scope.where("audience_members.created_at <= ?", before_date) if before_date
      end
      scope
    end

    def self.filter_by_product(scope, config)
      if config["bought_product_ids"].present?
        scope = scope.joins(:purchases)
                     .where(purchases: { link_id: config["bought_product_ids"] })
                     .distinct
      end

      if config["not_bought_product_ids"].present?
        not_bought_ids = config["not_bought_product_ids"]
        # Need a subquery to ensure the user hasn't bought any of these products
        scope = scope.where.not(id: AudienceMember.joins(:purchases)
                                                 .where(purchases: { link_id: not_bought_ids })
                                                 .select(:id))
      end

      scope
    end

    def self.filter_by_payment(scope, config)
      if config["paid_more_than_cents"].present?
        scope = scope.joins(:purchases)
                    .where("purchases.price_cents >= ?", config["paid_more_than_cents"])
                    .distinct
      end

      if config["paid_less_than_cents"].present?
        scope = scope.joins(:purchases)
                    .where("purchases.price_cents <= ?", config["paid_less_than_cents"])
                    .distinct
      end

      scope
    end

    def self.filter_by_location(scope, config)
      if config["bought_from"].present?
        scope = scope.joins(:purchases)
                    .where("purchases.country = ?", config["bought_from"])
                    .distinct
      end

      scope
    end

    def self.filter_by_recipient(scope, config)
      if config["type"].present?
        case config["type"]
        when "customer"
          scope = scope.where.not(purchase_id: nil)
        when "follower"
          scope = scope.where.not(follower_id: nil)
        when "affiliate"
          scope = scope.where.not(affiliate_id: nil)
        end
      end

      scope
    end

    def validate_config_schema
      schema_file = Rails.root.join("lib", "json_schemas", "audience_member_filter_#{filter_type}.json")
      return unless File.exist?(schema_file)

      schema = JSON.parse(File.read(schema_file))
      errors = JSONSchemer.schema(schema).validate(config).to_a

      errors.each do |error|
        self.errors.add(:config, "#{error['data_pointer']}: #{error['schema_pointer']}")
      end
    end

    def validate_date_range
      return unless config.is_a?(Hash)
      after = config["created_after"]
      before = config["created_before"]
      return unless after.present? && before.present?
      after_time = Time.zone.parse(after) rescue nil
      before_time = Time.zone.parse(before) rescue nil
      return unless after_time && before_time
      if before_time < after_time
        errors.add(:config, "created_before must be after created_after")
      end
    end
end
