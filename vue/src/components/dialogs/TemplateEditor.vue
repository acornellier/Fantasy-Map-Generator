<template>
<div id="templateEditor" class="dialog stable" style="display: none">
  <div id="templateTop">
    Base template:
    <select id="templateSelect" data-prev="templateCustom" onmouseover="tip('Select base template')"
            @input="selectTemplate($event)">
      <option value="templateCustom" selected>Custom</option>
      <option value="templateVolcano">Volcano</option>
      <option value="templateHighIsland">High Island</option>
      <option value="templateLowIsland">Low Island</option>
      <option value="templateContinents">Continents</option>
      <option value="templateArchipelago">Archipelago</option>
      <option value="templateAtoll">Atoll</option>
      <option value="templateMainland">Mainland</option>
      <option value="templatePeninsulas">Peninsulas</option>
    </select>
  </div>
  <div id="templateTools">
    <button id="templateMountain"
            onmouseover="tip('Mountain: high big blob. Can be placed only once and only as a first step')"
            class="noicon">M
    </button>
    <button id="templateHill" onmouseover="tip('Hill: small blob')" class="noicon">H</button>
    <button id="templatePit" onmouseover="tip('Pit: round depression')" class="noicon">P
    </button>
    <button id="templateRange" onmouseover="tip('Range: elongated elevation')" class="noicon">
      R
    </button>
    <button id="templateTrough" onmouseover="tip('Trough: elongated depression')"
            class="noicon">T
    </button>
    <button id="templateStrait" onmouseover="tip('Strait: centered vertical depression')"
            class="noicon">S
    </button>
    <button id="templateAdd" onmouseover="tip('Add or subtract value from all heights')"
            class="noicon">+
    </button>
    <button id="templateMultiply" onmouseover="tip('Multiply all heights by factor')"
            class="noicon">*
    </button>
    <button id="templateSmooth"
            onmouseover="tip('Smooth the map replacing cell heights by an average values of its neighbors')"
            class="noicon">~
    </button>
  </div>
  <div id="templateBody" data-changed=0>
    <div data-type="Mountain">Mountain
      <span onmouseover="tip('Remove step')" class="icon-trash-empty"
            onclick="this.parentNode.parentNode.removeChild(this.parentNode)"></span>
    </div>
  </div>
  <div id="templateBottom">
    <button id="templateRun" onmouseover="tip('Apply current template')"
            class="icon-play-circled2"></button>
    <button id="templateUndo" onmouseover="tip('Undo the latest action')" class="icon-ccw"
            disabled></button>
    <button id="templateRedo" onmouseover="tip('Redo the action')" class="icon-cw"
            disabled></button>
    <button id="templateComplete"
            onmouseover="tip('Finalize the Heightmap. Not allowed if insufficient land area available')"
            class="icon-check"></button>
    <button id="templateSave" onmouseover="tip('Save template')" class="icon-download"
            @click="save"></button>
    <button id="templateLoad" onmouseover="tip('Open previously saved template')"
            class="icon-upload"></button>
    <button id="templateMail"
            onclick="window.open('mailto:maxganiev@yandex.com?Subject=Template%20suggestion', '_blank')"
            onmouseover="tip('Send a template suggestion to me')"
            class="icon-mail-alt"></button>
  </div>
</div>
</template>
<script>
import * as $ from 'jquery'

export default {
  name: 'TemplateEditor',
  mounted() {
    $('#templateTools > button').on('click', function() {
      let id = this.id
      id = id.replace('template', '')
      if (id === 'Mountain') {
        const steps = $('#templateBody > div').length
        if (steps > 0) return
      }
      $('#templateBody').attr('data-changed', 1)
      $('#templateBody').append('<div data-type="' + id + '">' + id + '</div>')
      const el = $('#templateBody div:last-child')
      let count = null
      let dist = null
      if (id === 'Hill' || id === 'Pit' || id === 'Range' || id === 'Trough') {
        count = '<label>count:<input class="templateElCount" onmouseover="tip(\'Blobs to add\')" type="number" value="1" min="1" max="99"></label>'
      }
      if (id === 'Hill') {
        dist = '<label>distribution:<input class="templateElDist" onmouseover="tip(\'Set blobs distribution. 0.5 - map center; 0 - any place\')" type="number" value="0.25" min="0" max="0.5" step="0.01"></label>'
      }
      if (id === 'Add' || id === 'Multiply') {
        dist = '<label>to:' +
                   '<select class="templateElDist" onmouseover="tip(\'Change only land or all cells\')">' +
                   '<option value="all" selected>all cells</option>' +
                   '<option value="land">land only</option>' +
                   '<option value="interval">interval</option></select></label>'
      }
      if (id === 'Add') {
        count = '<label>value:<input class="templateElCount" onmouseover="tip(\'Add value to height of all cells (negative values are allowed)\')" type="number" value="-10" min="-100" max="100" step="1"></label>'
      }
      if (id === 'Multiply') {
        count = '<label>by value:<input class="templateElCount" onmouseover="tip(\'Multiply all cells Height by the value\')" type="number" value="1.1" min="0" max="10" step="0.1"></label>'
      }
      if (id === 'Smooth') {
        count = '<label>fraction:<input class="templateElCount" onmouseover="tip(\'Set smooth fraction. 1 - full smooth, 2 - half-smooth, etc.\')" type="number" min="1" max="10" value="2"></label>'
      }
      if (id === 'Strait') {
        count = '<label>width:<input class="templateElCount" onmouseover="tip(\'Set strait width\')" value="1-7"></label>'
      }
      el.append('<span onmouseover="tip(\'Remove step\')" class="icon-trash-empty"></span>')
      $('#templateBody .icon-trash-empty').on('click', function() {$(this).parent().remove()})
      if (dist) el.append(dist)
      if (count) el.append(count)
      el.find('select.templateElDist').on('input', this.fireTemplateElDist)
      $('#templateBody').attr('data-changed', 1)
    })
  },
  methods: {
    selectTemplate(event) {
      const steps = $('#templateBody > div').length
      const changed = +$('#templateBody').attr('data-changed')
      const template = event.target.value
      if (steps && changed === 1) {
        $('#alertMessage').innerHTML =
          'Are you sure you want to change the base template? All the changes will be lost.'
        $('#alert').dialog({
          resizable: false, title: 'Change Template',
          buttons: {
            Change: function() {
              this.changeTemplate(template)
              $(this).dialog('close')
            },
            Cancel: function() {
              const prev = $('#templateSelect').attr('data-prev')
              $('#templateSelect').val(prev)
              $(this).dialog('close')
            }
          }
        })
      }
      if (steps === 0 || changed === 0) this.changeTemplate(template)
    },
    save() {
      const steps = $('#templateBody > div').length
      let stepsData = ''
      for (let step = 1; step <= steps; step++) {
        const element = $('#templateBody div:nth-child(' + step + ')')
        const type = element.attr('data-type')
        let count = $('#templateBody div:nth-child(' + step + ') .templateElCount').val()
        let dist = $('#templateBody div:nth-child(' + step + ') .templateElDist').val()
        if (!count) {count = '0'}
        if (!dist) {dist = '0'}
        stepsData += type + ' ' + count + ' ' + dist + '\r\n'
      }
      const dataBlob = new Blob([stepsData], {type: 'text/plain'})
      const url = window.URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.download = 'template_' + Date.now() + '.txt'
      link.href = url
      link.click()
      $('#templateBody').attr('data-changed', 0)
    },
    load() {
      $('#templateToLoad').click()
    },
    fireTemplateElDist() {
      if (this.value === 'interval') {
        const interval = prompt(
          'Populate a height interval (e.g. from 17 to 20), without space, but with hyphen',
          '17-20')
        if (interval) {
          const option = '<option value="' + interval + '">' + interval + '</option>'
          $(this).append(option).val(interval)
        }
      }
    },
    changeTemplate(template) {
      $('#templateBody').empty()
      $('#templateSelect').attr('data-prev', template)
      if (template === 'templateVolcano') {
        this.addStep('Mountain')
        this.addStep('Add', 10)
        this.addStep('Hill', 5, 0.35)
        this.addStep('Range', 3)
        this.addStep('Trough', -4)
      }
      if (template === 'templateHighIsland') {
        this.addStep('Mountain')
        this.addStep('Add', 10)
        this.addStep('Range', 6)
        this.addStep('Hill', 12, 0.25)
        this.addStep('Trough', 3)
        this.addStep('Multiply', 0.75, 'land')
        this.addStep('Pit', 1)
        this.addStep('Hill', 3, 0.15)
      }
      if (template === 'templateLowIsland') {
        this.addStep('Mountain')
        this.addStep('Add', 10)
        this.addStep('Smooth', 2)
        this.addStep('Range', 2)
        this.addStep('Hill', 4, 0.4)
        this.addStep('Hill', 12, 0.2)
        this.addStep('Trough', 8)
        this.addStep('Multiply', 0.35, 'land')
      }
      if (template === 'templateContinents') {
        this.addStep('Mountain')
        this.addStep('Add', 10)
        this.addStep('Hill', 30, 0.25)
        this.addStep('Strait', '4-7')
        this.addStep('Pit', 10)
        this.addStep('Trough', 10)
        this.addStep('Multiply', 0.6, 'land')
        this.addStep('Smooth', 2)
        this.addStep('Range', 3)
      }
      if (template === 'templateArchipelago') {
        this.addStep('Mountain')
        this.addStep('Add', 10)
        this.addStep('Hill', 12, 0.15)
        this.addStep('Range', 8)
        this.addStep('Strait', '2-3')
        this.addStep('Trough', 15)
        this.addStep('Pit', 10)
        this.addStep('Add', -5, 'land')
        this.addStep('Multiply', 0.7, 'land')
        this.addStep('Smooth', 3)
      }
      if (template === 'templateAtoll') {
        this.addStep('Mountain')
        this.addStep('Add', 10, 'all')
        this.addStep('Hill', 2, 0.35)
        this.addStep('Range', 2)
        this.addStep('Smooth', 1)
        this.addStep('Multiply', 0.1, '27-100')
      }
      if (template === 'templateMainland') {
        this.addStep('Mountain')
        this.addStep('Add', 10, 'all')
        this.addStep('Hill', 30, 0.2)
        this.addStep('Range', 10)
        this.addStep('Pit', 20)
        this.addStep('Hill', 10, 0.15)
        this.addStep('Trough', 10)
        this.addStep('Multiply', 0.4, 'land')
        this.addStep('Range', 10)
        this.addStep('Smooth', 3)
      }
      if (template === 'templatePeninsulas') {
        this.addStep('Add', 15)
        this.addStep('Hill', 30, 0)
        this.addStep('Range', 5)
        this.addStep('Pit', 15)
        this.addStep('Strait', '15-20')
      }
      $('#templateBody').attr('data-changed', 0)
    },
    addStep(feature, count, dist) {
      if (!feature) return
      if (feature === 'Mountain') $('#templateMountain').click()
      if (feature === 'Hill') $('#templateHill').click()
      if (feature === 'Pit') $('#templatePit').click()
      if (feature === 'Range') $('#templateRange').click()
      if (feature === 'Trough') $('#templateTrough').click()
      if (feature === 'Strait') $('#templateStrait').click()
      if (feature === 'Add') $('#templateAdd').click()
      if (feature === 'Multiply') $('#templateMultiply').click()
      if (feature === 'Smooth') $('#templateSmooth').click()
      if (count) {$('#templateBody div:last-child .templateElCount').val(count)}
      if (dist !== undefined) {
        if (dist !== 'land') {
          const option = '<option value="' + dist + '">' + dist + '</option>'
          $('#templateBody div:last-child .templateElDist').append(option)
        }
        $('#templateBody div:last-child .templateElDist').val(dist)
      }
    }
  }
}
</script>