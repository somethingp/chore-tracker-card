# Chore Tracker Card

Lovelace custom card for [Home Assistant](https://www.home-assistant.io/). Displays household chores color-coded by urgency, with per-user check-offs and undo.

**Requires the [Chore Tracker Add-on](https://github.com/somethingp/chore-tracker-addon) to be installed and running.**

## Features

- Color-coded urgency: green (on time), yellow (overdue), red (way overdue — past 2× frequency)
- Chores sorted by urgency, most urgent first
- Per-user check-offs with timestamp recorded
- Undo any accidental completion
- Add and delete chores directly from the card
- Cross-device sync via the add-on backend

## Installation

### Via HACS (recommended)

1. Install the **[Chore Tracker Add-on](https://github.com/somethingp/chore-tracker-addon)** first
2. In HACS → **Frontend** → **+ Explore & Download Repositories**
3. Search for **Chore Tracker Card** and download it
4. Hard-refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)

### Manual

1. Copy `dist/chore-tracker-card.js` to `/config/www/chore-tracker-card.js`
2. Go to **Settings → Dashboards → ⋮ → Resources**
3. Add `/local/chore-tracker-card.js` as a JavaScript module
4. Hard-refresh your browser

## Adding the card to a dashboard

Edit any dashboard → **+ Add Card → Manual**, then paste:

```yaml
type: custom:chore-tracker-card
title: Chores
users:
  - Alex
  - Jordan
  - Sam
  - Casey
```

## Configuration

| Option  | Type     | Default    | Description                    |
|---------|----------|------------|--------------------------------|
| `title` | `string` | `"Chores"` | Card heading                   |
| `users` | `list`   | `[]`       | Household member names         |

## How urgency is calculated

| Color  | Condition                                          |
|--------|----------------------------------------------------|
| Green  | Last done within the chore's frequency window      |
| Yellow | Past due, but less than 2× the frequency           |
| Red    | More than 2× the frequency since last completion   |

## License

MIT
