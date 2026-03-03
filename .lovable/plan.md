

## Appointment Blocks Spanning Full Duration on Day View

### Problem
Currently, appointment cards only appear on the single 15-minute slot where they start. The user wants each appointment block (the rectangle/card) to visually stretch from its start time to its end time, so a 1-hour appointment covers 4 slots, a 30-min one covers 2 slots, etc.

### Solution
Refactor the day view rendering to use **relative positioning** with calculated heights so appointment cards span their full duration.

### Changes in `src/pages/Admin.tsx` -- `renderDayView()`

1. **Use a container with `position: relative`** for the time grid, where each 15-min slot has a fixed height (e.g., 40px).

2. **Render appointments as absolutely positioned overlays** instead of inline within a slot:
   - Calculate each appointment's top offset: `(startHour - 8) * 4 + (startMinute / 15)` slots from the top.
   - Calculate height: `durationInMinutes / 15` slots tall.
   - Position the card absolutely within the grid to span from start to end.

3. **Keep the time labels and blocked times** rendering as they are (per-slot), but appointments will be overlaid on top.

4. **Skip rendering appointment cards inside individual slots** -- remove the current `apt && (<Card>...)` block from the slot loop, and instead render all day appointments in a separate overlay layer.

### Technical approach

```text
Container (relative)
  |-- Time slots layer (static, one row per 15 min)
  |     |-- 8:00 AM  [border-l] [blocked? show red]
  |     |-- 8:15 AM  [border-l]
  |     |-- ...
  |-- Appointments overlay (absolute positioned cards)
        |-- Apt 1: top=X, height=Y (spans start->end)
        |-- Apt 2: top=X, height=Y
```

Each slot height will be fixed at ~40px. An appointment starting at 10:00 with 60 min duration will have:
- top: (10-8)*4 * 40px = 320px
- height: (60/15) * 40px = 160px

The blocked times will continue to render inline per-slot as red indicators. The "occupied" check for non-appointment slots will be removed since the visual spanning makes it redundant.
