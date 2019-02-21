<template>
<div id="routeEditor" class="dialog" style="display: none">
  <button id="routeGroups" onmouseover="tip('Change path group')" class="icon-map-signs"
          onclick="$('#routeEditor').children().not(this).toggle()"></button>
  <div id="routeGroupsSelection" style="display: none">
    <select id="routeGroup" onmouseover="tip('Select a group for this route')">
      <option value="roads" selected>roads</option>
    </select>
  </div>
  <button id="routeLength">0</button>
  <button id="routeSplit" onmouseover="tip('Click on a control point to split the route')"
          class="icon-unlink" onclick="$(this).toggleClass('pressed')"></button>
  <button id="routeLegend" onmouseover="tip('Edit free text notes (legend) for the route')"
          class="icon-edit"></button>
  <button id="routeNew" onmouseover="tip('Create new route clicking on map')"
          class="icon-map-pin"></button>
  <button id="routeRemove" onmouseover="tip('Remove route')" class="icon-trash"></button>
</div>
</template>
<script>
export default {
  name: 'RouteEditor'
}
</script>