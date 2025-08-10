# frozen_string_literal: true

class ProfileCustomization
  # Available customization options
  TITLES = {
    'Rookie' => { unlock_condition: 'default', color: '#FFFFFF' },
    'Killer' => { unlock_condition: 'first_kill', color: '#FF4444' },
    'Warrior' => { unlock_condition: 'level_5', color: '#FF8800' },
    'Veteran' => { unlock_condition: 'level_10', color: '#4488FF' },
    'Elite' => { unlock_condition: 'level_25', color: '#FFD700' },
    'Legend' => { unlock_condition: 'level_50', color: '#FF1493' },
    'Bomber' => { unlock_condition: 'bomb_plants_25', color: '#FF6600' },
    'Sapper' => { unlock_condition: 'bomb_defuses_25', color: '#0066FF' },
    'Support' => { unlock_condition: 'assists_50', color: '#00FF88' },
    'MVP' => { unlock_condition: 'mvp_25', color: '#FFD700' },
    'Sniper' => { unlock_condition: 'awp_kills_50', color: '#8B4513' },
    'Gunslinger' => { unlock_condition: 'pistol_kills_75', color: '#C0C0C0' },
    'Hot Shot' => { unlock_condition: 'win_streak_5', color: '#FF4500' },
    'Unstoppable' => { unlock_condition: 'win_streak_15', color: '#FF1493' },
    'Ghost' => { unlock_condition: 'no_death_match', color: '#800080' },
    'Clutch King' => { unlock_condition: 'clutch_wins_10', color: '#DA70D6' },
    'Double Agent' => { unlock_condition: 'both_teams_25_wins', color: '#4B0082' },
    'Perfect' => { unlock_condition: 'perfect_game', color: '#FF69B4' },
    'Comeback King' => { unlock_condition: 'comeback_victory', color: '#32CD32' },
    'Centurion' => { unlock_condition: 'kills_100', color: '#B8860B' },
    'Slayer' => { unlock_condition: 'kills_1000', color: '#8B0000' },
    'Dedicated' => { unlock_condition: 'playtime_100h', color: '#008000' }
  }.freeze
  
  COLORS = {
    'White' => '#FFFFFF',
    'Green' => '#00FF00',
    'Red' => '#FF0000',
    'Blue' => '#0000FF',
    'Gold' => '#FFD700',
    'Purple' => '#800080',
    'Orange' => '#FF8800',
    'Pink' => '#FF1493',
    'Cyan' => '#00FFFF',
    'Silver' => '#C0C0C0',
    'Dark Red' => '#8B0000',
    'Dark Green' => '#006400',
    'Royal Blue' => '#4169E1',
    'Hot Pink' => '#FF69B4',
    'Deep Purple' => '#9400D3'
  }.freeze
  
  BADGES = {
    'first_kill' => { name: 'First Blood', icon: '🩸', description: 'Got your first kill' },
    'sharpshooter' => { name: 'Sharpshooter', icon: '🏹', description: 'High accuracy achievement' },
    'clutch_master' => { name: 'Clutch Master', icon: '⚡', description: 'Master of clutch situations' },
    'unstoppable' => { name: 'Unstoppable', icon: '🔥', description: '15 win streak' },
    'dust2_veteran' => { name: 'Dust2 Veteran', icon: '🏜️', description: '50 wins on Dust2' },
    'inferno_specialist' => { name: 'Inferno Specialist', icon: '🔥', description: '50 wins on Inferno' },
    'slayer' => { name: 'Slayer', icon: '⚔️', description: '1000 total kills' },
    'no_life' => { name: 'Dedicated Player', icon: '⏰', description: '100+ hours played' },
    'comeback_king' => { name: 'Comeback King', icon: '👑', description: 'Epic comeback victory' },
    'ace_master' => { name: 'Ace Master', icon: '🃏', description: 'Multiple ace rounds' }
  }.freeze
  
  SPRAYS = {
    'ace_spray' => { name: 'Ace!', icon: '🃏', description: 'Celebrate your ace' },
    'perfect_spray' => { name: 'Perfect', icon: '💯', description: 'Perfect game spray' },
    'gg_spray' => { name: 'GG', icon: '🤝', description: 'Good game spray' },
    'clutch_spray' => { name: 'Clutch', icon: '⚡', description: 'Clutch moment spray' },
    'headshot_spray' => { name: 'Headshot', icon: '🎯', description: 'Headshot celebration' },
    'bomb_spray' => { name: 'Boom', icon: '💥', description: 'Explosive moment' },
    'winner_spray' => { name: 'Winner', icon: '🏆', description: 'Victory celebration' },
    'skill_spray' => { name: 'Skill', icon: '🔥', description: 'Show off your skills' }
  }.freeze
  
  WEAPON_SKINS = {
    'ak47' => {
      'default' => { name: 'Default', rarity: 'common' },
      'carbon_fiber' => { name: 'Carbon Fiber', rarity: 'uncommon', unlock_condition: 'rifle_master' },
      'redline' => { name: 'Redline', rarity: 'rare', unlock_condition: 'ak47_kills_100' },
      'fire_serpent' => { name: 'Fire Serpent', rarity: 'legendary', unlock_condition: 'ak47_kills_500' }
    },
    'm4a1' => {
      'default' => { name: 'Default', rarity: 'common' },
      'carbon_fiber' => { name: 'Carbon Fiber', rarity: 'uncommon', unlock_condition: 'rifle_master' },
      'hyper_beast' => { name: 'Hyper Beast', rarity: 'rare', unlock_condition: 'm4a1_kills_100' },
      'howl' => { name: 'Howl', rarity: 'legendary', unlock_condition: 'm4a1_kills_500' }
    },
    'awp' => {
      'default' => { name: 'Default', rarity: 'common' },
      'dragon_lore' => { name: 'Dragon Lore', rarity: 'legendary', unlock_condition: 'awp_god' },
      'asiimov' => { name: 'Asiimov', rarity: 'epic', unlock_condition: 'awp_kills_25' },
      'lightning_strike' => { name: 'Lightning Strike', rarity: 'rare', unlock_condition: 'awp_headshots_10' }
    },
    'deagle' => {
      'default' => { name: 'Default', rarity: 'common' },
      'blaze' => { name: 'Blaze', rarity: 'rare', unlock_condition: 'deagle_kills_50' },
      'hand_cannon' => { name: 'Hand Cannon', rarity: 'epic', unlock_condition: 'deagle_headshots_25' }
    }
  }.freeze
  
  CROSSHAIR_STYLES = {
    'classic' => { size: 5, gap: -1, thickness: 0, outline: false, color: '#00FF00' },
    'dot' => { size: 0, gap: 0, thickness: 1, outline: true, color: '#FF0000' },
    'cross' => { size: 3, gap: 0, thickness: 1, outline: true, color: '#FFFFFF' },
    'small' => { size: 2, gap: -2, thickness: 0, outline: false, color: '#FFFF00' },
    'large' => { size: 8, gap: 2, thickness: 2, outline: true, color: '#FF00FF' }
  }.freeze
  
  def initialize(player_profile)
    @player_profile = player_profile
  end
  
  # Get all available customization options for the player
  def get_available_options
    {
      titles: get_available_titles,
      colors: get_available_colors,
      badges: get_available_badges,
      sprays: get_available_sprays,
      weapon_skins: get_available_weapon_skins,
      crosshair_styles: CROSSHAIR_STYLES
    }
  end
  
  # Get currently equipped customizations
  def get_current_customizations
    {
      title: @player_profile.current_rewards[:title],
      color: @player_profile.current_rewards[:color],
      badge: @player_profile.current_rewards[:badge],
      spray: @player_profile.current_rewards[:spray],
      weapon_skins: get_equipped_weapon_skins,
      crosshair: @player_profile.customization[:crosshair_settings] || CROSSHAIR_STYLES['classic']
    }
  end
  
  # Update player customizations
  def update_customization(customization_data)
    changes = []
    
    # Update title
    if customization_data[:title] && title_available?(customization_data[:title])
      @player_profile.current_rewards[:title] = customization_data[:title]
      changes << { type: 'title', value: customization_data[:title] }
    end
    
    # Update color
    if customization_data[:color] && color_available?(customization_data[:color])
      @player_profile.current_rewards[:color] = customization_data[:color]
      changes << { type: 'color', value: customization_data[:color] }
    end
    
    # Update badge
    if customization_data[:badge] && badge_available?(customization_data[:badge])
      @player_profile.current_rewards[:badge] = customization_data[:badge]
      changes << { type: 'badge', value: customization_data[:badge] }
    end
    
    # Update spray
    if customization_data[:spray] && spray_available?(customization_data[:spray])
      @player_profile.current_rewards[:spray] = customization_data[:spray]
      changes << { type: 'spray', value: customization_data[:spray] }
    end
    
    # Update weapon skins
    if customization_data[:weapon_skins]
      customization_data[:weapon_skins].each do |weapon, skin|
        if weapon_skin_available?(weapon, skin)
          @player_profile.current_rewards[:weapon_skins] ||= {}
          @player_profile.current_rewards[:weapon_skins][weapon] = skin
          changes << { type: 'weapon_skin', weapon: weapon, skin: skin }
        end
      end
    end
    
    # Update crosshair
    if customization_data[:crosshair]
      @player_profile.customization[:crosshair_settings] = customize_crosshair(customization_data[:crosshair])
      changes << { type: 'crosshair', value: customization_data[:crosshair] }
    end
    
    # Save profile
    @player_profile.save_profile
    
    {
      success: true,
      changes: changes,
      message: "Customization updated successfully!"
    }
  end
  
  # Preview customization without saving
  def preview_customization(customization_data)
    preview = get_current_customizations
    
    # Apply preview changes
    preview[:title] = customization_data[:title] if customization_data[:title] && title_available?(customization_data[:title])
    preview[:color] = customization_data[:color] if customization_data[:color] && color_available?(customization_data[:color])
    preview[:badge] = customization_data[:badge] if customization_data[:badge] && badge_available?(customization_data[:badge])
    preview[:spray] = customization_data[:spray] if customization_data[:spray] && spray_available?(customization_data[:spray])
    
    if customization_data[:weapon_skins]
      customization_data[:weapon_skins].each do |weapon, skin|
        if weapon_skin_available?(weapon, skin)
          preview[:weapon_skins][weapon] = skin
        end
      end
    end
    
    preview[:crosshair] = customize_crosshair(customization_data[:crosshair]) if customization_data[:crosshair]
    
    preview
  end
  
  # Get customization progress and unlock requirements
  def get_unlock_progress
    progress = {}
    
    # Title unlock progress
    TITLES.each do |title, data|
      next if data[:unlock_condition] == 'default'
      progress[title] = calculate_unlock_progress(data[:unlock_condition])
    end
    
    # Weapon skin unlock progress
    WEAPON_SKINS.each do |weapon, skins|
      skins.each do |skin_id, skin_data|
        next unless skin_data[:unlock_condition]
        progress["#{weapon}_#{skin_id}"] = calculate_unlock_progress(skin_data[:unlock_condition])
      end
    end
    
    progress
  end
  
  # Create custom crosshair
  def create_custom_crosshair(settings)
    custom_crosshair = {
      size: settings[:size] || 5,
      gap: settings[:gap] || -1,
      thickness: settings[:thickness] || 0,
      outline: settings[:outline] || false,
      color: settings[:color] || '#00FF00',
      alpha: settings[:alpha] || 255,
      dot: settings[:dot] || false
    }
    
    # Validate ranges
    custom_crosshair[:size] = [[custom_crosshair[:size], 0].max, 20].min
    custom_crosshair[:gap] = [[custom_crosshair[:gap], -10].max, 10].min
    custom_crosshair[:thickness] = [[custom_crosshair[:thickness], 0].max, 5].min
    custom_crosshair[:alpha] = [[custom_crosshair[:alpha], 0].max, 255].min
    
    @player_profile.customization[:crosshair_settings] = custom_crosshair
    @player_profile.save_profile
    
    {
      success: true,
      crosshair: custom_crosshair,
      message: "Custom crosshair created!"
    }
  end
  
  # Get profile display configuration
  def get_display_config
    {
      display_name: @player_profile.display_name,
      title: @player_profile.current_rewards[:title],
      color: @player_profile.current_rewards[:color] || '#FFFFFF',
      badge: @player_profile.current_rewards[:badge],
      level: @player_profile.level,
      rank: @player_profile.rank,
      show_stats: @player_profile.customization.dig(:display_preferences, :show_stats) != false,
      show_achievements: @player_profile.customization.dig(:display_preferences, :show_achievements) != false,
      privacy_level: @player_profile.customization.dig(:display_preferences, :privacy_level) || 'public'
    }
  end
  
  # Update display preferences
  def update_display_preferences(preferences)
    display_prefs = @player_profile.customization[:display_preferences] ||= {}
    
    display_prefs[:show_stats] = preferences[:show_stats] if preferences.key?(:show_stats)
    display_prefs[:show_achievements] = preferences[:show_achievements] if preferences.key?(:show_achievements)
    display_prefs[:privacy_level] = preferences[:privacy_level] if preferences[:privacy_level]
    
    @player_profile.save_profile
    
    {
      success: true,
      preferences: display_prefs,
      message: "Display preferences updated!"
    }
  end
  
  # Import/Export customization settings
  def export_customization
    {
      version: '1.0',
      player_id: @player_profile.player_id,
      exported_at: Time.now,
      customization: {
        title: @player_profile.current_rewards[:title],
        color: @player_profile.current_rewards[:color],
        badge: @player_profile.current_rewards[:badge],
        spray: @player_profile.current_rewards[:spray],
        weapon_skins: @player_profile.current_rewards[:weapon_skins],
        crosshair: @player_profile.customization[:crosshair_settings],
        display_preferences: @player_profile.customization[:display_preferences]
      }
    }
  end
  
  def import_customization(import_data)
    return { success: false, message: 'Invalid import data' } unless import_data[:customization]
    
    customization = import_data[:customization]
    changes = []
    
    # Import each customization if available
    %i[title color badge spray].each do |item|
      if customization[item] && send("#{item}_available?", customization[item])
        @player_profile.current_rewards[item] = customization[item]
        changes << item
      end
    end
    
    # Import weapon skins
    if customization[:weapon_skins]
      customization[:weapon_skins].each do |weapon, skin|
        if weapon_skin_available?(weapon, skin)
          @player_profile.current_rewards[:weapon_skins] ||= {}
          @player_profile.current_rewards[:weapon_skins][weapon] = skin
          changes << "#{weapon}_skin"
        end
      end
    end
    
    # Import crosshair
    if customization[:crosshair]
      @player_profile.customization[:crosshair_settings] = customization[:crosshair]
      changes << 'crosshair'
    end
    
    # Import display preferences
    if customization[:display_preferences]
      @player_profile.customization[:display_preferences] = customization[:display_preferences]
      changes << 'display_preferences'
    end
    
    @player_profile.save_profile
    
    {
      success: true,
      imported_items: changes,
      message: "Customization imported successfully! #{changes.length} items applied."
    }
  end
  
  private
  
  def get_available_titles
    available = ['Rookie'] # Default title always available
    
    @player_profile.unlocked_rewards[:titles].each do |title|
      available << title if TITLES.key?(title)
    end
    
    available.uniq.map { |title| { name: title, color: TITLES[title][:color] } }
  end
  
  def get_available_colors
    available = ['White'] # Default color always available
    
    @player_profile.unlocked_rewards[:colors].each do |color_hex|
      color_name = COLORS.key(color_hex)
      available << color_name if color_name
    end
    
    available.uniq.map { |name| { name: name, hex: COLORS[name] } }
  end
  
  def get_available_badges
    @player_profile.unlocked_rewards[:badges].map do |badge_id|
      badge_info = BADGES[badge_id]
      next unless badge_info
      
      {
        id: badge_id,
        name: badge_info[:name],
        icon: badge_info[:icon],
        description: badge_info[:description]
      }
    end.compact
  end
  
  def get_available_sprays
    @player_profile.unlocked_rewards[:sprays].map do |spray_id|
      spray_info = SPRAYS[spray_id]
      next unless spray_info
      
      {
        id: spray_id,
        name: spray_info[:name],
        icon: spray_info[:icon],
        description: spray_info[:description]
      }
    end.compact
  end
  
  def get_available_weapon_skins
    available = {}
    
    WEAPON_SKINS.each do |weapon, skins|
      available[weapon] = []
      
      skins.each do |skin_id, skin_info|
        # Default skin always available
        if skin_id == 'default'
          available[weapon] << { id: skin_id, name: skin_info[:name], rarity: skin_info[:rarity] }
        # Check if skin is unlocked
        elsif @player_profile.unlocked_rewards[:weapon_skins] &&
              @player_profile.unlocked_rewards[:weapon_skins][weapon.to_s] &&
              @player_profile.unlocked_rewards[:weapon_skins][weapon.to_s].include?(skin_id)
          available[weapon] << { id: skin_id, name: skin_info[:name], rarity: skin_info[:rarity] }
        end
      end
    end
    
    available
  end
  
  def get_equipped_weapon_skins
    equipped = {}
    weapon_skins = @player_profile.current_rewards[:weapon_skins] || {}
    
    WEAPON_SKINS.keys.each do |weapon|
      equipped[weapon] = weapon_skins[weapon.to_s] || 'default'
    end
    
    equipped
  end
  
  def title_available?(title)
    title == 'Rookie' || (@player_profile.unlocked_rewards[:titles] || []).include?(title)
  end
  
  def color_available?(color)
    COLORS.key?(color) && (@player_profile.unlocked_rewards[:colors] || []).include?(COLORS[color])
  end
  
  def badge_available?(badge)
    (@player_profile.unlocked_rewards[:badges] || []).include?(badge)
  end
  
  def spray_available?(spray)
    (@player_profile.unlocked_rewards[:sprays] || []).include?(spray)
  end
  
  def weapon_skin_available?(weapon, skin)
    return true if skin == 'default'
    
    weapon_skins = @player_profile.unlocked_rewards[:weapon_skins]
    return false unless weapon_skins && weapon_skins[weapon.to_s]
    
    weapon_skins[weapon.to_s].include?(skin)
  end
  
  def customize_crosshair(settings)
    if CROSSHAIR_STYLES.key?(settings)
      CROSSHAIR_STYLES[settings]
    elsif settings.is_a?(Hash)
      create_custom_crosshair(settings)[:crosshair]
    else
      CROSSHAIR_STYLES['classic']
    end
  end
  
  def calculate_unlock_progress(condition)
    stats = @player_profile.stats
    
    case condition
    when 'level_5'
      { current: @player_profile.level, required: 5, percentage: [@player_profile.level / 5.0 * 100, 100].min }
    when 'level_10'
      { current: @player_profile.level, required: 10, percentage: [@player_profile.level / 10.0 * 100, 100].min }
    when 'level_25'
      { current: @player_profile.level, required: 25, percentage: [@player_profile.level / 25.0 * 100, 100].min }
    when 'level_50'
      { current: @player_profile.level, required: 50, percentage: [@player_profile.level / 50.0 * 100, 100].min }
    when 'bomb_plants_25'
      current = stats[:bomb_plants] || 0
      { current: current, required: 25, percentage: [current / 25.0 * 100, 100].min }
    when 'bomb_defuses_25'
      current = stats[:bomb_defuses] || 0
      { current: current, required: 25, percentage: [current / 25.0 * 100, 100].min }
    when 'assists_50'
      current = stats[:assists] || 0
      { current: current, required: 50, percentage: [current / 50.0 * 100, 100].min }
    when 'mvp_25'
      current = stats[:mvp_rounds] || 0
      { current: current, required: 25, percentage: [current / 25.0 * 100, 100].min }
    when 'kills_100'
      current = stats[:kills] || 0
      { current: current, required: 100, percentage: [current / 100.0 * 100, 100].min }
    when 'kills_1000'
      current = stats[:kills] || 0
      { current: current, required: 1000, percentage: [current / 1000.0 * 100, 100].min }
    when 'win_streak_5'
      current = stats[:best_win_streak] || 0
      { current: current, required: 5, percentage: [current / 5.0 * 100, 100].min }
    when 'win_streak_15'
      current = stats[:best_win_streak] || 0
      { current: current, required: 15, percentage: [current / 15.0 * 100, 100].min }
    when 'playtime_100h'
      current_hours = (stats[:total_play_time] || 0) / 3600.0
      { current: current_hours.round(1), required: 100, percentage: [current_hours / 100.0 * 100, 100].min }
    else
      { current: 0, required: 1, percentage: 0 }
    end
  end
end