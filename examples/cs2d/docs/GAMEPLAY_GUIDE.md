# CS2D - Complete Gameplay Guide

## Table of Contents

1. [Game Overview](#game-overview)
2. [Controls](#controls)
3. [Game Mechanics](#game-mechanics)
4. [Weapons & Equipment](#weapons--equipment)
5. [Economy System](#economy-system)
6. [Maps & Objectives](#maps--objectives)
7. [Strategies & Tips](#strategies--tips)
8. [Mac Optimization](#mac-optimization)

## Game Overview

CS2D is a 2D top-down adaptation of Counter-Strike 1.6, featuring the classic bomb defusal gameplay optimized for web browsers and Mac touchpad controls.

### Teams

- **Counter-Terrorists (CT)** - Blue team, defend bomb sites
- **Terrorists (T)** - Orange team, plant the bomb

### Victory Conditions

**Terrorists Win:**

- Successfully detonate the bomb
- Eliminate all Counter-Terrorists
- Time runs out with bomb planted

**Counter-Terrorists Win:**

- Defuse the planted bomb
- Eliminate all Terrorists
- Prevent bomb plant until time expires

## Controls

### Movement & Combat

| Action         | Primary Key  | Alternative | Description                    |
| -------------- | ------------ | ----------- | ------------------------------ |
| **Move**       | W/A/S/D      | -           | Move up/left/down/right        |
| **Sprint**     | Shift + WASD | -           | Move faster (consumes stamina) |
| **Aim**        | Arrow Keys   | I/J/K/L     | Rotate aim direction           |
| **Shoot**      | Spacebar     | Left Click  | Fire weapon                    |
| **Reload**     | R            | -           | Reload current weapon          |
| **Quick Turn** | Q            | -           | Instant 180° rotation          |
| **Interact**   | E            | -           | Plant/defuse bomb              |

### Interface Controls

| Action              | Key | Description               |
| ------------------- | --- | ------------------------- |
| **Buy Menu**        | B   | Open/close buy menu       |
| **Scoreboard**      | Tab | View match statistics     |
| **Chat**            | T   | Open team chat            |
| **Auto-aim Toggle** | V   | Enable/disable aim assist |

### Quick Buy Shortcuts

| Key   | Weapon       | Price | Team    |
| ----- | ------------ | ----- | ------- |
| **1** | AK-47        | $2700 | T only  |
| **2** | M4A1         | $3100 | CT only |
| **3** | AWP          | $4750 | Both    |
| **4** | Desert Eagle | $650  | Both    |
| **5** | Kevlar Vest  | $650  | Both    |

## Game Mechanics

### Round Structure

1. **Freeze Time** (5 seconds)
   - Players spawn at team bases
   - Cannot move but can open buy menu
   - Plan your strategy

2. **Buy Time** (15 seconds)
   - Movement enabled
   - Purchase weapons and equipment
   - Get into position

3. **Round Time** (1:55)
   - Main gameplay phase
   - Complete objectives
   - Eliminate enemies

4. **Round End**
   - Display results
   - Award money based on performance
   - Reset for next round

### Health & Armor System

- **Health Points**: 100 HP maximum
  - No health regeneration
  - Death at 0 HP
- **Armor**: 0-100 points
  - Absorbs 50% of damage
  - Kevlar Vest: $650
  - Helmet: +$350 (requires vest)

### Damage Model

| Body Part | Damage Multiplier   |
| --------- | ------------------- |
| Head      | 4x (without helmet) |
| Head      | 1.5x (with helmet)  |
| Chest     | 1x                  |
| Limbs     | 0.75x               |

## Weapons & Equipment

### Pistols

| Weapon           | Damage | Fire Rate | Magazine | Price | Notes                      |
| ---------------- | ------ | --------- | -------- | ----- | -------------------------- |
| **USP**          | 35     | Slow      | 12       | Free  | CT default, accurate       |
| **Glock-18**     | 28     | Fast      | 20       | Free  | T default, high capacity   |
| **Desert Eagle** | 48     | Very Slow | 7        | $650  | High damage, low fire rate |

### Rifles

| Weapon    | Damage | Fire Rate | Magazine | Price | Team | Notes                        |
| --------- | ------ | --------- | -------- | ----- | ---- | ---------------------------- |
| **AK-47** | 36     | Fast      | 30       | $2700 | T    | High damage, moderate recoil |
| **M4A1**  | 33     | Fast      | 30       | $3100 | CT   | Accurate, silenced option    |
| **AWP**   | 115    | Very Slow | 10       | $4750 | Both | One-shot kill, slow movement |

### Equipment

| Item            | Price | Team | Effect                             |
| --------------- | ----- | ---- | ---------------------------------- |
| **Kevlar Vest** | $650  | Both | 100 armor points                   |
| **Helmet**      | $350  | Both | Head protection (requires vest)    |
| **Defuse Kit**  | $400  | CT   | Reduces defuse time from 10s to 5s |

## Economy System

### Starting Money

- First round: **$800**
- Maximum money: **$16,000**

### Kill Rewards

| Weapon Type | Reward |
| ----------- | ------ |
| Knife       | $1500  |
| Pistol      | $300   |
| SMG         | $600   |
| Rifle       | $300   |
| AWP         | $100   |

### Round Rewards

| Outcome         | Reward                                        |
| --------------- | --------------------------------------------- |
| **Win Round**   | $3250                                         |
| **Lose Round**  | $1400 + $500 per consecutive loss (max $3400) |
| **Plant Bomb**  | $800 (T team bonus)                           |
| **Defuse Bomb** | $3500 (defuser bonus)                         |

### Money Management Tips

- Save on eco rounds
- Buy as a team for maximum effectiveness
- Consider force-buying after consecutive losses
- Drop weapons for teammates when wealthy

## Maps & Objectives

### de_dust2_mini

A simplified version of the classic map featuring:

```
[T Spawn]                    [CT Spawn]
    |                            |
    ├──────[Middle]──────────────┤
    |         |                  |
[Bomb Site A] |              [Bomb Site B]
```

#### Key Areas

- **Bomb Site A**: Western bomb plant zone
- **Bomb Site B**: Eastern bomb plant zone
- **Middle**: Central corridor, key control point
- **Spawn Areas**: Protected team starting zones

### Bomb Mechanics

#### Planting (Terrorists)

1. Enter bomb site radius (marked zones)
2. Hold **E** for 3 seconds
3. Stay still during plant animation
4. Bomb timer: 45 seconds after plant

#### Defusing (Counter-Terrorists)

1. Approach planted bomb
2. Hold **E** for 10 seconds (5s with kit)
3. Cannot move while defusing
4. Must complete before explosion

## Strategies & Tips

### General Tips

1. **Crosshair Placement**: Keep aim at head level
2. **Economy Management**: Coordinate buys with team
3. **Map Control**: Hold key positions early
4. **Communication**: Use visual cues and positioning
5. **Patience**: Don't rush unnecessarily

### Terrorist Strategies

- **Rush B**: Fast coordinated push to Site B
- **Split A**: Divide team to attack from multiple angles
- **Fake Plant**: Start planting to bait CTs, then rotate
- **Save the AWP**: Protect expensive weapons on eco rounds

### Counter-Terrorist Strategies

- **Stack Sites**: Concentrate defense based on enemy patterns
- **Retake Setup**: Position for coordinated site retakes
- **Economy Denial**: Hunt saving enemies
- **Kit Priority**: Ensure at least 2 defuse kits per round

### Combat Techniques

#### Peeking

- **Wide Peek**: Fast movement to catch enemies off-guard
- **Shoulder Peek**: Brief exposure to bait shots
- **Jiggle Peek**: Repeated quick peeks for information

#### Positioning

- **Off-angles**: Unexpected positions that delay enemy reaction
- **Headshot Angles**: Positions where only head is exposed
- **Crossfire Setup**: Coordinate with teammates for multiple angles

## Mac Optimization

### Touchpad Gestures

| Gesture                         | Action       | Description                      |
| ------------------------------- | ------------ | -------------------------------- |
| **Two-finger Horizontal Swipe** | Rotate Aim   | Smooth aiming adjustment         |
| **Two-finger Vertical Swipe**   | Aim Distance | Adjust crosshair distance        |
| **Two-finger Tap**              | Shoot        | Alternative fire method          |
| **Pinch**                       | Zoom View    | Tactical overview (if supported) |

### Recommended Settings for Mac Users

1. **Enable Auto-Aim Assist** (V key)
   - Helps compensate for touchpad precision
   - Subtle tracking on nearby enemies
   - Toggle based on preference

2. **Use Keyboard Aiming**
   - Arrow keys or IJKL for precise control
   - More reliable than touchpad for quick adjustments
   - Combine with auto-aim for best results

3. **Quick Buy Binds**
   - Memorize number keys 1-5
   - Faster than navigating buy menu
   - Essential for buy time efficiency

### Performance Tips

1. **Browser Choice**: Use Safari or Chrome for best performance
2. **Close Background Apps**: Reduce system load
3. **Fullscreen Mode**: F11 for immersive experience
4. **Hardware Acceleration**: Enable in browser settings

## Advanced Techniques

### Movement Mechanics

#### Strafing

- Alternate A/D rapidly while aiming
- Makes you harder to hit
- Maintain accuracy by stopping before shooting

#### Counter-Strafing

- Tap opposite direction to stop instantly
- Essential for accurate shooting
- Practice: W→S or A→D quick taps

### Weapon Control

#### Recoil Management

- **Burst Fire**: 2-3 bullet bursts for accuracy
- **Spray Control**: Pull down gradually during full auto
- **Reset Time**: Wait briefly between bursts

#### Pre-firing

- Shoot common angles before fully peeking
- Effective against predictable positions
- Combine with game sense and timing

### Game Sense

#### Sound Cues

- Footsteps indicate enemy proximity
- Reload sounds reveal vulnerability
- Bomb plant/defuse audio is crucial

#### Timing

- Learn rotation times between sites
- Track enemy economy for buy predictions
- Monitor bomb timer for defuse decisions

## Troubleshooting

### Common Issues

| Problem                    | Solution                                 |
| -------------------------- | ---------------------------------------- |
| **Lag/Stuttering**         | Reduce browser tabs, check connection    |
| **Controls Not Working**   | Refresh page, check keyboard language    |
| **Can't Buy Weapons**      | Ensure buy time active, check money      |
| **Touchpad Too Sensitive** | Adjust system settings, use keyboard aim |

### Performance Optimization

1. Update browser to latest version
2. Clear browser cache regularly
3. Disable unnecessary browser extensions
4. Use wired connection over WiFi when possible

## Glossary

| Term           | Definition                               |
| -------------- | ---------------------------------------- |
| **Eco**        | Economic round - saving money            |
| **Force Buy**  | Spending despite low economy             |
| **Rotation**   | Moving between bomb sites                |
| **Stack**      | Multiple players at one site             |
| **Lurk**       | Solo player playing for late-round picks |
| **Entry Frag** | First kill when entering a site          |
| **Trade Kill** | Quick revenge kill after teammate dies   |
| **Clutch**     | Winning when outnumbered                 |
| **Ace**        | One player kills entire enemy team       |

---

## Quick Reference Card

### Essential Binds

```
Movement:  WASD + Shift
Aim:       ←↑→↓ or IJKL
Shoot:     Spacebar
Reload:    R
Use:       E
Buy:       B
```

### Buy Priorities

```
Round 1:    Armor OR Utility
Anti-eco:   SMG + Armor
Buy Round:  Rifle + Armor + Utility
Force Buy:  Best available + Armor
Save:       Nothing or Pistol
```

### Communication Calls

```
"Rush B"     - Fast B site push
"Eco"        - Save round
"Force"      - Force buy
"Stack A"    - Heavy A defense
"Rotate"     - Change sites
"Save"       - Don't fight, save weapon
"Last one X" - Final enemy location
```

---

_For more information and updates, visit the [CS2D GitHub Repository](https://github.com/yourusername/cs2d)_
