import * as _ from 'lodash'
import {getField, updateField} from 'vuex-map-fields'
import {round} from '../../utils'

export const DEFAULT_GLOBAL_STATE = {
  seed: null,
  params: null,
  diagram: null,
  polygons: null,
  spacing: null,
  points: [],
  heights: null,
  modules: [],
  customization: 0,
  history: [],
  historyStage: 0,
  elSelected: null,
  autoResize: true,
  graphSize: null,
  cells: [],
  land: [],
  riversData: [],
  manors: [],
  states: [],
  features: [],
  notes: [],
  queue: [],
}

export default {
  namespaced: true,
  state: DEFAULT_GLOBAL_STATE,
  getters: {
    getField,
  },
  mutations: {
    updateField,
    placePoints(state, {height, width}) {
      let sizeMod = _.round((width + height) / 1500, 2) // screen size modifier
      const spacing = _.round(7.5 * sizeMod / state.graphSize, 2) // space between points before jirrering
      const radius = state.spacing / 2 // square radius
      const jittering = radius * 0.9 // max deviation
      const jitter = () => Math.random() * 2 * jittering - jittering
      let points = []
      for (let y = radius; y < height; y += spacing) {
        for (let x = radius; x < width; x += spacing) {
          points.push([_.round(x + jitter(), 2), _.round(y + jitter(), 2)])
        }
      }
      state.spacing = spacing
      state.points = points
      state.heights = new Uint8Array(state.points.length)
    },
    calculateVoronoi(state, {voronoi, points}) {
      const diagram = voronoi(points)
      // round edges to simplify future calculations
      diagram.edges.forEach(e => {
        e[0][0] = _.round(e[0][0], 2)
        e[0][1] = _.round(e[0][1], 2)
        e[1][0] = _.round(e[1][0], 2)
        e[1][1] = _.round(e[1][1], 2)
      })
      state.diagram = diagram
      state.polygons = diagram.polygons()
    },
    detectNeighbors(state, {grid}) {
      console.time('1')
      let gridPath = '' // store grid as huge single path string
      const cells = []
      const diagramCells = state.diagram.cells
      const diagramEdges = state.diagram.edges
      console.timeEnd('1')
      console.time('2')
      state.polygons.map((i, d) => {
        const neighbors = []
        let type
        // gridPath += 'M' + i.join('L') + 'Z' // grid path
        diagramCells[d].halfedges.forEach(e => {
          const edge = diagramEdges[e]
          if (edge.left && edge.right)
            neighbors.push(edge.left.index === d ? edge.right.index : edge.left.index)
          else
            type = 'border' // polygon is on border if it has edge without opposite side polygon
        })
        cells.push({index: d, data: i.data, height: 0, type, neighbors})
      })
      console.timeEnd('2')
      console.time('3')
      state.cells = cells
      console.timeEnd('3')
      console.time('4')
      // grid.append('path').attr('d', round(gridPath, 1))
      console.timeEnd('4')
    }
  },
  actions: {},
}