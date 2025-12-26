# Architecture Diagram: Sort Preferences Feature

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         User Interface                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  SearchBar Component                                        │  │
│  │  ┌───────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │ Sort Field    │  │ Sort         │  │ Selection      │  │  │
│  │  │ Dropdown      │  │ Direction    │  │ Mode Toggle    │  │  │
│  │  └───────┬───────┘  └──────┬───────┘  └────────────────┘  │  │
│  │          │                  │                               │  │
│  │          └─────────┬────────┘                               │  │
│  └────────────────────┼────────────────────────────────────────┘  │
│                       │                                            │
│  ┌────────────────────▼────────────────────────────────────────┐  │
│  │  World Grid/List Display (sorted & filtered)                │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Frontend State Layer                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  useWorldFiltersStore (Zustand)                            │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  State:                                              │  │  │
│  │  │  - sortField: SortField                              │  │  │
│  │  │  - sortDirection: 'asc' | 'desc'                     │  │  │
│  │  │  - filteredWorlds: WorldDisplayData[]                │  │  │
│  │  │  - ... other filter state                            │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  Actions:                                                    │  │
│  │  - setSortField(field) → saves to backend                   │  │
│  │  - setSortDirection(dir) → saves to backend                 │  │
│  │  - setFilteredWorlds(worlds)                                │  │
│  └──────────────────────┬───────────────────────────────────────┘  │
│                         │                                          │
│  ┌──────────────────────▼───────────────────────────────────────┐ │
│  │  useWorldFilters Hook                                        │ │
│  │  - Loads preferences on mount                                │ │
│  │  - Applies filters & sorting                                 │ │
│  │  - Updates filteredWorlds                                    │ │
│  └──────────────────────┬───────────────────────────────────────┘ │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                  TypeScript Bindings                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  commands.getSortPreferences()                             │  │
│  │    → Result<[string, string], string>                      │  │
│  │                                                              │  │
│  │  commands.setSortPreferences(field, direction)             │  │
│  │    → Result<null, string>                                  │  │
│  └──────────────────────┬───────────────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Tauri IPC Layer                              │
│            (Message passing between Frontend ↔ Backend)           │
└──────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Rust Backend (Tauri)                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Tauri Commands (preferences_commands.rs)                  │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  #[tauri::command]                                   │  │  │
│  │  │  get_sort_preferences()                              │  │  │
│  │  │    → reads PREFERENCES.get().read()                  │  │  │
│  │  │    → returns (sort_field, sort_direction)            │  │  │
│  │  │                                                       │  │  │
│  │  │  #[tauri::command]                                   │  │  │
│  │  │  set_sort_preferences(field, direction)              │  │  │
│  │  │    → updates PREFERENCES.get().write()               │  │  │
│  │  │    → calls FileService::write_preferences()          │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └────────────────────────┬───────────────────────────────────────┘│
│                           │                                         │
│  ┌────────────────────────▼───────────────────────────────────────┐│
│  │  Static State: PREFERENCES                                     ││
│  │  (RwLock<PreferenceModel>)                                     ││
│  │  ┌──────────────────────────────────────────────────────────┐ ││
│  │  │  PreferenceModel {                                       │ ││
│  │  │    theme: String,                                        │ ││
│  │  │    language: String,                                     │ ││
│  │  │    card_size: CardSize,                                  │ ││
│  │  │    region: InstanceRegion,                               │ ││
│  │  │    sort_field: String,         ← NEW                     │ ││
│  │  │    sort_direction: String,     ← NEW                     │ ││
│  │  │    ... other preferences                                 │ ││
│  │  │  }                                                        │ ││
│  │  └──────────────────────────────────────────────────────────┘ ││
│  └────────────────────────┬───────────────────────────────────────┘│
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FileService                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  write_preferences(preferences: &PreferenceModel)          │  │
│  │    → serializes to JSON                                    │  │
│  │    → writes to preferences.json                            │  │
│  │                                                              │  │
│  │  load_data()                                                 │  │
│  │    → reads from preferences.json                            │  │
│  │    → deserializes to PreferenceModel                        │  │
│  └──────────────────────┬───────────────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    File System                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  AppData/Local/VRC_Worlds_Manager_new/                    │  │
│  │  └─ preferences.json                                       │  │
│  │     {                                                        │  │
│  │       "theme": "dark",                                       │  │
│  │       "language": "en-US",                                   │  │
│  │       "cardSize": "Normal",                                  │  │
│  │       "sortField": "name",          ← Persisted             │  │
│  │       "sortDirection": "asc",       ← Persisted             │  │
│  │       ...                                                    │  │
│  │     }                                                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Export Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    User Triggers Export                           │
│  Settings Page → Export Button → Select Folders → Confirm        │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  commands.exportToPortalLibrarySystem(                          │
│    folders: string[], sortField: string, sortDirection: string  │
│  )                                                              │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│              Backend: export_service.rs                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  export_to_portal_library_system(                          │  │
│  │    folders, FOLDERS, WORLDS, sort_field, sort_direction    │  │
│  │  )                                                         │  │
│  │    1. Use sort_field and sort_direction parameters         │  │
│  │       passed from export popup                             │  │
│  │    2. For each folder:                                     │  │
│  │       a. Get all worlds in folder                          │  │
│  │       b. Call sort_worlds(worlds, sort_field, direction)   │  │
│  │       c. Add sorted worlds to export data                  │  │
│  │    3. Serialize to JSON                                    │  │
│  │    4. Write to exports/portal_library_system_*.json        │  │
│  └──────────────────────┬───────────────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│              sort_worlds() Helper Function                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Matches on sort_field:                                    │  │
│  │  - "name" → compare world_name                             │  │
│  │  - "authorName" → compare author_name                      │  │
│  │  - "visits" → compare visits count                         │  │
│  │  - "favorites" → compare favorites count                   │  │
│  │  - "capacity" → compare capacity                           │  │
│  │  - "dateAdded" → compare date_added                        │  │
│  │  - "lastUpdated" → compare last_update                     │  │
│  │                                                              │  │
│  │  Applies direction:                                          │  │
│  │  - "asc" → ascending order                                   │  │
│  │  - "desc" → descending order (reversed)                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Exported JSON File                               │
│  {                                                                │
│    "Categorys": [                                                 │
│      {                                                            │
│        "Category": "Favorite Worlds",                             │
│        "Worlds": [                                                │
│          { "ID": "wrld_xxx", "Name": "A World", ... },           │
│          { "ID": "wrld_yyy", "Name": "B World", ... },           │
│          { "ID": "wrld_zzz", "Name": "C World", ... }            │
│          ↑ Sorted according to current UI preferences             │
│        ]                                                          │
│      }                                                            │
│    ]                                                              │
│  }                                                                │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow Summary

### On App Startup:
```
App Start
  → Frontend initializes
  → useWorldFilters hook runs
  → useEffect calls getSortPreferences()
  → Backend reads preferences.json
  → Returns (sortField, sortDirection)
  → Frontend updates store state
  → Worlds are filtered & sorted
  → UI displays sorted worlds
```

### On Sort Change:
```
User clicks sort option
  → Frontend calls setSortField() or setSortDirection()
  → Action calls commands.setSortPreferences()
  → Backend updates PREFERENCES in memory
  → Backend writes to preferences.json
  → Frontend store updates
  → UI re-renders with new sort
```

### On Export:
```
User triggers export
  → Frontend calls exportToPortalLibrarySystem()
  → Backend reads current sort preferences
  → For each folder:
      Get worlds → Apply sort → Add to export
  → Write JSON file
  → Open exports folder
  → User sees sorted data matching UI
```

## Key Design Decisions

1. **Global Sort State**: Sort preferences are global, not per-folder
   - Simpler implementation
   - Consistent user experience
   - Easier to maintain

2. **Immediate Persistence**: Sort changes are saved immediately
   - No "Save" button needed
   - Prevents data loss
   - Better UX

3. **Shared Sort Logic**: Same sorting algorithm in frontend and backend
   - Export matches UI exactly
   - Reduces bugs
   - Easier to maintain

4. **Default Values**: Sensible defaults ("dateAdded", "desc")
   - Backward compatible
   - Works out of the box
   - Matches previous behavior

5. **Minimal Changes**: Small, focused modifications
   - Easier to review
   - Reduces risk
   - Follows existing patterns
