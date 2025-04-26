# frozen_string_literal: true

class AddPreheaderAndInternalTagsToInstallments < ActiveRecord::Migration[7.1]
  def change
    add_column :installments, :internal_tags, :text
  end
end
