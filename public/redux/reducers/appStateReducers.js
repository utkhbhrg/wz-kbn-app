/*
 * Wazuh app - App State Reducers
 * Copyright (C) 2015-2020 Wazuh, Inc.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * Find more information about this on the LICENSE file.
 */

const initialState = {
  currentAPI: '',
  showMenu: false,
  wazuhNotReadyYet: '',
  currentTab: '',
  extensions: {},
  adminMode: false,
  currentAgentData: {},
  showExploreAgentModal: false,
  showExploreAgentModalGlobal: false
};

const appStateReducers = (state = initialState, action) => {
  if (action.type === 'UPDATE_CURRENT_API') {
    return {
      ...state,
      currentAPI: action.currentAPI
    };
  }
  
  if (action.type === 'SHOW_MENU') {
    return {
      ...state,
      showMenu: action.showMenu
    };
  }

  if (action.type === 'UPDATE_WAZUH_NOT_READY_YET') {
    return {
      ...state,
      wazuhNotReadyYet: action.wazuhNotReadyYet
    };
  }

  if (action.type === 'UPDATE_WAZUH_CURRENT_TAB') {
    return {
      ...state,
      currentTab: action.currentTab
    };
  }

  if (action.type === 'UPDATE_EXTENSIONS') {
    return {
      ...state,
      extensions: action.extensions
    };
  }

  if (action.type === 'UPDATE_ADMIN_MODE') {
    return {
      ...state,
      adminMode: action.adminMode
    };
  }

  if (action.type === 'UPDATE_SELECTED_AGENT_DATA') {
    return {
      ...state,
      currentAgentData: action.currentAgentData
    };
  }


  if (action.type === 'SHOW_EXPLORE_AGENT_MODAL') {
    return {
      ...state,
      showExploreAgentModal: action.showExploreAgentModal
    };
  }


  if (action.type === 'SHOW_EXPLORE_AGENT_MODAL_GLOBAL') {
    return {
      ...state,
      showExploreAgentModalGlobal: action.showExploreAgentModalGlobal
    };
  }



  return state;
};

export default appStateReducers;
