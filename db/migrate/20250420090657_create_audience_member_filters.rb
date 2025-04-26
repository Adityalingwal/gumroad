# frozen_string_literal: true

class CreateAudienceMemberFilters < ActiveRecord::Migration[7.1]
  def change
    create_table :audience_member_filters do |t|
      t.references :audience_member_filter_group, null: false, foreign_key: true, index: { name: "index_amf_on_filter_group_id" }
      t.string :filter_type, null: false
      t.json :config, null: false
      t.timestamps
    end
  end
end
