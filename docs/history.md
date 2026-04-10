# Edit History

## V38: Add image crop button in location editor

Added a "裁剪" button next to the remove button when a location has an image. Clicking it opens a new ImageCropModal component with a drag-to-select crop UI, eight resize handles, a dark overlay outside the selection, and rule-of-thirds grid lines. Confirming exports only the selected region via Canvas and replaces the imageUrl in the editor.

## V37: Compress images on share without affecting local storage

Added Canvas-based image compression in the share flow — each location's imageUrl is resized (max 800px wide, JPEG quality 60%) before being encoded into the share URL. The original full-quality images stored locally are untouched. The share button shows "生成中…" while processing.

## V36: Fix share link broken when locations have images

Stripped imageUrl fields from all locations before encoding the share URL, since base64 images can be hundreds of KB each and exceed browser URL length limits. Added a warning note when the shared map had images.

## V35: Add optional location image in editor and detail panel

Added an optional `imageUrl` field to `MapLocation`. The LocationEditor now includes an image upload area (converts to base64) with preview and remove button. The detail panel displays the image between the tags and the description divider — hidden when no image is set.

## V34: Use Noto Serif SC font for description text in detail panel

Changed the description text font in both the editable and read-only detail panels to "Noto Serif SC" (Google Fonts), with slightly larger size (14px), more line-height (1.9), and letter-spacing for a more elegant, book-like feel.

## V33: Redesign detail panel layout with dividers and fixed footer

Restructured the location detail panel with three thin horizontal dividers: tags→description, description→coordinates, and coordinates→action buttons. The description area now scrolls independently while the header, coordinates, and buttons stay fixed.

## V32: Fix filter toggle-all logic and badge count

Fixed "全隐" button so clicking it actually hides all locations in that category (empty Set now means "hide all", not "show all"). Changed the filter badge to show current visible count vs total (e.g. "12/45") instead of a category-modified count.

## V31: Add filter panel to share view, add delete map in settings dialog

Added a standalone filter panel (no store dependency) to the read-only share view so viewers can filter locations by tag categories. Added a "删除这张地图" button at the bottom of the Map Settings dialog with a two-step confirmation, dispatching DELETE_MAP to remove the map and all its data.

## V30: Add export, import, and share features

Added a JSON export button (downloads current map as .json file) and a share button (encodes map into a URL hash and copies to clipboard) in the title bar. Added an import button in the sidebar above the "+" button that reads a JSON file and creates a new map. Created a /share route with a read-only interactive map view that decodes the shared URL.

## V29: Make LocationEditor fully theme-aware

Passed complete theme props (themeBg, themeAccent, themeMuted) into the LocationEditor modal so all colors — background, input borders, labels, coordinate sliders, tag chips, and hint text — adapt when the map's theme color changes.

## V28: Add delete button for tag categories in Tag Manager

Added a trash icon next to the pencil in the left category list of the Tag Manager. All categories now show the delete button; legend categories show it grayed out and disabled. Non-legend categories can be deleted, which removes the category and clears all associated tag data from every location.

## V27: Replace Add Location button with Location Manager panel

Replaced the "添加地点" title bar button with a "地点管理" button that opens a right-side panel listing all locations with search, tag filters, and batch delete. Clicking a location in the list highlights it on the map and switches to the detail panel; closing the detail returns to the manager. The manager also has an "添加地点" button that triggers the original LocationEditor modal.

## V26: Remove triangle and star shapes, migrate existing to square

Removed triangle and star from the shape options entirely — deleted them from the type definition, tag manager picker, icon renderer, and map marker rendering. Added a loadState migration to convert any saved triangle/star icons to square.

## V25: Fix clip-path marker selection highlight to use drop-shadow outline

For triangle and star markers (which use CSS clip-path), switched the selected highlight from boxShadow on the outer button (which draws a rectangle) to stacked drop-shadow filters on the inner div, so the white border and color glow trace the actual shape outline.

## V24: Fix star shape rendering, unify selection highlight, fix opacity initial value

Fixed star markers to use clip-path polygon (like triangle), unified selection highlight for triangle/star to match circle/square (white outline ring + glow), and fixed opacity slider always showing 100% by reading icon.opacity on initialization.

## V23: Fix opacity not saving and triangle shape rendering

Fixed two bugs: (1) opacity slider changes now correctly call onChange to propagate to parent, and all shape/color changes also carry the current opacity value; (2) triangle markers now render correctly using CSS clip-path instead of a plain square div.

## V22: Add optional border color to shape markers in Tag Manager

Added a `borderColor` field to the shape TagIcon type, and a new "外边框" control in the IconPicker with "无边框" / "有颜色边框" toggle plus preset bright swatches and a custom color picker. Markers now render a glowing bright border when borderColor is set, matching the reference screenshot style.

## V21: Make map markers fully opaque (solid fill colors)

Removed the semi-transparent hex suffix (`99`) from marker background colors so all shape markers now render as fully opaque solid circles/squares, matching the reference image the user provided.

## V20: Fix new map locations filtered out (zone category has empty values)

Fixed two bugs: (1) the filter logic was hiding all markers when a tag category had zero values (empty Set matched nothing), now empty-value categories are skipped in filtering; (2) removed imgLoaded opacity gate that caused images to stay invisible when served from browser cache.

## V19: Fix markers invisible on maps without a background image

When a new map had no background image set, the map area had zero height and all location markers were invisible. Added a full-size grid placeholder so the map area always has proper dimensions, with a friendly tip to set a background image via the sidebar settings.

## V18: Double-click sidebar icon to open map settings dialog

Added a "地图设置" modal triggered by double-clicking a map's icon in the left sidebar, allowing users to edit the map's Chinese/English name, background image (URL or upload), and theme color. Added UPDATE_MAP_IMAGE action to the store and onEditMap callback to MapSidebar.

## V17: Hide "none" tags in detail panel

Added a rule so that tag pills with value "none" (无归属) or no assigned value are hidden in the location detail panel display, while still showing in the editor and filter panel.

## V16: Tag Manager + Dynamic Filter Panel

Added a full Tag Manager modal (accessible from the title bar) where users can create/rename/delete tag categories and sub-values, set icons (shape+color, emoji, or default), assign locations to sub-values via checklist, and set any category as the map legend. Also added a new dynamic filter panel on the left edge that generates filter sections from the active map's tag categories, replacing the old static filter panel.

## V1: Tramire Interactive Fantasy Map

Built a full interactive map of the Tramire continent with 40+ locations across all zones, pan/zoom/click navigation, location detail sidebar, and a drag-to-reposition feature for correcting marker positions.

## V2: Fix Y-axis coordinate convention

Flipped the Y coordinate system so that Y=100 is north (top of map) and Y=0 is south (bottom), matching geographic intuition where higher Y = further north. Updated all location data, marker rendering (top = 100-y%), reposition click calculation, and coordinate display.

## V4: Update all location coordinates from user-exported data

Updated all 40 location initial coordinates in locations-data.ts using the precise positions exported after manual repositioning.

## V3: Add "Export Coordinates" button

Added a clipboard export button in the title bar that copies all current location coordinates (id/x/y) as JSON, so users can share adjusted positions back to update the initial data.

## V15: Fix Tramire map image not loading

Updated the Tramire map image URL to the correct newly uploaded URL (30f593e1...) and added a loadState patch so stale localStorage cache always gets the correct image URL on startup.

## V14: Build complete Intermap multi-map shell

Created `intermap-map-view.tsx` and `intermap-app.tsx` to wire together the full Intermap system — sidebar, new-map dialog, store-powered markers, detail panel with edit/delete/reposition, and location editor modal. Updated `__root.tsx` to wrap with `IntermapProvider` and `index.tsx` to render `IntermapApp`.

## V13: Fix legend collapse/expand on mobile and iPad

Rewrote the legend touch interaction from scratch: replaced unreliable React synthetic touch events with native addEventListener (passive:false) for drag, and gave the collapse toggle button an explicit onTouchEnd handler so it works reliably even when the parent has touchAction:none. Also removed a duplicate useEffect that was interfering with drag state.

## V12: Replace background map image

Swapped the map background to the new hand-drawn Tramire continent image provided by the user.

## V11: Fix legend touch collapse and portrait filter button position

Fixed mobile touch so the legend can be collapsed and re-expanded by tapping — moved touch handlers to the legend element itself to prevent the map's touchmove from stealing the event. Also moved the filter toggle button upward (to 22%) in portrait mode when a location detail bottom sheet is open, so it no longer overlaps the panel title.

## V10: Collapsible legend panel

Added collapse/expand toggle to the legend panel — click or tap the header to hide/show the legend items, with a chevron indicator. Drag detection threshold distinguishes tap (toggle) from drag (move).

## V9: Draggable legend panel

Made the legend panel freely draggable on all devices — users can mouse-drag or touch-drag it anywhere within the map area. Position is clamped so it stays fully on-screen.

## V8: Portrait mode bottom sheet for detail panel

Detail panel now shows as a bottom sheet (52% height, full width) when in portrait orientation (mobile vertical), and stays as the right sidebar in landscape/desktop. Uses matchMedia orientation listener to update instantly on rotation.

## V7: Support screen rotation without layout changes

Kept viewport meta to allow screen rotation, but reverted all landscape-specific layout overrides so the detail panel and filter panel look identical to desktop/iPad regardless of orientation.

## V6: Replace map image and add full mobile touch support

Replaced the background map with a new version and added comprehensive touch support: single-finger drag to pan, two-finger pinch to zoom (centered on midpoint), tap to select/reposition markers, and native scroll/zoom prevention so the browser doesn't interfere.

## V5: Add left-side filter panel with three dimensions

Added a sliding filter panel on the left edge with three collapsible sections: location type, faction affiliation (人类/树精/枝裔族/兽人/裂爪族/无归属), and zone. Each section supports individual toggles and select-all/deselect-all. A badge on the toggle button shows how many filters are active. Also added faction data to all location entries in locations-data.ts.
