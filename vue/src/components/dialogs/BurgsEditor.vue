<template>
<div id="burgsEditor" class="dialog stable" style="display: none">
    <div id="burgsHeader">
      <div style="margin-left: 19px"
           onmouseover="tip('Click to sort alphabetically by burg name')"
           class="sortable alphabetically" data-sortby="burg">Burg&nbsp;
      </div>
      <div style="margin-left: 29px"
           onmouseover="tip('Click to sort alphabetically by culture name')"
           class="sortable alphabetically" data-sortby="culture">Culture&nbsp;
      </div>
      <div style="margin-left: 14px" onmouseover="tip('Click to sort by country population')"
           class="sortable" data-sortby="population">Population&nbsp;
      </div>
      <div style="margin-left: 6px" onmouseover="tip('Click to sort by country burg type')"
           class="sortable alphabetically" data-sortby="type">Type&nbsp;
      </div>
    </div>
    <div id="burgsBody"></div>
    <div id="burgsFooter" class="totalLine">
      <div onmouseover="tip('Burgs number')" style="margin-left: 4px">Burgs:&nbsp;<span
          onmouseover="tip('Burgs number')" id="burgsFooterBurgs">0</span></div>
      <div style="margin-left: 10px">Average burg: &nbsp;
        <span onmouseover="tip('Dominant culture')" class="icon-book"></span>
        <span onmouseover="tip('Dominant culture')" id="burgsFooterCulture">no</span>&nbsp;
        <span onmouseover="tip('Average burg population')" class="icon-male"></span>
        <input
            onmouseover="tip('Average burg population. Change to recalculate population for all burgs within country')"
            id="burgsFooterPopulation" type="number" min="1" max="1000000" step="100" value="0">
      </div>
    </div>
    <div id="burgsBottom">
      <button id="editScaleBurgs"
              onmouseover="tip('Change demographical and geographical measurements')"
              class="icon-map-signs"></button>
      <button id="changeCapital"
              onmouseover="tip('Click on a burg line to make it a new capital')"
              class="icon-star"></button>
      <button id="regenerateBurgNames"
              onmouseover="tip('Regenerate burg names based on assigned culture')"
              class="icon-arrows-cw"></button>
      <button id="burgAdd" onmouseover="tip('Add new burg')" class="icon-fort-awesome"></button>
      <button id="removeBurgs" onmouseover="tip('Remove all burgs')"
              class="icon-trash"></button>
    </div>
  </div>
</template>
<script>
export default {
  name: 'BurgsEditor'
}
</script>