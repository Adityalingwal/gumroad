# frozen_string_literal: true

module Onetime
  class BackfillAudienceMemberFilterGroups
    def self.call
      # First process Installments
      backfill_installments

      # Then process Workflows
      backfill_workflows
    end

    def self.backfill_installments
      Installment.where(deleted_at: nil).find_each do |installment|
        ReplicaLagWatcher.watch

        # Skip if already has filter groups
        next if installment.audience_member_filter_groups.exists?

        # Create a filter group for this installment
        filter_group = installment.audience_member_filter_groups.create!(
          name: "Converted from JSON filters"
        )

        # Convert JSON attributes to filters
        create_filters_from_installment(installment, filter_group)

        puts "Processed Installment ID: #{installment.id}"
      end
    end

    def self.backfill_workflows
      Workflow.where(deleted_at: nil).find_each do |workflow|
        ReplicaLagWatcher.watch

        # Skip if already has filter groups
        next if workflow.audience_member_filter_groups.exists?

        # Create a filter group for this workflow
        filter_group = workflow.audience_member_filter_groups.create!(
          name: "Converted from JSON filters"
        )

        # Convert JSON attributes to filters
        create_filters_from_workflow(workflow, filter_group)

        puts "Processed Workflow ID: #{workflow.id}"
      end
    end

    def self.create_filters_from_installment(installment, filter_group)
      # Date filter
      if installment.created_after.present? || installment.created_before.present?
        filter_group.audience_member_filters.create!(
          filter_type: "date",
          config: {
            "created_after" => installment.created_after,
            "created_before" => installment.created_before
          }.compact
        )
      end

      # Product filter
      if installment.bought_products.present? || installment.not_bought_products.present? ||
         installment.bought_variants.present? || installment.not_bought_variants.present?

        # Convert permalink strings to IDs
        bought_product_ids = installment.seller.products.where(unique_permalink: installment.bought_products).pluck(:id) if installment.bought_products.present?
        not_bought_product_ids = installment.seller.products.where(unique_permalink: installment.not_bought_products).pluck(:id) if installment.not_bought_products.present?

        # Convert variant external IDs to actual IDs
        bought_variant_ids = installment.bought_variants&.map { ObfuscateIds.decrypt(_1) }
        not_bought_variant_ids = installment.not_bought_variants&.map { ObfuscateIds.decrypt(_1) }

        filter_group.audience_member_filters.create!(
          filter_type: "product",
          config: {
            "bought_product_ids" => bought_product_ids,
            "not_bought_product_ids" => not_bought_product_ids,
            "bought_variant_ids" => bought_variant_ids,
            "not_bought_variant_ids" => not_bought_variant_ids
          }.compact
        )
      end

      # Payment filter
      if installment.paid_more_than_cents.present? || installment.paid_less_than_cents.present?
        filter_group.audience_member_filters.create!(
          filter_type: "payment",
          config: {
            "paid_more_than_cents" => installment.paid_more_than_cents,
            "paid_less_than_cents" => installment.paid_less_than_cents
          }.compact
        )
      end

      # Location filter
      if installment.bought_from.present?
        filter_group.audience_member_filters.create!(
          filter_type: "location",
          config: {
            "bought_from" => installment.bought_from
          }
        )
      end

      # Recipient filter - based on installment_type
      if %w[product seller variant follower affiliate].include?(installment.installment_type)
        recipient_type = installment.installment_type == "follower" ? "follower" :
                         installment.installment_type == "affiliate" ? "affiliate" : "customer"

        filter_group.audience_member_filters.create!(
          filter_type: "recipient",
          config: {
            "type" => recipient_type
          }
        )
      end
    end

    def self.create_filters_from_workflow(workflow, filter_group)
      # Date filter
      if workflow.created_after.present? || workflow.created_before.present?
        filter_group.audience_member_filters.create!(
          filter_type: "date",
          config: {
            "created_after" => workflow.created_after,
            "created_before" => workflow.created_before
          }.compact
        )
      end

      # Product filter
      if workflow.bought_products.present? || workflow.not_bought_products.present? ||
         workflow.bought_variants.present? || workflow.not_bought_variants.present?

        # Convert permalink strings to IDs
        bought_product_ids = workflow.seller.products.where(unique_permalink: workflow.bought_products).pluck(:id) if workflow.bought_products.present?
        not_bought_product_ids = workflow.seller.products.where(unique_permalink: workflow.not_bought_products).pluck(:id) if workflow.not_bought_products.present?

        # Convert variant external IDs to actual IDs
        bought_variant_ids = workflow.bought_variants&.map { ObfuscateIds.decrypt(_1) }
        not_bought_variant_ids = workflow.not_bought_variants&.map { ObfuscateIds.decrypt(_1) }

        filter_group.audience_member_filters.create!(
          filter_type: "product",
          config: {
            "bought_product_ids" => bought_product_ids,
            "not_bought_product_ids" => not_bought_product_ids,
            "bought_variant_ids" => bought_variant_ids,
            "not_bought_variant_ids" => not_bought_variant_ids
          }.compact
        )
      end

      # Payment filter
      if workflow.paid_more_than_cents.present? || workflow.paid_less_than_cents.present?
        filter_group.audience_member_filters.create!(
          filter_type: "payment",
          config: {
            "paid_more_than_cents" => workflow.paid_more_than_cents,
            "paid_less_than_cents" => workflow.paid_less_than_cents
          }.compact
        )
      end

      # Location filter
      if workflow.bought_from.present?
        filter_group.audience_member_filters.create!(
          filter_type: "location",
          config: {
            "bought_from" => workflow.bought_from
          }
        )
      end

      # Recipient filter - based on workflow_type
      if %w[product seller variant follower affiliate].include?(workflow.workflow_type)
        recipient_type = workflow.workflow_type == "follower" ? "follower" :
                         workflow.workflow_type == "affiliate" ? "affiliate" : "customer"

        filter_group.audience_member_filters.create!(
          filter_type: "recipient",
          config: {
            "type" => recipient_type
          }
        )
      end
    end
  end
end
