<template>
<div id="layoutContent" class="tabcontent">
  <p style="display: inline-block;">Select preset:</p>
  <select id="layoutPreset">
    <option value="layoutPolitical" selected>Political map</option>
    <option value="layoutCultural">Cultural map</option>
    <!-- <option value="layoutEconomical">Economical map</option> -->
    <option value="layoutHeightmap">Heightmap</option>
    <option value="layoutLandmass">Pure landmass</option>
  </select>
  <p>Displayed layers. Drag to move, click to toggle</p>
  <ul id="mapLayers">
    <li onmouseover="tip('Toggle Ocean pattern (see Style tab for styling)')"
        id="toggleOcean" :onclick="fadeToggle('#oceanPattern')" class="solid">
      Ocean
    </li>
    <li onmouseover="tip('Toggle Heightmap (see Style tab for styling and Customize for editting)')"
        id="toggleHeight" class="buttonoff">
      Heightmap
    </li>
    <li onmouseover="tip('Toggle Grid')" id="toggleGrid" class="buttonoff"
        :onclick="fadeToggle('#grid')">
      Grid
    </li>
    <li onmouseover="tip('Toggle Overlay (overlay type can be set in Style tab)')"
        id="toggleOverlay" class="buttonoff" @click="toggleOverlay">
      Overlay
    </li>
    <li onmouseover="tip('Toggle Cultural map (does not work good when counties layer is on)')"
        id="toggleCultures" class="buttonoff">
      Cultures
    </li>
    <li onmouseover="tip('Toggle Routes')" id="toggleRoutes"
        :onclick="fadeToggle('#routes')">
      Routes
    </li>
    <li onmouseover="tip('Toggle Rivers')" id="toggleRivers"
        :onclick="fadeToggle('#rivers')">
      Rivers
    </li>
    <li onmouseover="tip('Toggle Countries (open Customize tab for editting)')"
        id="toggleCountries">
      Countries
    </li>
    <li onmouseover="tip('Toggle Borders')" id="toggleBorders"
        :onclick="fadeToggle('#borders')">
      Borders
    </li>
    <li onmouseover="tip('Toggle Relief icons (draft version)')" id="toggleRelief"
        :onclick="fadeToggle('#terrain')">
      Relief
    </li>
    <li onmouseover="tip('Toggle Labels (label groups can be toggled separately in Style tab)')"
        id="toggleLabels" :onclick="fadeToggle('#labels')">
      Labels
    </li>
    <li onmouseover="tip('Toggle Burg icons')" id="toggleIcons"
        :onclick="fadeToggle('#icons')">
      Icons
    </li>
    <li onmouseover="tip('Toggle Markers')" id="toggleMarkers"
        :onclick="fadeToggle('#markers')">
      Markers
    </li>
  </ul>
  <div id="layoutCheckboxes">
    <input id="toggleTooltips" class="checkbox" type="checkbox" checked
           onclick="fadeToggle('#tooltip')">
    <label for="toggleTooltips" onmouseover="tip('Toogle tooltip line and legend box')"
           class="checkbox-label">
      Show tooltips
    </label>
    <label id="optionSeedLabel"
           onmouseover="tip('Map seed. Please do NOT consider as a save function, seed produces different maps in case of code and options change')"
           style="margin-left:10px">
      Map seed:
      <input id="optionsSeed"
             onmouseover="tip('Map seed. Please do NOT consider as a save function, seed produces different maps in case of code and options change')"
             class="pureInput" style="width:50px" value="">
      <i onmouseover="tip('Click to generate a map for this seed')" id="optionsSeedGenerate"
         style="margin-left:-3px; color: #5d4651" class="icon-play"/>
    </label>
  </div>
</div>
</template>

<script>
import * as $ from 'jquery'

export default {
  name: 'LayoutContent',
  methods: {
    fadeToggle(id) { $(id).fadeToggle() },
    toggleOverlay() { this.$emit("toggleOverlay") },
  },
}
</script>

<style scoped>

</style>