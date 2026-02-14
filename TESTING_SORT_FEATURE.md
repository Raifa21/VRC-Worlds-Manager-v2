# Testing Guide: Custom World Sort Order Feature

## Overview
This document provides instructions for testing the custom world sort order persistence and export functionality.

## Prerequisites
- Development environment with Tauri dependencies installed
- The application built and running

## Test Cases

### Test 1: Sort Preferences Persistence
**Objective**: Verify that sort preferences persist after restarting the app

**Steps**:
1. Launch the application
2. Navigate to the world list view
3. Change the sort field (e.g., from "Date Added" to "Name")
4. Change the sort direction (click the sort direction toggle)
5. Note the current sort settings
6. Close the application completely
7. Relaunch the application
8. Navigate back to the world list view

**Expected Result**: 
- The sort field and direction should match what was set before closing the app
- Worlds should be displayed in the same order as before restart

### Test 2: Export with Custom Sort Order
**Objective**: Verify that exported data matches the displayed order in the UI

**Steps**:
1. Launch the application
2. Navigate to the world list view
3. Set a specific sort order (e.g., "Name" ascending)
4. Note the order of the first 5-10 worlds displayed
5. Go to Settings
6. Click "Export" and select "PortalLibrarySystem"
7. Select one or more folders to export
8. Complete the export
9. Open the exported JSON file

**Expected Result**:
- The worlds in the exported JSON should appear in the same order as displayed in the UI
- The order should match the current sort settings (e.g., alphabetically by name if "Name" ascending was selected)

### Test 3: Multiple Sort Field Changes
**Objective**: Verify that changing between different sort fields works correctly

**Steps**:
1. Launch the application
2. Navigate to the world list view
3. Try each sort field option:
   - Name
   - Author Name
   - Visits
   - Favorites
   - Capacity
   - Date Added
   - Last Updated
4. For each field, verify:
   - Worlds are sorted correctly
   - The sort persists when navigating away and back
   - Restart the app and verify it remembers the last selected field

**Expected Result**:
- Each sort field should correctly order the worlds
- The last selected sort field should persist across app restarts

### Test 4: Sort Direction Toggle
**Objective**: Verify ascending/descending sort direction works correctly

**Steps**:
1. Launch the application
2. Navigate to the world list view
3. Select any sort field (e.g., "Favorites")
4. Note the current order
5. Click the sort direction toggle button
6. Note the new order (should be reversed)
7. Toggle again to confirm it switches back
8. Restart the app

**Expected Result**:
- Clicking the toggle should reverse the sort order
- The sort direction should persist across app restarts

## Verification Points

### Backend Verification
Check the preferences.json file:
```
Location: AppData/Local/VRC_Worlds_Manager_new/preferences.json
(or equivalent on your OS)
```

The file should contain:
```json
{
  "sortField": "name",
  "sortDirection": "asc",
  ...other preferences...
}
```

### Export Verification
When examining exported PLS JSON files:
1. Open the exported file
2. Look at the `Categorys` array
3. Within each category, check the `Worlds` array
4. Verify worlds are in the expected order based on current sort settings

## Known Limitations
- The sort order is global across all folders
- Manual drag-and-drop reordering is not supported (only sort by fields)
- Sort preferences are stored in preferences.json alongside other app settings

## Troubleshooting

### Issue: Sort doesn't persist
- Check if preferences.json exists and is writable
- Verify the file contains sortField and sortDirection keys
- Check application logs for errors

### Issue: Export order doesn't match UI
- Ensure you're comparing the same folder
- Verify the sort preferences are saved before exporting
- Check if there are any filtering options applied in the UI

## Additional Notes
- The feature uses the same sorting logic in both the frontend (for display) and backend (for export)
- Default sort is "dateAdded" in "desc" order
- Sort preferences are loaded on app startup before displaying worlds
