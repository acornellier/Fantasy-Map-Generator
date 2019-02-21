<template>
<div id="markerEditor" class="dialog" style="display: none">

    <button id="markerGroup" onmouseover="tip('Change marker type')" class="icon-tags"></button>
    <div id="markerGroupSection" style="display: none">
      <select id="markerSelectGroup" onmouseover="tip('Select type for the selected marker')"
              style="width: 117px;"></select>
      <input id="markerInputGroup" placeholder="type new type name"
             onmouseover="tip('Create new type for selected marker')"
             style="display: none; width: 113px;"/>
      <i id="markerAddGroup" onmouseover="tip('Pick out selected marker into a new type')"
         class="icon-plus pointer"></i>
      <i id="markerRemoveGroup" onmouseover="tip('Remove all markers of that type')"
         class="icon-trash pointer"></i>
    </div>

    <button id="markerIconButton" onmouseover="tip('Change marker icon and edit positioning')"
            class="icon-star"></button>
    <div id="markerIconButtons" style="display: none">
      <i onmouseover="tip('Change marker icon size')" class="icon-resize-full"></i>
      <input id="markerIconSize" onmouseover="tip('Change marker icon size')" value="22"
             type="range" min="10" max="30" step="0.5" class="editRange">
      <i onmouseover="tip('Change marker horizontal shift')" class="icon-resize-horizontal"></i>
      <input id="markerIconShiftX" onmouseover="tip('Change marker horizontal shift')"
             value="50" type="number" min="0" max="100" style="width: 38px;">
      <i onmouseover="tip('Change marker vertical shift')" class="icon-resize-vertical"></i>
      <input id="markerIconShiftY" onmouseover="tip('Change marker vertical shift')" value="50"
             type="number" min="0" max="100" style="width: 38px;">
      <i onmouseover="tip('Paste custom unicode symbol to use as icon')"
         class="icon-pencil"></i>
      <input id="markerIconCustom"
             onmouseover="tip('Paste custom unicode symbol to use as icon')"
             style="width: 38px;">
      <table id="markerIconTable"></table>
      <div style="font-style: italic; color: darkgrey;">Please note icons look different in
        different browsers!
      </div>
    </div>

    <button id="markerStyleButton" onmouseover="tip('Change marker size and colors')"
            class="icon-brush"></button>
    <div id="markerStyleButtons" style="display: none">
      <i onmouseover="tip('Change marker base style')" class="icon-map-pin"></i>:
      <input id="markerSize" onmouseover="tip('Change marker size')" value="1" type="range"
             min="0.1" max="10" step="0.2" class="editRange">
      <input id="markerBase" onmouseover="tip('Change marker base color')" type="color"
             class="editColor" value="#ffffff">
      <input id="markerFill" onmouseover="tip('Change marker fill color')" type="color"
             class="editColor" value="#000000">
      <br><i onmouseover="tip('Change marker icon style')" class="icon-star"></i>:
      <input id="markerIconFill" onmouseover="tip('Change marker icon fill color')" type="color"
             class="editColor" value="#000000">
      <input id="markerIconStrokeWidth" onmouseover="tip('Change marker icon stroke width')"
             value="0" type="number" min="0" max="2" step="0.1" style="width: 40px;">
      <input id="markerIconStroke" onmouseover="tip('Change marker icon stroke color')"
             type="color" class="editColor" value="#000000">
    </div>

    <button id="markerToggleBubble" onmouseover="tip('Toggle marker bubble display')"
            class="icon-info-circled"></button>
    <button id="markerLegendButton" onmouseover="tip('Edit place legend (free text notes)')"
            class="icon-edit"></button>
    <button id="markerAdd" onmouseover="tip('Add additional marker of that type')"
            class="icon-plus"></button>
    <button id="markerRemove" onmouseover="tip('Remove the marker')"
            class="icon-trash"></button>
  </div>
</template>
<script>
export default {
    name: 'MarkerEditor'
  }
</script>