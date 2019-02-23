<template>
<div id="countriesEditor" class="dialog stable" style="display: none" data-type="absolute">
    <div id="countriesHeader">
      <div style="margin-left: 14px"
           onmouseover="tip('Click to sort alphabetically by country name')"
           class="sortable alphabetically" data-sortby="country">Country&nbsp;
      </div>
      <div style="margin-left: 30px"
           onmouseover="tip('Click to sort alphabetically by capital name')"
           class="sortable alphabetically" data-sortby="capital">Capital&nbsp;
      </div>
      <div style="margin-left: 24px"
           onmouseover="tip('Click to sort by country expansion value')" class="sortable hidden"
           data-sortby="expansion">Expan.&nbsp;
      </div>
      <div style="margin-left: 30px" onmouseover="tip('Click to sort by country cells count')"
           class="sortable" data-sortby="cells">Cells&nbsp;
      </div>
      <div style="margin-left: 6px" onmouseover="tip('Click to sort by country burgs count')"
           class="sortable" data-sortby="burgs">Burgs&nbsp;
      </div>
      <div style="margin-left: 20px" onmouseover="tip('Click to sort by country area')"
           class="sortable" data-sortby="area">Area&nbsp;
      </div>
      <div style="margin-left: 22px" onmouseover="tip('Click to sort by country population')"
           class="sortable" data-sortby="population">Population&nbsp;
      </div>
    </div>
    <div id="countriesBody"></div>
    <div id="countriesFooter" class="totalLine">
      <div style="margin-left: 5px">Countries:&nbsp;<span id="countriesFooterCountries">0</span>
      </div>
      <div style="margin-left: 20px">Burgs:&nbsp;<span id="countriesFooterBurgs">0</span></div>
      <div style="margin-left: 20px">Land Area:&nbsp;<span id="countriesFooterArea">0</span>
      </div>
      <div style="margin-left: 20px">Population:&nbsp;<span
          id="countriesFooterPopulation">0</span></div>
    </div>
    <div id="countriesBottom">
      <button id="editScaleCountries"
              onmouseover="tip('Change demographical and geographical measurements')"
              class="icon-map-signs"></button>
      <button id="countriesPercentage"
              onmouseover="tip('Toggle percentage / absolut values views')"
              class="icon-percent"></button>
      <button id="countriesRegenerate"
              onmouseover="tip('Regenerate countries based on amended Expansion values')"
              class="icon-cog-alt"></button>
      <button id="countriesManually" onmouseover="tip('Manually re-assign countries')"
              class="icon-brush"></button>
      <div id="countriesManuallyButtons" style="display: none">
        <button id="countriesManuallyComplete" onmouseover="tip('Apply assignment')"
                class="icon-check"></button>
        <button id="countriesAddM" onmouseover="tip('Proclaim a new country')"
                class="icon-flag"></button>
        <button id="countriesManuallyCancel" onmouseover="tip('Cancel assignment')"
                class="icon-cancel"></button>
        <label onmouseover="tip('Set the brush size')" class="italic">Brush size:</label>
        <input id="countriesManuallyBrush"
               oninput="tip('Brush size: '+this.value); countriesManuallyBrushNumber.value = this.value"
               type="range" min="1" max="7" value="3">
        <input id="countriesManuallyBrushNumber"
               oninput="tip('Brush size: '+this.value); countriesManuallyBrush.value = this.value"
               type="number" min="1" max="7" value="3">
      </div>
      <div id="countriesRegenerateButtons" style="display: none">
        <button id="countriesApply" onmouseover="tip('Apply assignment')"
                class="icon-check"></button>
        <button id="countriesRandomize" onmouseover="tip('Randomize countries Expansion value')"
                class="icon-shuffle"></button>
        <button id="countriesAddR" onmouseover="tip('Proclaim a new country')"
                class="icon-flag"></button>
        <label onmouseover="tip('Distance to a consider a land as neutral')" class="italic">Neutral
          distance:</label>
        <input id="countriesNeutral"
               oninput="tip('Neutral distance: '+this.value); countriesNeutralNumber.value = this.value"
               type="range" min="1" max="500" value="200">
        <input id="countriesNeutralNumber"
               oninput="tip('Neutral distance: '+this.value); countriesNeutral.value = this.value"
               type="number" min="1" max="500" value="200" style="width:42px">
      </div>
      <button id="countriesAddG" onmouseover="tip('Proclaim a new country')"
              class="icon-flag"></button>
      <button id="countriesRegenerateNames" onmouseover="tip('Regenerate countries names')"
              class="icon-arrows-cw"></button>
      <button id="countriesExport"
              onmouseover="tip('Save country-related data as a text file (.csv)')"
              class="icon-download"></button>
      <button id="burgNamesImport"
              onmouseover="tip('Load burg names from a text file. Each name should be on a new line!')"
              class="icon-upload"></button>
      <button id="removeCountries" onmouseover="tip('Remove all countries')"
              class="icon-trash"></button>
    </div>
  </div>
</template>
<script>
export default {
  name: 'CountriesEditor'
}
</script>