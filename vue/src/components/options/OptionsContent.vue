<template>
<div id="optionsContent" class="tabcontent">
    <p onmouseover="tip('Map generation setting. Generate a new map to apply the settings')">
      Generation options (new map to apply):</p>
    <table>
      <tr>
        <td></td>
        <td onmouseover="tip('Map canvas height and width in pixels. Highly affects performance')">
          Map size
        </td>
        <td style="width: 130px;">
          <span onmouseover="tip('Map width')">w:</span>
          <input class="pairedNumber" id="mapWidthInput" type="number" min="240" value="960">
          <span onmouseover="tip('Map height')">h:</span>
          <input class="pairedNumber" id="mapHeightInput" type="number" min="135" value="540">
        </td>
        <td>
          <i onmouseover="tip('Fit map to screen size')" id="updateFullscreen"
             class="icon-resize-full-alt"></i>
        </td>
      </tr>
      <tr>
        <td></td>
        <td onmouseover="tip('Cells density controls underlying graph size and hightly affects performance')">
          Map cells density
        </td>
        <td>
          <input id="sizeInput" type="range" min="1" max="3" value="1">
        </td>
        <td>
          <output id="sizeOutput">1</output>
        </td>
      </tr>
      <tr>
        <td>
          <i onmouseover="tip('Lock to restrict option randomization on new map generation')"
             data-locked=0 id="lockTemplateInput" class="icon-lock-open"></i>
        </td>
        <td onmouseover="tip('Select template to be used for a Heightmap generation')">
          Heightmap template
        </td>
        <td>
          <select id="templateInput">
            <option value="Volcano">Volcano</option>
            <option value="High Island">High Island</option>
            <option value="Low Island">Low Island</option>
            <option value="Continents">Continents</option>
            <option value="Archipelago">Archipelago</option>
            <option value="Atoll">Atoll</option>
            <option value="Mainland">Mainland</option>
            <option value="Peninsulas">Peninsulas</option>
          </select>
        </td>
        <td></td>
      </tr>
      <tr>
        <td>
          <i onmouseover="tip('Lock to restrict option randomization on new map generation')"
             data-locked=0 id="lockManorsInput" class="icon-lock-open"></i>
        </td>
        <td onmouseover="tip('Define how many Settlements should be placed')">Burgs count</td>
        <td>
          <input id="manorsInput" type="range" min="0" max="999" value="500">
        </td>
        <td>
          <output id="manorsOutput">500</output>
        </td>
      </tr>
      <tr>
        <td>
          <i onmouseover="tip('Lock to restrict option randomization on new map generation')"
             data-locked=0 id="lockRegionsInput" class="icon-lock-open"></i>
        </td>
        <td onmouseover="tip('Define how many Countries should be created')">States count</td>
        <td>
          <input id="regionsInput" type="range" min="0" max="100" value="13">
        </td>
        <td>
          <output id="regionsOutput">13</output>
        </td>
      </tr>
      <tr>
        <td>
          <i onmouseover="tip('Lock to restrict option randomization on new map generation')"
             data-locked=0 id="lockPowerInput" class="icon-lock-open"></i>
        </td>
        <td onmouseover="tip('Define Countries size variety. Set to 0 to have all countries sized the same')">
          States disbalance
        </td>
        <td>
          <input id="powerInput" type="range" min="0" max="10" step="0.2" value="5">
        </td>
        <td>
          <output id="powerOutput">5</output>
          <br>
        </td>
      </tr>
      <tr>
        <td>
          <i onmouseover="tip('Unlock to allow option randomization on new map generation')"
             data-locked=1 id="lockNeutralInput" class="icon-lock"></i>
        </td>
        <td onmouseover="tip('Minimal distance to closest burg to consider land neutral')">
          Neutral distance
        </td>
        <td>
          <input id="neutralInput" type="range" min="1" max="500" step="1" value="200">
        </td>
        <td>
          <output id="neutralOutput">200</output>
        </td>
      </tr>
      <tr style="display:none">
        <td>
          <i onmouseover="tip('Unlock to allow option randomization on new map generation')"
             data-locked=1 id="lockNamesInput" class="icon-lock"></i>
        </td>
        <td onmouseover="tip('Define name generation style for burgs. Only the first one works offline')">
          Burg names style
        </td>
        <td>
          <select id="namesInput">
            <option value=0>Pseudo-real (Culture based simulation; internal generation)
            </option>
            <option value=1>High Fantasy (English only; external resource)</option>
          </select>
        </td>
        <td></td>
      </tr>
      <tr>
        <td>
          <i onmouseover="tip('Lock to restrict option randomization on new map generation')"
             data-locked=0 id="lockCulturesInput" class="icon-lock-open"></i>
        </td>
        <td onmouseover="tip('Define how many Cultures should be generated')">Cultures count
        </td>
        <td>
          <input id="culturesInput" type="range" min="1" max="13" value="7">
        </td>
        <td>
          <output id="culturesOutput">7</output>
        </td>
      </tr>
      <tr>
        <td>
          <i onmouseover="tip('Lock to restrict option randomization on new map generation')"
             data-locked=0 id="lockPrecInput" class="icon-lock-open"></i>
        </td>
        <td onmouseover="tip('Set precipitation level. Controls river quantity and power')">
          Precipitation
        </td>
        <td>
          <input id="precInput" type="range" min="0" max="25" value="10">
        </td>
        <td>
          <output id="precOutput">15</output>
        </td>
      </tr>
      <tr>
        <td>
          <i onmouseover="tip('Unlock to allow option randomization on new map generation')"
             data-locked=1 id="lockSwampinessInput" class="icon-lock"></i>
        </td>
        <td onmouseover="tip('Define the land swampiness. Increase to see more marshes on Relief map')">
          Swampiness
        </td>
        <td>
          <input id="swampinessInput" type="range" min="0" max="100" value="10">
        </td>
        <td>
          <output id="swampinessOutput">10</output>
        </td>
      </tr>
      <tr>
        <td></td>
        <td onmouseover="tip('Define the coast outline contours scheme')">Ocean layers</td>
        <td>
          <select id="outlineLayersInput">
            <option value="random">Random</option>
            <option value="none">No outline</option>
            <option value="-6,-3,-1" selected>Standard 3</option>
            <option value="-6,-4,-2">Indented 3</option>
            <option value="-9,-6,-3,-1">Standard 4</option>
            <option value="-6,-5,-4,-3,-2,-1">Smooth 6</option>
            <option value="-9,-8,-7,-6,-5,-4,-3,-2,-1">Smooth 9</option>
          </select>
        </td>
        <td></td>
      </tr>
    </table>
    <p onmouseover="tip('Generator settings. Getting applied immediately on change')">
      Generator settings:</p>
    <table>
      <tr>
        <td></td>
        <td onmouseover="tip('Set dialog and tool windows transparency')">Transparency</td>
        <td>
          <input id="transparencyInput" type="range" min="0" max="100" value="0"
                 oninput="transparencyOutput.value = this.value">
        </td>
        <td>
          <output id="transparencyOutput">0</output>
        </td>
      </tr>
      <tr>
        <td></td>
        <td onmouseover="tip('Define relative size of a saved png images. Consider saving big images is slow')">
          PNG resolution
        </td>
        <td>
          <input id="pngResolutionInput" type="range" min="1" max="10" value="5"
                 oninput="pngResolutionOutput.value = this.value + 'x'">
        </td>
        <td>
          <output id="pngResolutionOutput">5x</output>
        </td>
      </tr>
      <tr>
        <td></td>
        <td onmouseover="tip('Set mininum and maximum zoom level')">Zoom extent</td>
        <td style="width: 130px;">
          <span onmouseover="tip('Zoom out limit')">o:</span>
          <input class="pairedNumber" id="zoomExtentMin" type="number" min="0.2" step="0.1"
                 max="20" value="1">
          <span onmouseover="tip('Zoom in limit')">i:</span>
          <input class="pairedNumber" id="zoomExtentMax" type="number" min="1" max="50"
                 value="20">
        </td>
        <td>
          <i onmouseover="tip('Restore default [1, 20] zoom extent')" id="zoomExtentDefault"
             class="icon-ccw"></i>
        </td>
      </tr>
    </table>
    <button id="optionsReset" onmouseover="tip('Click to restore default options')">Reset
      Defaults
    </button>
  </div>
</template>

<script>
export default {
  name: 'OptionsContent'
}
</script>

<style scoped>

</style>