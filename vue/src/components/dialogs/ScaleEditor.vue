<template>
<div id="scaleEditor" class="dialog stable" style="display: none">
    <div id="scaleBody">
      <div class="scaleHeader">
        <span class="icon-map-signs"></span>
        <div>Distances:</div>
      </div>
      <div>
        <div>Distance unit:</div>
        <select onmouseover="tip('Select Distance unit')" id="distanceUnit">
          <option value="mi" selected>Mile</option>
          <option value="km">Kilometer</option>
          <option value="lg">League</option>
          <option value="vr">Versta</option>
          <option value="custom_name">Custom name</option>
        </select>
      </div>
      <div>
        <div onmouseover="tip('Select how many distance unit are in one pixel')">1 map pixel =
        </div>
        <input id="distanceScale"
               onmouseover="tip('Select how many distance unit are in one pixel')" type="range"
               min="0.1" max="10" value="3" step="0.1">
        <input id="scaleOutput"
               onmouseover="tip('Enter how many distance unit are in one pixel')" type="text"
               class="output" value="3 mi">
      </div>
      <div>
        <div
            onmouseover="tip('Type area unit name, leave `square` just to add ² to the distance unit selected above')">
          Area unit:
        </div>
        <input id="areaUnit"
               onmouseover="tip('Type area unit name, leave `square` just to add ² to the distance unit selected above')"
               type="text" value="square">
      </div>

      <div class="scaleHeader">
        <span class="icon-signal"></span>
        <div>Altitude:</div>
      </div>
      <div>
        <div>Height unit:</div>
        <select onmouseover="tip('Select Height unit')" id="heightUnit">
          <option value="ft" selected>Feet</option>
          <option value="m">Meters</option>
          <option value="f">Fathoms</option>
        </select>
      </div>
      <div>
        <div
            onmouseover="tip('Select height exponent, i.e. a value showing altitude change sharpness')">
          Exponent:
        </div>
        <input id="heightExponent"
               onmouseover="tip('Select height exponent, i.e. a value showing altitude change sharpness')"
               onchange="heightOutput.value = this.value" type="range" min="1.5" max="2"
               value="1.73" step="0.01">
        <input id="heightOutput"
               onmouseover="tip('Select height exponent, i.e. a value showing altitude change sharpness')"
               type="text" class="output" value="1.73">
      </div>

      <div class="scaleHeader">
        <span class="icon-minus"></span>
        <div>Scale bar:</div>
      </div>
      <div>
        <div onmouseover="tip('Change scale bar size')">Scale bar size:</div>
        <input id="barSize" onmouseover="tip('Set scale bar size')" type="range" min="0.5"
               max="4" value="2" step="0.1">
        <output id="barSizeOutput">1</output>
      </div>
      <div>
        <div onmouseover="tip('Change scale bar label, leave blank to hide label')">Scale bar
          label:
        </div>
        <input id="barLabel" onmouseover="tip('Set scale bar label, leave blank to hide label')"
               type="text" placeholder="hidden" value="">
      </div>
      <div>
        <div onmouseover="tip('Set background for Scale bar')">Background opacity:</div>
        <input id="barBackOpacity" onmouseover="tip('Set Scale bar background opacity')"
               type="range" min="0" max="1" value="0.2" step="0.01">
        <input id="barBackColor" onmouseover="tip('Set Scale bar background color')"
               type="color" value="#ffffff">
      </div>
      <div class="scaleHeader">
        <span class="icon-male"></span>
        <div>Population:</div>
      </div>
      <div>
        <div onmouseover="tip('Set how many people are in one population point')">1 population
          point =
        </div>
        <input id="populationRate"
               onmouseover="tip('Set how many people are in one population point, in Kilos')"
               type="range" min="0.1" max="10" value="1" step="0.1">
        <input id="populationRateOutput"
               onmouseover="tip('Enter the population rate, in Kilos')" type="text"
               class="output" value="1K">
      </div>
      <div>
        <div>Urbanization rate:</div>
        <input id="urbanization"
               onmouseover="tip('Set the ubranization (burgs population relative to all population) rate')"
               type="range" min="0.01" max="5" value="1" step="0.01">
        <input id="urbanizationOutput"
               onmouseover="tip('Enter the ubranization (burgs population relative to all population) rate')"
               type="text" class="output" value="1">
      </div>
    </div>
    <div id="scaleBottom">
      <button id="toggleScaleBar" onmouseover="tip('Click to toggle scale bar')"
              class="icon-align-center"></button>
      <button onmouseover="tip('Click to toggle rulers (measurers)')" class="icon-eye-off"
              onclick='$("#ruler").fadeToggle()'></button>
      <button id="addOpisometer"
              onmouseover="tip('Drag to measure curve length with opisometer')"
              class="icon-brush"></button>
      <button id="addRuler" onmouseover="tip('Click to place additional linear ruler')"
              class="icon-resize-horizontal"></button>
      <button id="addPlanimeter"
              onmouseover="tip('Drag to measure a polygon area with planimeter')"
              class="icon-check-empty"></button>
      <button id="removeAllRulers"
              onmouseover="tip('Remove all rulers from the map. Click on ruler label to remove ruler separately')"
              class="icon-trash"></button>
    </div>
  </div>
</template>
<script>
export default {
  name: 'ScaleEditor'
}
</script>