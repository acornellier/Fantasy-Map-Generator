import * as d3 from 'd3'
import * as $ from 'jquery'
import Vue from 'vue'
import FantasyMapGenerator from './components/FantasyMapGenerator.vue'
import store from './store'

Vue.config.productionTip = false

window.$ = $
window.d3 = d3
window.graphHeight = undefined
window.graphWidth = undefined
window.svgWidth = undefined
window.svgHeight = undefined

new Vue({
  store,
  render: h => h(FantasyMapGenerator)
}).$mount('#app')
