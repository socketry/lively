# CS2D Fixes Summary - August 14, 2025

## Issues Addressed

### 1. ✅ Scoreboard Tab Display
**Problem**: Tab key scoreboard display was not updating properly  
**Solution**: Added `updateScoreboard()` call before showing the scoreboard to ensure fresh data is displayed
**Files Modified**: `public/game.html` (line 696)

### 2. ✅ Shotgun Shooting Mechanics
**Problem**: Shotguns (M3, XM1014) were shooting single bullets instead of multiple pellets  
**Solution**: 
- Implemented shotgun spread pattern with multiple pellets
- M3 shoots 8 pellets, XM1014 shoots 6 pellets
- Added spread angle and velocity variation
- Created special shotgun muzzle flash effect
- Updated purchase system to handle shotgun ammo properly
**Files Modified**: `public/game.html` (shoot(), createShotgunMuzzleFlash(), purchaseItem() methods)

### 3. ✅ Language Switcher Visibility
**Problem**: Language switcher appeared on all pages (lobby, room, game)  
**Solution**: Modified i18n.js to only show language switcher on lobby page (port 9292)
- Language preference is saved in localStorage
- Room and game pages use saved preference without showing switcher
**Files Modified**: `public/_static/i18n.js` (createLanguageSwitcher() method)

## Testing

Run the test script to verify all fixes:
```bash
node test_fixes.js
```

## Technical Details

### Shotgun Implementation
- **Damage per pellet**: M3 = 20, XM1014 = 22
- **Pellet count**: M3 = 8, XM1014 = 6  
- **Spread angle**: 0.15 radians
- **Fire rate**: M3 = 880ms (pump-action), XM1014 = 250ms (auto)
- **Magazine size**: M3 = 8 rounds, XM1014 = 7 rounds
- **Reserve ammo**: 32 shells

### Language System
- Language preference stored in `cs2d_locale` localStorage key
- Available languages: English (en), Traditional Chinese (zh_TW)
- Switcher only visible on lobby page (http://localhost:9292)
- All static pages respect saved language preference

### Scoreboard
- Updates player list with current scores, kills, deaths
- Shows on Tab key press, hides on release
- Displays bot indicators and difficulty-based colors
- Updates content before each display to ensure fresh data

## Deployment Notes

1. Ensure all servers are running:
   ```bash
   ./start_hybrid_servers.sh
   ```

2. Test in order:
   - Visit lobby (http://localhost:9292) - verify language switcher present
   - Create room and navigate to room page - verify no language switcher
   - Start game - verify shotgun mechanics and scoreboard work

3. Clear browser cache if language settings don't persist