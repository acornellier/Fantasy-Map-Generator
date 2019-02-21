<template>
<div id="customizeContent" class="tabcontent" style="display: block;">
    <div id="openEditor">
      <p>Customize:</p>
      <button id="editHeightmap"
              onmouseover="tip('Click to open Heightmap customization menu')">Heightmap
      </button>
      <button id="editCountries" onmouseover="tip('Click to open Countries Editor')">
        Countries
      </button>
      <button id="editCultures" onmouseover="tip('Click to open Cultures Editor')">Cultures
      </button>
      <button id="editScale" onmouseover="tip('Click to open Scale Editor')">Scale</button>
    </div>
    <div id="customizeHeightmap" style="display: none;">
      <p>Heightmap customization:</p>
      <div>
        <button onmouseover="tip('Edit the current Heightmap')" id="fromHeightmap">Edit
        </button>
        <button onmouseover="tip('Remove all data and start from scratch')" id="fromScratch">
          Clear all
        </button>
        <button class="buttonoff"
                onmouseover="tip('Finalize the Heightmap. Not allowed if landmass area is insufficient')"
                id="getMap">Complete
        </button>
      </div>
      <div id="customizationMenu" class="hidden">
        <div id="customizeTools">
          <label onmouseover="tip('Customization Tools')">Tools:</label><br>
          <button onmouseover="tip('Display brushes panel')" id="paintBrushes">Paint Brushes
          </button>
          <button onmouseover="tip('Open template editor')" id="applyTemplate">Template
            Editor
          </button>
          <button onmouseover="tip('Open Image Converter')" id="convertImage">Image
            Converter
          </button>
          <button onmouseover="tip('Show Heightmap in perspective')" id="perspectiveView">
            Perspective View
          </button>
        </div>
        <div id="customizeOptions">
          <input id="renderOcean" class="checkbox" type="checkbox">
          <label for="renderOcean" onmouseover="tip('Render cells below sea level')"
                 class="checkbox-label">Render ocean cells</label>
          <input id="changeHeights" class="checkbox" type="checkbox">
          <label for="changeHeights"
                 onmouseover="tip('Allow system to change custom heights if reasonable')"
                 class="checkbox-label">Change heights</label>
        </div>
        <label onmouseover="tip('Number of Land cells and landmass/ocean ratio')">Landmass:
          <span id="landmassCounter">0</span> (<span id="landmassRatio">0</span>%); Average
          Elevation: <span id="landmassAverage">0</span>
        </label>
        <hr>
      </div>
    </div>
    <div id="addFeature">
      <p>Click to add:</p>
      <button id="addBurg" onmouseover="tip('Click on map to place a burg')">Burg</button>
      <button id="addLabel" onmouseover="tip('Click on map to place label')">Label</button>
      <button id="addRelief" onmouseover="tip('Click on map to place a relief icon')">Relief
        Icon
      </button>
      <button id="addRiver"
              onmouseover="tip('Click on map to place new river or extend an existing one')">
        River
      </button>
      <button id="addRoute" onmouseover="tip('Click on map to place a route')">Route</button>
      <button id="addMarker" onmouseover="tip('Click on map to place a marker')">Marker
      </button>
    </div>
    <div id="cellInfo">
      <p>Cell info:</p>
      <div>
        Coord: <span id="infoX">0</span>/<span id="infoY">0</span><br>
        Cell: <span id="infoCell">0</span><br>
        Area: <span id="infoArea">0</span><br>
        Height: <span id="infoHeight">0</span><br>
        Flux: <span id="infoFlux">0</span>
      </div>
      <div>
        Type: <span id="infoFeature">n/a</span><br>
        Country: <span id="infoCountry">n/a</span><br>
        Culture: <span id="infoCulture">n/a</span><br>
        Population: <span id="infoPopulation">0</span><br>
        Burg: <span id="infoBurg">n/a</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CustomizeComponent'
}
</script>

<style scoped>

</style>