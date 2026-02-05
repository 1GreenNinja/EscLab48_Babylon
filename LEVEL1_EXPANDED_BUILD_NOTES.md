# Level 1 Expanded Build Notes

## Overview
Level 1 has been rebuilt to match the map design in `LEVEL1_MAP.html`.

## Layout Structure

### Cells (West Side - Vertical Column)
1. **Jake's Cell (Cell 1)** - Z: 0
   - Starting location with bed, restraints, toilet
   - Computer terminal for door unlock
   - Bendable bars on east side
   
2. **Cell 2 (Abandoned)** - Z: -8
   - Flickering lights
   - Rusted, broken bars (can walk through)
   - Overturned furniture
   
3. **Cell 3 (Empty)** - Z: -16
   - Intact bars
   - Dim lighting
   
4. **Cell 4 (Skeleton)** - Z: -24
   - Skeleton in corner with old key hint
   - **SECRET PANEL on LEFT WALL** → Underground passage
   - Broken bars for entry

### Main Hallway (Center - Horizontal)
- X: 5 (East of cells)
- Connects cells to rooms
- Runs north-south from Z: 0 to Z: -24
- Doorways to all cells on west side
- Doorways to rooms on east side
- Continues south to Elevator Lobby

### Rooms (East Side - Off Hallway)

**Guard Station** - X: 10, Z: -4
- Guard (placeholder model with keycard)
- Desk with chair
- CCTV monitors (2x2 grid)
- **KEYCARD pickup** (required for elevator)

**Storage Room** - X: 10, Z: -10
- Stacked crates of various sizes
- Metal shelving unit

**Medical Bay** - X: 10, Z: -14
- Gurney/medical bed
- Medical cabinet with glass door
- **Medkit pickup** (+50 HP)
- Red cross on wall

**Armory** - X: 10, Z: -20
- Wall-mounted weapon rack with rifles
- Ammo crates (military green)
- **Armor stand** with tactical vest (+25 armor)

### Elevator Lobby (South End)
- X: 5, Z: -26
- Elevator doors (animate open with keycard)
- Keycard reader (red light → green when used)
- "ELEVATOR" sign

### Underground Passage (Secret)
- Accessed through Cell 4's left wall secret panel
- Stairs going down (Y: 0 → Y: -3)
- L-shaped corridor going west then south
- Flickering torch lights
- **Cave-in** at the end (rubble blocks path)

## Interaction Types Added

| Type | Action | Location |
|------|--------|----------|
| `cell4_secret_panel` | Opens underground passage | Cell 4 left wall |
| `keycard` | Pick up keycard | Guard Station desk |
| `keycard_reader` | Unlock elevator | Elevator Lobby |
| `health` | Restore HP | Medical Bay |
| `armor` | Add armor | Armory |
| `enemy` | Search (if defeated) | Guard Station |

## Materials Created
- `abandonedWallMat` - Dark abandoned cell walls
- `boneMat` - Skeleton/bones
- `hallwayFloorMat` - Hallway floor (different tint)
- `medicalWallMat` - Medical bay (red tint)
- `guardWallMat` - Guard station (green tint)
- `storageWallMat` - Storage (brown tint)
- `armoryWallMat` - Armory (blue tint)
- `rockMat` - Underground cave/rock
- `elevatorMat` - Metallic elevator

## Audio Added
- `playRumbleSound()` - Secret panel opening
- `playPickupSound()` - Item pickup
- `playKeycardBeep()` - Keycard reader
- `playDoorSound()` - Elevator doors

## Models
- **Jake** - `assets/models/jake/base_basic_shaded.glb` (loads on start)
- **Guard** - Placeholder capsule mesh (FBX needs loader)
  - Will drop keycard when defeated

## Key Progression
1. Wake up in Cell 1
2. Break restraints, use terminal to unlock bars
3. Explore cells, find Cell 4's secret panel
4. Go to Guard Station, get keycard
5. Collect health/armor from Medical/Armory
6. Use keycard on elevator to proceed

## Files Modified
- `js/levels/Level1_Cell.js` - Main level file (now ~224KB)
- `js/entities/Player.js` - Added interaction handlers

## TODO
- Load actual guard FBX model (needs Babylon FBX loader)
- Add enemy combat for guard
- Test full playthrough
- Add more environmental details
