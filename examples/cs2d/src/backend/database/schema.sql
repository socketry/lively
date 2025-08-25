-- CS2D Enhanced Multiplayer Database Schema
-- PostgreSQL schema with comprehensive user, game, and anti-cheat systems

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table with Steam integration
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    steam_id VARCHAR(17) UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    country_code CHAR(2),
    language_code VARCHAR(5) DEFAULT 'en',
    is_verified BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    ban_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    last_activity_at TIMESTAMP,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    hardware_id VARCHAR(255),
    trust_factor DECIMAL(3,2) DEFAULT 1.00
);

-- Player statistics
CREATE TABLE player_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    headshots INTEGER DEFAULT 0,
    rounds_played INTEGER DEFAULT 0,
    rounds_won INTEGER DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    damage_dealt INTEGER DEFAULT 0,
    damage_taken INTEGER DEFAULT 0,
    shots_fired INTEGER DEFAULT 0,
    shots_hit INTEGER DEFAULT 0,
    plants INTEGER DEFAULT 0,
    defuses INTEGER DEFAULT 0,
    rescues INTEGER DEFAULT 0,
    mvps INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    playtime_seconds INTEGER DEFAULT 0,
    elo_rating INTEGER DEFAULT 1000,
    rank_tier INTEGER DEFAULT 1,
    rank_points INTEGER DEFAULT 0,
    peak_elo INTEGER DEFAULT 1000,
    win_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Friends system
CREATE TABLE friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    UNIQUE(user_id, friend_id)
);

-- Game matches
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_name VARCHAR(50) NOT NULL,
    game_mode VARCHAR(20) NOT NULL CHECK (game_mode IN ('classic', 'deathmatch', 'casual', 'competitive')),
    server_id VARCHAR(50),
    max_players INTEGER DEFAULT 10,
    duration_seconds INTEGER,
    rounds_played INTEGER DEFAULT 0,
    winner_team VARCHAR(10) CHECK (winner_team IN ('CT', 'T', 'draw')),
    ct_score INTEGER DEFAULT 0,
    t_score INTEGER DEFAULT 0,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'starting', 'live', 'finished', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match players (who played in each match)
CREATE TABLE match_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team VARCHAR(10) NOT NULL CHECK (team IN ('CT', 'T', 'spectator')),
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    headshots INTEGER DEFAULT 0,
    damage_dealt INTEGER DEFAULT 0,
    damage_taken INTEGER DEFAULT 0,
    plants INTEGER DEFAULT 0,
    defuses INTEGER DEFAULT 0,
    mvp_rounds INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    ping_avg INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    disconnected BOOLEAN DEFAULT FALSE,
    UNIQUE(match_id, user_id)
);

-- Round statistics (detailed per-round data)
CREATE TABLE round_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    team VARCHAR(10) NOT NULL,
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    damage_dealt INTEGER DEFAULT 0,
    weapon_used VARCHAR(50),
    survived BOOLEAN DEFAULT FALSE,
    mvp BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory system (skins, items)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('weapon_skin', 'player_model', 'spray', 'sticker')),
    item_name VARCHAR(100) NOT NULL,
    rarity VARCHAR(20),
    condition_float DECIMAL(10,8),
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trade_lock_expires TIMESTAMP,
    is_equipped BOOLEAN DEFAULT FALSE
);

-- Achievements system
CREATE TABLE achievements (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    points INTEGER DEFAULT 0,
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(100) NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    max_progress INTEGER DEFAULT 1,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- Clans/Teams system
CREATE TABLE clans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    tag VARCHAR(8) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    owner_id UUID NOT NULL REFERENCES users(id),
    member_limit INTEGER DEFAULT 50,
    is_public BOOLEAN DEFAULT TRUE,
    elo_rating INTEGER DEFAULT 1000,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clan members
CREATE TABLE clan_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(clan_id, user_id)
);

-- Tournaments
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    format VARCHAR(20) DEFAULT 'single_elimination' CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin', 'swiss')),
    max_teams INTEGER NOT NULL,
    entry_fee INTEGER DEFAULT 0,
    prize_pool INTEGER DEFAULT 0,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    registration_deadline TIMESTAMP,
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'registration_open', 'registration_closed', 'in_progress', 'finished', 'cancelled')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tournament participants
CREATE TABLE tournament_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    clan_id UUID REFERENCES clans(id) ON DELETE CASCADE,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    seed_number INTEGER,
    is_eliminated BOOLEAN DEFAULT FALSE,
    CHECK ((user_id IS NOT NULL) OR (clan_id IS NOT NULL))
);

-- Anti-cheat reports
CREATE TABLE cheat_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    reported_id UUID NOT NULL REFERENCES users(id),
    match_id UUID REFERENCES matches(id),
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('aimbot', 'wallhack', 'speedhack', 'griefing', 'toxic_behavior', 'other')),
    description TEXT,
    evidence_urls TEXT[], -- Array of URLs to screenshots/videos
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Anti-cheat violations (automated detection)
CREATE TABLE cheat_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    match_id UUID REFERENCES matches(id),
    violation_type VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    detection_data JSONB,
    auto_action VARCHAR(20) CHECK (auto_action IN ('none', 'flag', 'kick', 'temp_ban', 'permanent_ban')),
    reviewed BOOLEAN DEFAULT FALSE,
    reviewer_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Server instances
CREATE TABLE game_servers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    region VARCHAR(20) NOT NULL,
    ip_address INET NOT NULL,
    port INTEGER NOT NULL,
    max_players INTEGER DEFAULT 10,
    current_players INTEGER DEFAULT 0,
    map_name VARCHAR(50),
    game_mode VARCHAR(20),
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('offline', 'starting', 'online', 'full', 'maintenance')),
    version VARCHAR(20),
    last_heartbeat TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match replays
CREATE TABLE match_replays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    compression_type VARCHAR(20) DEFAULT 'gzip',
    duration_seconds INTEGER,
    tick_rate INTEGER DEFAULT 64,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- User sessions (for JWT token management)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX idx_users_steam_id ON users(steam_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_activity ON users(last_activity_at);

CREATE INDEX idx_player_stats_elo ON player_stats(elo_rating DESC);
CREATE INDEX idx_player_stats_rank ON player_stats(rank_tier, rank_points DESC);

CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_started_at ON matches(started_at DESC);
CREATE INDEX idx_matches_server_id ON matches(server_id);

CREATE INDEX idx_match_players_match_id ON match_players(match_id);
CREATE INDEX idx_match_players_user_id ON match_players(user_id);

CREATE INDEX idx_friends_user_id ON friends(user_id);
CREATE INDEX idx_friends_friend_id ON friends(friend_id);
CREATE INDEX idx_friends_status ON friends(status);

CREATE INDEX idx_inventory_user_id ON inventory(user_id);
CREATE INDEX idx_inventory_equipped ON inventory(user_id, is_equipped) WHERE is_equipped = TRUE;

CREATE INDEX idx_cheat_reports_reported_id ON cheat_reports(reported_id);
CREATE INDEX idx_cheat_reports_status ON cheat_reports(status);

CREATE INDEX idx_cheat_violations_user_id ON cheat_violations(user_id);
CREATE INDEX idx_cheat_violations_confidence ON cheat_violations(confidence_score DESC);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_player_stats_updated_at BEFORE UPDATE ON player_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cheat_reports_updated_at BEFORE UPDATE ON cheat_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();