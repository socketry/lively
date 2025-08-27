# frozen_string_literal: true

FactoryBot.define do
  factory :player do
    sequence(:id) { |n| "player-#{n}" }
    sequence(:nickname) { |n| "Player#{n}" }
    x { 400 }
    y { 300 }
    angle { 0 }
    health { 100 }
    armor { 0 }
    money { 800 }
    kills { 0 }
    deaths { 0 }
    alive { true }
    team { 'ct' }
    weapon { 'knife' }
    ammo { 0 }
    reserve_ammo { 0 }
    is_reloading { false }
    scope_speed_multiplier { 1.0 }
    last_shot_time { 0 }
    reload_start_time { 0 }

    trait :terrorist do
      team { 'terrorist' }
      x { 100 }
      y { 100 }
    end

    trait :counter_terrorist do
      team { 'ct' }
      x { 700 }
      y { 500 }
    end

    trait :dead do
      alive { false }
      health { 0 }
    end

    trait :armed_with_rifle do
      weapon { 'ak47' }
      ammo { 30 }
      reserve_ammo { 90 }
      money { 2700 }
    end

    trait :low_health do
      health { 25 }
    end

    trait :rich do
      money { 16000 }
    end

    trait :bot do
      sequence(:id) { |n| "bot-#{n}" }
      sequence(:nickname) { |n| "Bot#{n}" }
      is_bot { true }
      difficulty { 'normal' }
    end

    initialize_with do
      attributes.compact
    end
  end
end