# frozen_string_literal: true

require "json"

# Internationalization module for CS2D game
module I18n
	class << self
		attr_accessor :locale, :translations
		
		# Initialize with default locale
		def initialize!
			@locale = :zh_TW # Default to Traditional Chinese
			@translations = {}
			load_translations
		end
		
		# Load all translation files
		def load_translations
			@translations = {
				en: english_translations,
				zh_TW: traditional_chinese_translations
			}
		end
		
		# Get translation for key
		def t(key, **options)
			keys = key.to_s.split(".")
			translation = @translations[@locale] || @translations[:en]
			
			# Navigate through nested keys
			keys.each do |k|
				translation = translation[k.to_sym] if translation.is_a?(Hash)
			end
			
			# Handle interpolation
			if translation.is_a?(String) && !options.empty?
				options.each do |key, value|
					translation = translation.gsub("%{#{key}}", value.to_s)
				end
			end
			
			translation || key.to_s
		end
		
		# Switch locale
		def locale=(new_locale)
			@locale = new_locale.to_sym if [:en, :zh_TW].include?(new_locale.to_sym)
		end
		
		# Get available locales
		def available_locales
			[:en, :zh_TW]
		end
		
		# Get locale display name
		def locale_name(locale = @locale)
			case locale
			when :en then "English"
			when :zh_TW then "繁體中文"
			else locale.to_s
			end
		end
		
		private
		
		# English translations
		def english_translations
			{
				lobby: {
					title: "🎮 CS2D Multiplayer Game Lobby",
					subtitle: "(Async Redis)",
					player: {
						current_id: "Player ID:",
						edit: "Edit",
						change_id: "Change Player ID",
						id_explanation: "Your Player ID is stored in a cookie and persists across sessions. You can change it if needed.",
						new_id: "New Player ID:",
						save: "Save",
						cancel: "Cancel",
						id_required: "Player ID cannot be empty",
						id_too_long: "Player ID must be 50 characters or less",
						id_changed: "Player ID changed successfully",
						nickname: "Nickname:",
						click_to_copy: "Click to copy full ID"
					},
					stats: {
						online_rooms: "Online Rooms",
						online_players: "Online Players",
						loading: "Loading..."
					},
					tabs: {
						create_room: "Create Room",
						join_room: "Join Room"
					},
					create: {
						title: "Create New Room",
						player_id: "Player ID (Optional):",
						player_id_placeholder: "Auto-generate if empty",
						room_name: "Room Name:",
						room_name_placeholder: "Enter room name",
						max_players: "Max Players:",
						players_count: "%{count} players",
						map: "Map:",
						create_button: "Create Room"
					},
					join: {
						title: "Join Room",
						quick_join_label: "Player ID (Optional):",
						quick_join_placeholder: "Auto-generate if empty",
						quick_join_button: "🎯 Quick Join",
						room_list_title: "Available Rooms",
						no_rooms: "No rooms available. Please create a new room or try again later.",
						room_id: "Room ID",
						players: "Players",
						map: "Map",
						status: "Status",
						room_full: "Room Full",
						join_button: "Join Room",
						player_id_placeholder: "Player ID (Optional)"
					},
					start: {
						creator_id_placeholder: "Room Creator ID",
						start_button: "🚀 Start Game"
					},
					messages: {
						room_name_required: "Please enter a room name",
						room_created: "Room created successfully! Room ID: %{room_id}",
						room_create_failed: "Failed to create room: %{error}",
						room_joined: "Successfully joined room: %{room_id}",
						room_join_failed: "Cannot join room: Room is full or does not exist",
						quick_join_success: "Quick join successful! Room ID: %{room_id}",
						quick_join_failed: "Quick join failed: Server error",
						game_started: "Game started! Redirecting to game... Room ID: %{room_id}",
						game_start_failed: "Failed to start game: %{error}",
						error: "Error: %{message}",
						id_copied: "Player ID copied!"
					},
					room_states: {
						waiting: "Waiting",
						starting: "Starting",
						in_progress: "In Progress",
						playing: "Playing",
						finished: "Finished"
					}
				},
				game: {
					loading: {
						title: "Counter-Strike 1.6 Classic",
						loading_map: "Loading %{map}...",
						rules: "Classic Competitive Rules"
					},
					interface: {
						room: "Room: %{room_id}",
						players: "Players: %{count}/%{max}",
						press_b_buy: "Press B for Buy Menu",
						buy_zone: "BUY ZONE",
						press_b_to_buy: "Press B to buy",
						buy_zone_expired: "Buy Zone (Buy time expired)",
						buy_time_return: "Buy Time: %{seconds}s (Return to buy zone)",
						freeze_can_buy: "Freeze Time - Can Buy",
						buy_time_left: "Buy Time: %{seconds}s",
						low_ammo: "LOW AMMO",
						empty_clip: "EMPTY",
						warmup: "WARMUP",
						buy_menu_title: "🛒 Buy Menu",
						close_menu: "Close Menu (ESC)",
						buy_time_expired: "Buy time expired"
					},
					teams: {
						terrorist: "Terrorist",
						counter_terrorist: "Counter-Terrorist",
						spectator: "Spectator"
					},
					weapons: {
						glock: "Glock-18",
						usp: "USP",
						p228: "P228",
						deagle: "Desert Eagle",
						fiveseven: "Five-SeveN",
						elite: "Dual Berettas",
						m3: "M3 Super 90",
						xm1014: "XM1014",
						mp5: "MP5",
						tmp: "TMP",
						p90: "P90",
						mac10: "MAC-10",
						ump45: "UMP-45",
						famas: "FAMAS",
						galil: "Galil",
						ak47: "AK-47",
						m4a1: "M4A1",
						sg552: "SG-552",
						aug: "AUG",
						scout: "Scout",
						awp: "AWP",
						g3sg1: "G3/SG-1",
						sg550: "SG-550",
						m249: "M249",
						hegrenade: "HE Grenade",
						flashbang: "Flashbang",
						smokegrenade: "Smoke Grenade",
						knife: "Knife",
						bomb: "C4 Bomb"
					},
					hud: {
						health: "Health",
						armor: "Armor",
						money: "Money",
						ammo: "Ammo",
						time: "Time",
						score: "Score",
						round: "Round %{current}/%{total}",
						bomb_planted: "Bomb Planted",
						bomb_defused: "Bomb Defused",
						buying_time: "Buying Time"
					},
					messages: {
						round_start: "Round Start",
						round_end: "Round End",
						terrorists_win: "Terrorists Win",
						counter_terrorists_win: "Counter-Terrorists Win",
						bomb_planted: "The bomb has been planted",
						bomb_defused: "The bomb has been defused",
						player_killed: "%{killer} killed %{victim}",
						you_killed: "You killed %{victim}",
						killed_by: "Killed by %{killer}",
						headshot: "Headshot!",
						team_kill: "Team Kill!",
						last_round: "Last Round",
						match_point: "Match Point",
						overtime: "Overtime"
					}
				},
				settings: {
					title: "Settings",
					language: "Language",
					volume: "Volume",
					sensitivity: "Mouse Sensitivity",
					crosshair: "Crosshair",
					graphics: "Graphics Quality",
					low: "Low",
					medium: "Medium",
					high: "High",
					apply: "Apply",
					cancel: "Cancel",
					reset: "Reset to Default"
				}
			}
		end
		
		# Traditional Chinese translations
		def traditional_chinese_translations
			{
				lobby: {
					title: "🎮 CS2D 多人遊戲大廳",
					subtitle: "(Async Redis)",
					player: {
						current_id: "玩家 ID:",
						edit: "編輯",
						change_id: "更改玩家 ID",
						id_explanation: "您的玩家 ID 儲存在 Cookie 中，可在多次造訪時保持不變。如需要可以更改。",
						new_id: "新玩家 ID:",
						save: "儲存",
						cancel: "取消",
						id_required: "玩家 ID 不能為空",
						id_too_long: "玩家 ID 長度不能超過 50 個字元",
						id_changed: "玩家 ID 更改成功",
						nickname: "暱稱:",
						click_to_copy: "點擊複製完整 ID"
					},
					stats: {
						online_rooms: "線上房間",
						online_players: "線上玩家",
						loading: "載入中..."
					},
					tabs: {
						create_room: "創建房間",
						join_room: "加入房間"
					},
					create: {
						title: "創建新房間",
						player_id: "玩家 ID (選填):",
						player_id_placeholder: "留空自動生成",
						room_name: "房間名稱:",
						room_name_placeholder: "輸入房間名稱",
						max_players: "最大玩家數:",
						players_count: "%{count} 人",
						map: "地圖:",
						create_button: "創建房間"
					},
					join: {
						title: "加入房間",
						quick_join_label: "玩家 ID (選填):",
						quick_join_placeholder: "留空自動生成",
						quick_join_button: "🎯 快速加入",
						room_list_title: "可用房間列表",
						no_rooms: "暫無可用房間，請創建新房間或稍後再試。",
						room_id: "房間 ID",
						players: "玩家",
						map: "地圖",
						status: "狀態",
						room_full: "房間已滿",
						join_button: "加入房間",
						player_id_placeholder: "玩家 ID (選填)"
					},
					start: {
						creator_id_placeholder: "房間創建者 ID",
						start_button: "🚀 開始遊戲"
					},
					messages: {
						room_name_required: "請輸入房間名稱",
						room_created: "房間創建成功！房間 ID: %{room_id}",
						room_create_failed: "創建房間失敗: %{error}",
						room_joined: "成功加入房間: %{room_id}",
						room_join_failed: "無法加入房間：房間已滿或不存在",
						quick_join_success: "快速加入成功！房間 ID: %{room_id}",
						quick_join_failed: "快速加入失敗：伺服器錯誤",
						game_started: "遊戲已開始！正在跳轉到遊戲... 房間 ID: %{room_id}",
						game_start_failed: "遊戲開始失敗: %{error}",
						error: "錯誤: %{message}",
						id_copied: "已複製玩家 ID！"
					},
					room_states: {
						waiting: "等待中",
						starting: "開始中",
						in_progress: "進行中",
						playing: "遊戲中",
						finished: "已結束"
					}
				},
				game: {
					loading: {
						title: "反恐精英 1.6 經典版",
						loading_map: "載入地圖 %{map}...",
						rules: "經典競技規則"
					},
					interface: {
						room: "房間: %{room_id}",
						players: "玩家: %{count}/%{max}",
						press_b_buy: "按 B 鍵開啟購買選單",
						buy_zone: "購買區域",
						press_b_to_buy: "按 B 鍵購買",
						buy_zone_expired: "購買區域 (購買時間已過)",
						buy_time_return: "購買時間: %{seconds}秒 (回到購買區域)",
						freeze_can_buy: "凍結時間 - 可購買",
						buy_time_left: "購買時間: %{seconds}秒",
						low_ammo: "彈藥不足",
						empty_clip: "空彈匣",
						warmup: "熱身時間",
						buy_menu_title: "🛒 購買選單",
						close_menu: "關閉選單 (ESC)",
						buy_time_expired: "購買時間已過"
					},
					teams: {
						terrorist: "恐怖份子",
						counter_terrorist: "反恐精英",
						spectator: "觀察者"
					},
					weapons: {
						glock: "格洛克-18",
						usp: "USP",
						p228: "P228",
						deagle: "沙漠之鷹",
						fiveseven: "Five-SeveN",
						elite: "雙持貝瑞塔",
						m3: "M3 Super 90",
						xm1014: "XM1014",
						mp5: "MP5",
						tmp: "TMP",
						p90: "P90",
						mac10: "MAC-10",
						ump45: "UMP-45",
						famas: "FAMAS",
						galil: "加利爾",
						ak47: "AK-47",
						m4a1: "M4A1",
						sg552: "SG-552",
						aug: "AUG",
						scout: "Scout",
						awp: "AWP",
						g3sg1: "G3/SG-1",
						sg550: "SG-550",
						m249: "M249",
						hegrenade: "高爆手榴彈",
						flashbang: "閃光彈",
						smokegrenade: "煙霧彈",
						knife: "刀",
						bomb: "C4 炸彈"
					},
					hud: {
						health: "生命值",
						armor: "護甲",
						money: "金錢",
						ammo: "彈藥",
						time: "時間",
						score: "分數",
						round: "第 %{current}/%{total} 回合",
						bomb_planted: "炸彈已安放",
						bomb_defused: "炸彈已拆除",
						buying_time: "購買時間"
					},
					messages: {
						round_start: "回合開始",
						round_end: "回合結束",
						terrorists_win: "恐怖份子勝利",
						counter_terrorists_win: "反恐精英勝利",
						bomb_planted: "炸彈已被安放",
						bomb_defused: "炸彈已被拆除",
						player_killed: "%{killer} 擊殺了 %{victim}",
						you_killed: "你擊殺了 %{victim}",
						killed_by: "被 %{killer} 擊殺",
						headshot: "爆頭！",
						team_kill: "誤殺隊友！",
						last_round: "最後一回合",
						match_point: "賽點",
						overtime: "加時賽"
					}
				},
				settings: {
					title: "設定",
					language: "語言",
					volume: "音量",
					sensitivity: "滑鼠靈敏度",
					crosshair: "準心",
					graphics: "畫質",
					low: "低",
					medium: "中",
					high: "高",
					apply: "套用",
					cancel: "取消",
					reset: "重設為預設值"
				}
			}
		end
	end
end

# Initialize i18n on module load
I18n.initialize!