<template>
<div id="labelEditor" class="dialog" style="display: none">
  <button id="labelGroupButton" onmouseover="tip('Edit label Group')"
          class="icon-tags"></button>
  <div id="labelGroupButtons" style="display: none">
    <select id="labelGroupSelect" onmouseover="tip('Select Group for this label')"></select>
    <input id="labelGroupInput" placeholder="new group name"
           onmouseover="tip('Declare new Group for this label')"/>
    <span id="labelGroupNew" onmouseover="tip('Declare new Group for this label')"
          class="icon-plus"></span>
    <span id="labelGroupRemove" onmouseover="tip('Remove the Group with all labels')"
          class="icon-trash"></span>
  </div>

  <button id="labelTextButton" onmouseover="tip('Edit label Text')"
          class="icon-pencil"></button>
  <div id="labelTextButtons" style="display: none">
    <input id="labelText"/>
    <span id="labelTextRandom" onmouseover="tip('Generate random name')"
          class="icon-shuffle"></span>
  </div>

  <button id="labelFontButton" onmouseover="tip('Select Font for the entire Group')"
          class="icon-font"></button>
  <div id="labelFontButtons" style="display: none">
    <span id="labelExternalFont"
          onmouseover="tip('Fetch fonts by linking @font-face declaration, just populate with font name if using Google font (fonts.google.com)')"
          class="icon-plus"></span>
    <select id="labelFontSelect"
            onmouseover="tip('Select one of the default Fonts')"></select>
    <input id="labelFontInput" placeholder="link to @font-face"
           onmouseover="tip('Fetch fonts by linking @font-face declaration')"/ class="hidden">
    <i id="labelSizeIcon" class="icon-text-height"></i>
    <input id="labelSize" onmouseover="tip('Change Font size for the label Group')" value="14"
           type="number" min="1" max="100" step=".5" class="editNumber"/>
  </div>

  <button id="labelStyleButton"
          onmouseover="tip('Select text color and opacity for the label Group')"
          class="icon-brush"></button>
  <div id="labelStyleButtons" style="display: none">
    <input id="labelColor" type="color" class="editColor" value="#3e3e4b">
    <i id="labelOpacityIcon" class="icon-adjust hidden"></i>
    <input id="labelOpacity" onmouseover="tip('Change Opacity for the entire Group')"
           value="1" type="number" min="0" max="1" step="0.02" class="editNumber">
    <i id="labelShadowIcon" class="icon-clone hidden"></i>
    <input id="labelShadow" onmouseover="tip('Change Shadow for the entire Group')" value="1"
           type="number" min="0" max="1" step="0.02" disabled>
  </div>

  <button id="labelAngleButton" onmouseover="tip('Rotate the label')"
          class="icon-ccw"></button>
  <div id="labelAngleButtons" style="display: none">
    <input id="labelAngle" value="0" type="range" min="-90" max="90" step="0.2"
           class="editRange">
    <span id="labelAngleValue" class="labelValue">0°</span>
    <button id="labelCurve" onmouseover="tip('Show control points to curve the label')"
            class="icon-arc"></button>
    <button id="labelCurveCancel" onmouseover="tip('Convert curved label into a normal one')"
            class="icon-minus"></button>
  </div>

  <button id="labelLegend" onmouseover="tip('Edit free text notes (legend) for this label')"
          class="icon-edit"></button>
  <button id="labelCopy" onmouseover="tip('Copy the label')" class="icon-clone"></button>
  <button id="labelRemoveSingle" onmouseover="tip('Remove the label')"
          class="icon-trash"></button>
</div>
</template>
<script>
export default {
  name: 'LabelsEditor'
}
</script>