import * as d3 from 'd3'
import * as $ from 'jquery'
import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

window.$ = $
window.d3 = d3
window.graphHeight = undefined
window.graphWidth = undefined
window.svgWidth = undefined
window.svgHeight = undefined

new Vue({
  render: h => h(App)
}).$mount('#app')
