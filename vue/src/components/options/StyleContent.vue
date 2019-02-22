<template>
<div id="styleContent" class="tabcontent">
  <p style="display: inline-block;">Select element:</p>
  <select id="styleElementSelect" @change="selectStyle($event)">
    <option value="grid">Grid</option>
    <option value="neutralBorders">Borders (neutral)</option>
    <option value="stateBorders">Borders (state)</option>
    <option value="coastline">Coastline</option>
    <option value="regions">Countries</option>
    <option value="cults">Cultures</option>
    <option value="terrs">Heightmap</option>
    <option value="icons">Icons</option>
    <option value="labels">Labels</option>
    <option value="lakes">Lakes</option>
    <option value="landmass">Landmass</option>
    <option value="markers">Markers</option>
    <option value="ocean" selected>Ocean</option>
    <option value="overlay">Overlay</option>
    <option value="terrain">Relief</option>
    <option value="rivers">Rivers</option>
    <option value="roads">Roads</option>
    <option value="ruler">Rulers</option>
    <option value="trails">Trails</option>
    <option value="searoutes">Searoutes</option>
    <option value="scaleBar">Scale bar</option>
  </select>
  <i id="restoreStyle" onmouseover="tip('Restore default style')" class="icon-ccw"></i>
  <div id="styleInputs">
    <div id="styleOverlay">
      <br><span>Ensure Overlay layer is active (see Layout tab)</span><br>
      <br>Overlay type: <select id="styleOverlayType" class="pureInput">
      <option value="pointyHex" selected>Hex grid (pointy)</option>
      <option value="flatHex">Hex grid (flat)</option>
      <option value="square">Square grid</option>
      <option value="windrose">Wind rose</option>
    </select><br>
      <br>Size: <input id="styleOverlaySize" type="range" min="2" max="50" step="0.1"
                       value="10">
      <output id="styleOverlaySizeOutput" onmouseover="tip('Overlay size')">10</output>
      <output id="styleOverlaySizeFriendly"
              onmouseover="tip('Size between two adjacent cells in map scale')">(52 mi)
      </output>
    </div>
    <div id="styleOcean">
      <br>Elements:
      <input id="styleOceanPattern" class="checkbox" type="checkbox" checked>
      <label for="styleOceanPattern" onmouseover="tip('Toggle ocean pattern')"
             class="checkbox-label">Pattern</label>
      <input id="styleOceanLayers" class="checkbox" type="checkbox" checked>
      <label for="styleOceanLayers" onmouseover="tip('Toggle ocean layers')"
             class="checkbox-label">Layers</label><br>
      Background: <input id="styleOceanBack" type="color" value="#000000"/>
      <output id="styleOceanBackOutput">#000000</output>
      <br>
      Foreground: <input id="styleOceanFore" type="color" value="#53679f"/>
      <output id="styleOceanForeOutput">#53679f</output>
    </div>
    <div id="styleFill">
      Fill: <input id="styleFillInput" type="color" value="#5E4FA2"/>
      <output id="styleFillOutput">#5E4FA2</output>
    </div>
    <div id="styleStroke">
      Stroke: <input id="styleStrokeInput" type="color" value="#5E4FA2"/>
      <output id="styleStrokeOutput">#5E4FA2</output>
    </div>
    <div id="styleStrokeWidth">
      <br>Stroke width: <input id="styleStrokeWidthInput" type="range" min="0" max="3"
                               step="0.01" value="1">
      <output id="styleStrokeWidthOutput">1</output>
    </div>
    <div id="styleStrokeDasharray">
      <br>Stroke dasharray: <input id="styleStrokeDasharrayInput" class="pureInput"
                                   value="1 2">
    </div>
    <div id="styleStrokeLinecap">
      <br>Stroke linecap: <select id="styleStrokeLinecapInput" class="pureInput">
      <option value="inherit" selected>Inherit</option>
      <option value="butt">Butt</option>
      <option value="round">Round</option>
      <option value="square">Square</option>
    </select>
    </div>
    <div id="styleFontSize">
      <br>Font size:
      <button class="whiteButton" onmouseover="tip('Multiply all Fonts size by 1.1')"
              id="styleFontPlus">+
      </button>
      <button class="whiteButton" onmouseover="tip('Multiply all Fonts size by 0.9')"
              id="styleFontMinus">-
      </button>
    </div>
    <div id="styleSize">
      <br>Radius:
      <button class="whiteButton" onmouseover="tip('Multiply Radius by 1.1')"
              id="styleFillPlus">+
      </button>
      <button class="whiteButton" onmouseover="tip('Multiply Radius by 0.9')"
              id="styleFillMinus">-
      </button>
      <span> Stroke: </span>
      <button class="whiteButton" onmouseover="tip('Multiply Stroke-width by 1.1')"
              id="styleStrokePlus">+
      </button>
      <button class="whiteButton" onmouseover="tip('Multiply Stroke-width by 0.9')"
              id="styleStrokeMinus">-
      </button>
    </div>

    <div id="styleOpacity">
      <br>Opacity: <input id="styleOpacityInput" type="range" min="0" max="1" step="0.01"
                          value="1">
      <output id="styleOpacityOutput">1</output>
    </div>
    <div id="styleFilter">
      <br>Filter: <select id="styleFilterInput" class="pureInput">
      <option value="" selected>None</option>
      <option value="url(#blurFilter)">Blur 0.2</option>
      <option value="url(#blur1)">Blur 1</option>
      <option value="url(#blur5)">Blur 5</option>
      <option value="url(#blur10)">Blur 10</option>
      <option value="url(#splotch)">Splotch</option>
      <option value="url(#bluredSplotch)">Blured Splotch</option>
      <option value="url(#dropShadow01)">Shadow 0.1</option>
      <option value="url(#dropShadow05)">Shadow 0.5</option>
      <option value="url(#dropShadow)">Shadow 2</option>
      <option value="url(#outline)">Outline</option>
      <option value="url(#pencil)">Pencil</option>
      <option value="url(#turbulence)">Turbulence</option>
    </select>
    </div>
    <div id="styleScheme">
      <br>Color scheme: <select id="styleSchemeInput" class="pureInput">
      <option value="bright" selected>Bright</option>
      <option value="light">Light</option>
      <option value="green">Green</option>
      <option value="monochrome">Monochrome</option>
    </select>
    </div>
    <div id="styleLabelGroups">
      <fieldset>
        <legend>Label groups:</legend>
        <input id="hideLabels" class="checkbox" type="checkbox" checked>
        <label for="hideLabels"
               onmouseover="tip('Allow system to hide labels if their size in too small on that scale)')"
               class="checkbox-label">Toggle visibility automatically</label>
        <div id="styleLabelGroupItems"></div>
      </fieldset>
    </div>
  </div>
  <div id="mapFilters">
    <p>Toggle filters:</p>
    <button id="grayscale" class="radio">Grayscale</button>
    <button id="sepia" class="radio">Sepia</button>
    <button id="dingy" class="radio">Dingy</button>
    <button id="tint" class="radio">Tint</button>
  </div>
</div>
</template>

<script>
import * as $ from 'jquery'
import * as d3 from 'd3'

export default {
  name: 'StyleContent',
  methods: {
    selectStyle(event) {
      const svg = d3.select('svg')
      const viewbox = svg.select("#viewbox");
      const ocean = viewbox.select("#ocean");
      const oceanLayers = ocean.select("#oceanLayers");

      const sel = event.target.value;
      let el = viewbox.select("#"+sel);
      if (sel == "ocean") el = oceanLayers.select("rect");
      $("#styleInputs > div").hide();

      // opacity
      $("#styleOpacity, #styleFilter").css("display", "block");
      const opacity = el.attr("opacity") || 1;
      $('#styleOpacityInput').value = $('#styleOpacityOutput').value = opacity;

      // filter
      if (sel == "ocean") el = oceanLayers;
      $('#styleFilterInput').value = el.attr("filter") || "";
      if (sel === "rivers" || sel === "lakes" || sel === "landmass") {
        $("#styleFill").css("display", "inline-block");
        $('#styleFillInput').value = $('#styleFillOutput').value = el.attr("fill");
      }

      if (sel === "roads" || sel === "trails" || sel === "searoutes" || sel === "lakes" || sel === "stateBorders" || sel === "neutralBorders" || sel === "grid" || sel === "overlay" || sel === "coastline") {
        $("#styleStroke").css("display", "inline-block");
        $('#styleStrokeInput').value = $('#styleStrokeOutput').value = el.attr("stroke");
        $("#styleStrokeWidth").css("display", "block");
        const width = el.attr("stroke-width") || "";
        $('#styleStrokeWidthInput').value = $('#styleStrokeWidthOutput').value = width;
      }

      if (sel === "roads" || sel === "trails" || sel === "searoutes" || sel === "stateBorders" || sel === "neutralBorders" || sel === "overlay") {
        $("#styleStrokeDasharray, #styleStrokeLinecap").css("display", "block");
        $('#styleStrokeDasharrayInput').value = el.attr("stroke-dasharray") || "";
        $('#styleStrokeLinecapInput').value = el.attr("stroke-linecap") || "inherit";
      }

      if (sel === "terrs") $("#styleScheme").css("display", "block");
      if (sel === "heightmap") $("#styleScheme").css("display", "block");
      if (sel === "overlay") $("#styleOverlay").css("display", "block");

      if (sel === "labels") {
        $("#styleFill, #styleStroke, #styleStrokeWidth, #styleFontSize").css("display", "inline-block");
        $('#styleFillInput').value = $('#styleFillOutput').value = el.select("g").attr("fill") || "#3e3e4b";
        $('#styleStrokeInput').value = $('#styleStrokeOutput').value = el.select("g").attr("stroke") || "#3a3a3a";
        $('#styleStrokeWidthInput').value = $('#styleStrokeWidthOutput').value = el.attr("stroke-width") || 0;
        $("#styleLabelGroups").css("display", "inline-block");
        this.$emit('updateLabelGroups');
      }

      if (sel === "ocean") {
        $("#styleOcean").css("display", "block");
        $('#styleOceanBack').value = $('#styleOceanBackOutput').value = svg.style("background-color");
        $('#styleOceanFore').value = $('#styleOceanForeOutput').value = oceanLayers.select("rect").attr("fill");
      }

      if (sel === "coastline") {
        $("#styleCoastline").css("display", "block");
        if ($("#styleCoastline").checked) $("#styleFilter").hide();
      }
    },
    restoreStyles() {
      $('alertMessage').innerHTML = 'Are you sure you want to restore default style?'
      $('#alert').dialog({
        resizable: false, title: 'Restore style',
        buttons: {
          Restore: function() {
            this.$emit('applyDefaultStyle')
            $(this).dialog('close')
          },
          Cancel: function() {
            $(this).dialog('close')
          }
        }
      })
    },
  },
}
</script>

<style scoped>

</style>