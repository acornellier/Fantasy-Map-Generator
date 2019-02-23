<template>
<div id="sticked">
    <button id="randomMap"
            onmouseover="tip('Generate a new map based on options. May take about 1 minute. Hotkey: F6')"
            class="options">New Map
    </button>
    <button id="saveButton" onmouseover="tip('Select file format to save map')"
            class="options">Save as
    </button>
    <div id="saveDropdown">
      <div id="saveMap"
           onmouseover="tip('Save as fully functional map in .map format. Hotkey: M')">.map
      </div>
      <div id="saveSVG"
           onmouseover="tip('Download the map as .svg image (open in browser or in Inkscape. Hotkey: S)')">
        .svg
      </div>
      <div id="savePNG"
           onmouseover="tip('Download the visible part of the map as 4K .png image. Please ensure popups are not blocked! Hotkey: P')">
        .png
      </div>
    </div>
    <button id="loadMap"
            onmouseover="tip('Load fully functional map in a .map format. Hotkey: L')"
            class="options">Load
    </button>
    <button id="zoomReset" onmouseover="tip('Reset map zoom. Hotkey: 0')" class="options">
      Reset Zoom
    </button>
</div>
</template>

<script>
export default {
  name: 'Stickied'
}
</script>

<style scoped>

</style>