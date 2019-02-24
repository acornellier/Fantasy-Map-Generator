import Vue from 'vue'
import * as d3 from 'd3'
import * as _ from 'lodash'
import {DEFAULT_CULTURES} from '../../constants'
import {colors20} from '../../utils'

const randomCenter = ({height, width}) => {
  const x = Math.floor(Math.random() * width * 0.8 + width * 0.1)
  const y = Math.floor(Math.random() * height * 0.8 + height * 0.1)
  return [x, y]
}

export default {
  namespaced: true,
  state: {
    cultures: [],
    tree: d3.quadtree(),
  },
  mutations: {
    setCultures(state, {cultures}) {
      state.cultures = cultures
    },
    recalculateTree(state) {
      state.cultureTree = d3.quadtree(state.cultures.map(c => c.center))
    },
    setCenter(state, {index, x, y}) {
      Vue.set(state.cultures, index, {...state.cultures[index], center: [x, y]})
    },
    deleteCulture(state, {index}) {
      state.cultures = state.cultures.splice(index, 1)
    },
  },
  actions: {
    generate({commit, rootState}) {
      const count = +document.getElementById('culturesInput').value
      const cultures = d3.shuffle(DEFAULT_CULTURES).slice(0, count)
      cultures.forEach(culture => culture.center = randomCenter(rootState.graphic.graph))
      commit('setCultures', {cultures})
      commit('recalculateTree')
    },
    setCenter({commit}, {index, x, y}) {
      commit('setCenter', {index, x, y})
      commit('recalculateTree')
    },
    addCulture({commit, state, rootState}, generateName) {
      let culture, base, name, color
      if (state.cultures.length < DEFAULT_CULTURES.length) {
        // add one of the default cultures
        culture = state.cultures.length
        base = DEFAULT_CULTURES[culture].base
        color = DEFAULT_CULTURES[culture].color
        name = DEFAULT_CULTURES[culture].name
      } else {
        // add random culture besed on one of the current ones
        culture = _.random(state.cultures.length - 1)
        name = generateName(culture)
        color = colors20(state.cultures.length % 20)
        base = state.cultures[culture].base
      }
      state.cultures.push({name, color, base, center: randomCenter(rootState.graphic.graph)})
      commit('recalculateTree')
    },
    deleteCulture({commit}, {index}) {
      commit('deleteCulture', {index})
      commit('recalculateTree')
    },
  },
}