export default {
  namespaced: true,
  state: {
    graph: { height: 0, width: 0 },
    svg: { height: 0, width: 0 },
  },
  mutations: {
    setDimensions(state, {group, height, width}) {
      state[group] = {height, width}
    },
  },
  actions: {
    setAllDimensions({commit}, {height, width}) {
      commit('setDimensions', {group: 'graph', height, width})
      commit('setDimensions', {group: 'svg', height, width})
    },
  },
}