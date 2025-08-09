# frozen_string_literal: true

require 'singleton'
require_relative 'mvp_game_room'

class MVPGameServer
  include Singleton
  
  attr_reader :rooms
  
  def initialize
    @rooms = {}
    @room_counter = 0
  end
  
  def find_or_create_room
    # 尋找有空位的房間
    available_room = @rooms.values.find { |room| !room.full? && !room.started? }
    
    if available_room
      available_room
    else
      create_room
    end
  end
  
  def create_room(name = nil)
    @room_counter += 1
    name ||= "Room-#{@room_counter}"
    @rooms[name] = MVPGameRoom.new(name)
  end
  
  def remove_empty_rooms
    @rooms.delete_if { |_, room| room.empty? }
  end
end