# frozen_string_literal: true

module RedisHelpers
  def test_redis
    @test_redis ||= Async::Redis::Client.new(database: 1)
  end

  def clear_redis
    Async do
      test_redis.flushdb
    end.wait
  end

  def redis_get(key)
    Async do
      test_redis.get(key)
    end.wait
  end

  def redis_set(key, value)
    Async do
      test_redis.set(key, value)
    end.wait
  end

  def redis_hget(key, field)
    Async do
      test_redis.hget(key, field)
    end.wait
  end

  def redis_hset(key, field, value)
    Async do
      test_redis.hset(key, field, value)
    end.wait
  end

  def redis_keys(pattern = '*')
    Async do
      test_redis.keys(pattern)
    end.wait
  end

  def redis_exists?(key)
    Async do
      test_redis.exists(key)
    end.wait > 0
  end

  def create_test_room(room_data = {})
    room = build(:room, room_data)
    room_key = "room:#{room[:id]}"
    
    Async do
      test_redis.hset(room_key, room)
      test_redis.sadd('rooms', room[:id])
    end.wait
    
    room
  end

  def create_test_player(player_data = {})
    player = build(:player, player_data)
    player_key = "player:#{player[:id]}"
    
    Async do
      test_redis.hset(player_key, player)
    end.wait
    
    player
  end

  def add_player_to_room(room_id, player_id)
    Async do
      test_redis.sadd("room:#{room_id}:players", player_id)
      room_players_key = "room:#{room_id}:players"
      player_count = test_redis.scard(room_players_key)
      test_redis.hset("room:#{room_id}", 'player_count', player_count)
    end.wait
  end
end

RSpec.configure do |config|
  config.include RedisHelpers
end