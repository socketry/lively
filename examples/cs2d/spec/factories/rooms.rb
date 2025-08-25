# frozen_string_literal: true

FactoryBot.define do
  factory :room do
    sequence(:id) { |n| "room-#{n}" }
    sequence(:name) { |n| "Game Room #{n}" }
    created_at { Time.now.to_f }
    max_players { 10 }
    player_count { 0 }
    status { 'waiting' }
    game_mode { 'classic' }
    map_name { 'de_dust2_simple' }
    round_time { 120 }
    freeze_time { 15 }
    buy_time { 20 }
    max_rounds { 15 }
    current_round { 1 }
    ct_score { 0 }
    terrorist_score { 0 }
    round_state { 'waiting' }
    round_start_time { nil }
    bomb_planted { false }
    bomb_timer { 35 }

    trait :active do
      status { 'active' }
      player_count { 6 }
      round_state { 'playing' }
      round_start_time { Time.now.to_f }
    end

    trait :full do
      player_count { 10 }
    end

    trait :bomb_scenario do
      game_mode { 'defuse' }
      map_name { 'de_dust2_simple' }
    end

    trait :hostage_scenario do
      game_mode { 'hostage' }
      map_name { 'cs_office_simple' }
    end

    trait :ongoing_round do
      status { 'active' }
      round_state { 'playing' }
      round_start_time { Time.now.to_f - 30 }
    end

    trait :bomb_planted do
      bomb_planted { true }
      bomb_plant_time { Time.now.to_f - 10 }
    end

    initialize_with do
      attributes.compact
    end
  end
end