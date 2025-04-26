# frozen_string_literal: true

class Api::Internal::AudienceMemberFilterGroupsController < Api::Internal::BaseController
  before_action :authenticate_user!
  before_action :set_filter_group, only: [:show, :update, :destroy]

  def show
    render json: filter_group_json(@filter_group)
  end

  def create
    @filter_group = AudienceMemberFilterGroup.new(filter_group_params)

    if @filter_group.save
      render json: filter_group_json(@filter_group), status: :created
    else
      render json: { errors: @filter_group.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @filter_group.update(filter_group_params)
      render json: filter_group_json(@filter_group)
    else
      render json: { errors: @filter_group.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @filter_group.destroy
    head :no_content
  end

    private
      def set_filter_group
        @filter_group = AudienceMemberFilterGroup.find(params[:id])
        # Ensure it belongs to current seller
        unless @filter_group.seller_id == current_seller.id
          render json: { error: "Unauthorized" }, status: :unauthorized
        end
      end

      def filter_group_params
        params.require(:filter_group).permit(
          :name,
          :filterable_id,
          :filterable_type,
          audience_member_filters_attributes: [
            :id, :filter_type, :_destroy, config: {}
          ]
        )
      end

      def filter_group_json(filter_group)
        {
          id: filter_group.id,
          name: filter_group.name,
          filterable_type: filter_group.filterable_type,
          filterable_id: filter_group.filterable_id,
          filters: filter_group.audience_member_filters.map do |filter|
            {
              id: filter.id,
              filter_type: filter.filter_type,
              config: filter.config
            }
          end,
          audience_count: filter_group.filter(AudienceMember.where(seller_id: current_seller.id)).count
        }
      end
end
