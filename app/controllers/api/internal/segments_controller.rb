# frozen_string_literal: true

class Api::Internal::SegmentsController < Api::Internal::BaseController
  before_action :authenticate_user!
  before_action :set_segment, only: [:show, :update, :destroy]

  def index
    @segments = current_seller.segments
    render json: @segments.map { |segment| segment_json(segment) }
  end

  def show
    render json: segment_json(@segment)
  end

  def create
    @segment = current_seller.segments.build(segment_params)

    if @segment.save
      render json: segment_json(@segment), status: :created
    else
      render json: { errors: @segment.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @segment.update(segment_params)
      render json: segment_json(@segment)
    else
      render json: { errors: @segment.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @segment.destroy
    head :no_content
  end

    private
      def set_segment
        @segment = current_seller.segments.find_by_external_id!(params[:id])
      end

      def segment_params
        params.require(:segment).permit(:name, filter_groups_attributes: [
                                          :id, :name, :_destroy, filters_attributes: [
                                            :id, :filter_type, :_destroy, config: {}
                                          ]
                                        ])
      end

      def segment_json(segment)
        {
          id: segment.external_id,
          name: segment.name,
          filter_groups: segment.audience_member_filter_groups.map do |group|
            {
              id: group.id,
              name: group.name,
              filters: group.audience_member_filters.map do |filter|
                {
                  id: filter.id,
                  filter_type: filter.filter_type,
                  config: filter.config
                }
              end
            }
          end,
          audience_count: segment.filter(AudienceMember.where(seller_id: current_seller.id)).count
        }
      end
end
