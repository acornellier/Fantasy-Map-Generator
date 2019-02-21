<template>
<div id="culturesEditor" class="dialog stable" style="display: none" data-type="absolute">
    <div id="culturesHeader">
      <div style="margin-left: 14px" onmouseover="tip('Click to sort by culture name')"
           class="sortable alphabetically" data-sortby="culture">Culture&nbsp;
      </div>
      <div style="margin-left: 16px" onmouseover="tip('Click to sort by culture cells count')"
           class="sortable" data-sortby="cells">Cells&nbsp;
      </div>
      <div style="margin-left: 18px" onmouseover="tip('Click to sort by culture area')"
           class="sortable" data-sortby="area">Area&nbsp;
      </div>
      <div style="margin-left: 30px" onmouseover="tip('Click to sort by culture population')"
           class="sortable" data-sortby="population">Population&nbsp;
      </div>
      <div style="margin-left: 3px" onmouseover="tip('Click to sort by culture namesbase')"
           class="sortable alphabetically" data-sortby="base">Namesbase&nbsp;
      </div>
    </div>
    <div id="culturesBody"></div>

    <div id="culturesFooter" class="totalLine">
      <div onmouseover="tip('Cultures number (active / total)')" style="margin-left: 7px">
        Cultures:&nbsp;<span id="culturesFooterCultures">0 / 7</span></div>
      <div onmouseover="tip('Total Land cells number')" style="margin-left: 7px">
        Cells:&nbsp;<span id="culturesFooterCells">0</span></div>
      <div onmouseover="tip('Total Land Area')" style="margin-left: 7px">Area:&nbsp;<span
          id="culturesFooterArea">0</span></div>
      <div onmouseover="tip('Total Population')" style="margin-left: 7px">Population:&nbsp;<span
          id="culturesFooterPopulation">0</span></div>
    </div>

    <div id="culturesBottom">
      <button id="culturesPercentage"
              onmouseover="tip('Toggle percentage / absolut values views')"
              class="icon-percent"></button>
      <button id="culturesManually" onmouseover="tip('Manually re-assign cultures')"
              class="icon-brush"></button>
      <div id="culturesManuallyButtons" style="display: none">
        <button id="culturesManuallyComplete" onmouseover="tip('Apply assignment')"
                class="icon-check"></button>
        <button id="culturesManuallyCancel" onmouseover="tip('Cancel assignment')"
                class="icon-cancel"></button>
        <label onmouseover="tip('Set the brush size')" class="italic">Brush size:</label>
        <input id="culturesManuallyBrush"
               oninput="tip('Brush size: '+this.value); culturesManuallyBrushNumber.value = this.value"
               type="range" min="1" max="7" value="3">
        <input id="culturesManuallyBrushNumber"
               oninput="tip('Brush size: '+this.value); culturesManuallyBrush.value = this.value"
               type="number" min="1" max="7" value="3">
      </div>
      <button id="culturesRandomize" onmouseover="tip('Randomly re-distribute cultures')"
              class="icon-shuffle"></button>
      <button id="culturesRegenerateNames"
              onmouseover="tip('Re-generate all Burg names based on assigned culture')"
              class="icon-arrows-cw"></button>
      <button id="culturesEditNamesBase"
              onmouseover="tip('Edit a database used for names generation')"
              class="icon-list-bullet"></button>
      <button id="culturesAdd" onmouseover="tip('Add a new culture')"
              class="icon-plus"></button>
      <button id="culturesExport"
              onmouseover="tip('Save cultures-related data as a text file (.csv)')"
              class="icon-download"></button>
    </div>
  </div>
</template>
<script>
export default {
  name: 'CulturesEditor'
}
</script>