import React, { Component, Fragment } from 'react';

import {
  EuiBadge,
  EuiHealth,
  EuiButton,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableFooterCell,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableHeaderCellCheckbox,
  EuiTablePagination,
  EuiTableRow,
  EuiTableRowCell,
  EuiTableRowCellCheckbox,
  EuiTableSortMobile,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiTableHeaderMobile,
  EuiButtonIcon,
  EuiIcon,
  EuiPopover,
  EuiText,
  EuiToolTip
} from '@elastic/eui';

import { WzRequest } from '../../../../react-services/wz-request';
import { LEFT_ALIGNMENT, RIGHT_ALIGNMENT, SortableProperties } from '@elastic/eui/lib/services';
import {  updateCurrentAgentData } from '../../../../redux/actions/appStateActions';
import  store  from '../../../../redux/store';
import chrome from 'ui/chrome';
import { WzFilterBar } from '../../../../components/wz-filter-bar/wz-filter-bar';
import { AgentGroupTruncate } from '../../../../components/common/util/agent-group-truncate/agent_group_truncate'


const checkField = field => {
  return field !== undefined ? field : '-';
};

export class AgentSelectionTable extends Component {
  constructor(props) {
    super(props);

    // const selectedOptions = JSON.parse(
    //   sessionStorage.getItem('agents_preview_selected_options')
    // );
    this.state = {
      itemIdToSelectedMap: {},
      itemIdToOpenActionsPopoverMap: {},
      sortedColumn: 'title',
      itemsPerPage: 10,
      pageIndex: 0,
      totalItems: 0,
      isLoading: false,
      sortDirection: 'asc',
      sortField: 'id',
      agents: [],
      selectedOptions: [],
      q: '',
      search: ''
    };

    this.columns = [
      {
        id: 'id',
        label: 'ID',
        alignment: LEFT_ALIGNMENT,
        width: '60px',
        mobileOptions: {
          show: true,
        },
        isSortable: true,
      },
      {
        id: 'name',
        label: 'Name',
        alignment: LEFT_ALIGNMENT,
        mobileOptions: {
          show: true,
        },
        isSortable: true
      },
      {
        id: 'group',
        label: 'Group',
        alignment: LEFT_ALIGNMENT,
        mobileOptions: {
          show: false,
        },
        isSortable: true,
        render: this.renderGroups
      },
      {
        id: 'version',
        label: 'Version',
        width: '80px',
        alignment: LEFT_ALIGNMENT,
        mobileOptions: {
          show: true,
        },
        isSortable: true,
      },
      {
        id: 'os',
        label: 'OS',
        alignment: LEFT_ALIGNMENT,
        mobileOptions: {
          show: false,
        },
        isSortable: true,
        render: os => this.addIconPlatformRender(os)
      },
      {
        id: 'status',
        label: 'Status',
        alignment: LEFT_ALIGNMENT,
        mobileOptions: {
          show: true,
        },
        isSortable: true,
        width: 'auto',
        render: status => this.addHealthStatusRender(status),
      },
    ];
  }

  onChangeItemsPerPage = async itemsPerPage => {
    this._isMounted && this.setState({ itemsPerPage }, async () => await this.getItems());
  };

  onChangePage = async pageIndex => {
    this._isMounted && this.setState({ pageIndex }, async () => await this.getItems());
  };

  async componentDidMount() {
    this._isMounted = true;
    const $injector = await chrome.dangerouslyGetActiveInjector();
    this.router = $injector.get('$route');
    const tmpSelectedAgents = {};
    if(!store.getState().appStateReducers.currentAgentData.id){
      tmpSelectedAgents[store.getState().appStateReducers.currentAgentData.id] = true;
    }
    this._isMounted && this.setState({itemIdToSelectedMap: this.props.selectedAgents});
    try{
      await this.getItems();
      const filterStatus = this.filterBarModelStatus();
      const filterGroups = await this.filterBarModelGroups();
      const filterOs = await this.filterBarModelOs();
      const filterVersion = await this.filterBarModelWazuhVersion();
      const filterOsPlatform = await this.filterBarModelOsPlatform();
      const filterNodes = await this.filterBarModelNodes();
      this._isMounted && this.setState({
        filterStatus,
        filterGroups,
        filterOs,
        filterVersion,
        filterOsPlatform,
        filterNodes
      });
    }catch(error){}
  }

  componentWillUnmount(){
    this._isMounted = false;
  }

  getArrayFormatted(arrayText) {
    try {
      const stringText = arrayText.toString();
      const splitString = stringText.split(',');
      const resultString = splitString.join(', ');
      return resultString;
    } catch (err) {
      return arrayText;
    }
  }

  async getItems() {
    try{
      this._isMounted && this.setState({isLoading: true});
      const rawData = await WzRequest.apiReq('GET', '/agents', this.buildFilter());
      const data = (((rawData || {}).data || {}).data || {}).items;
      const totalItems = (((rawData || {}).data || {}).data || {}).totalItems;
      const formattedData = data.map((item, id) => {
        return {
          id: item.id,
          name: item.name,
          version: item.version !== undefined ? item.version.split(' ')[1] : '-',
          os: item.os || '-',
          status: item.status,
          group: item.group || '-',
        };
      });
      this._isMounted && this.setState({ agents: formattedData, totalItems, isLoading: false });
    }catch(err){
      this._isMounted && this.setState({ isLoading: false });
    }
  }

  agentStatusColor(status){
    if (status.toLowerCase() === 'active') {
      return 'success';
    } else if (status.toLowerCase() === 'disconnected') {
      return 'danger';
    } else if (status.toLowerCase() === 'never connected') {
      return 'subdued';
    }
  }

  agentStatusBadgeColor(status){
    if (status.toLowerCase() === 'active') {
      return 'secondary';
    } else if (status.toLowerCase() === 'disconnected') {
      return 'danger';
    } else if (status.toLowerCase() === 'never connected') {
      return 'default';
    }
  }

  addHealthStatusRender(status) {
    return (
      <EuiHealth color={this.agentStatusColor(status)} style={{ whiteSpace: 'no-wrap' }}>
        {status}
      </EuiHealth>
    );
  }

  buildFilter() {
    const { itemsPerPage, pageIndex, search, q } = this.state;
    const filter = {
      q: `id!=000${q ? `;${q}` : ''}`,
      offset: pageIndex * itemsPerPage,
      limit: pageIndex * itemsPerPage + itemsPerPage,
      ...this.buildSortFilter(),
    };
    if (search) {
      filter['search'] = search;
    }
    return filter;
  }

  buildSortFilter() {
    const { sortDirection, sortField } = this.state;
    const sortFilter = {};
    if (sortField) {
      const direction = sortDirection === 'asc' ? '+' : '-';
      sortFilter['sort'] = direction + sortField;
    }

    return sortFilter;
  }

  onSort = async prop => {
    const sortField = prop;
    const sortDirection =
      this.state.sortField === prop && this.state.sortDirection === 'asc'
        ? 'desc'
        : this.state.sortDirection === 'asc'
        ? 'desc'
        : 'asc';

    this._isMounted && this.setState({ sortField, sortDirection }, async () => await this.getItems());
  };

  toggleItem = itemId => {
    this._isMounted && this.setState(previousState => {
      const newItemIdToSelectedMap = {
        [itemId]: !previousState.itemIdToSelectedMap[itemId],
      };

      return {
        itemIdToSelectedMap: newItemIdToSelectedMap,
      };
    });
  };

  toggleAll = () => {
    const allSelected = this.areAllItemsSelected();
    const newItemIdToSelectedMap = {};
    this.state.agents.forEach(item => (newItemIdToSelectedMap[item.id] = !allSelected));
    this._isMounted && this.setState({
      itemIdToSelectedMap: newItemIdToSelectedMap,
    });
  };

  isItemSelected = itemId => {
    return this.state.itemIdToSelectedMap[itemId];
  };

  areAllItemsSelected = () => {
    const indexOfUnselectedItem = this.state.agents.findIndex(item => !this.isItemSelected(item.id));
    return indexOfUnselectedItem === -1;
  };

  areAnyRowsSelected = () => {
    return (
      Object.keys(this.state.itemIdToSelectedMap).findIndex(id => {
        return this.state.itemIdToSelectedMap[id];
      }) !== -1
    );
  };

  togglePopover = itemId => {
    this._isMounted && this.setState(previousState => {
      const newItemIdToOpenActionsPopoverMap = {
        ...previousState.itemIdToOpenActionsPopoverMap,
        [itemId]: !previousState.itemIdToOpenActionsPopoverMap[itemId],
      };

      return {
        itemIdToOpenActionsPopoverMap: newItemIdToOpenActionsPopoverMap,
      };
    });
  };

  closePopover = itemId => {
    // only update the state if this item's popover is open
    if (this.isPopoverOpen(itemId)) {
      this._isMounted && this.setState(previousState => {
        const newItemIdToOpenActionsPopoverMap = {
          ...previousState.itemIdToOpenActionsPopoverMap,
          [itemId]: false,
        };

        return {
          itemIdToOpenActionsPopoverMap: newItemIdToOpenActionsPopoverMap,
        };
      });
    }
  };

  isPopoverOpen = itemId => {
    return this.state.itemIdToOpenActionsPopoverMap[itemId];
  };

  renderSelectAll = mobile => {
    if (!this.state.isLoading && this.state.agents.length) {
      return (
        <EuiCheckbox
          id="selectAllCheckbox"
          label={mobile ? 'Select all' : null}
          checked={this.areAllItemsSelected()}
          onChange={this.toggleAll.bind(this)}
          type={mobile ? null : 'inList'}
        />
      );
    }
  };

  getTableMobileSortItems() {
    const items = [];
    this.columns.forEach(column => {
      if (column.isCheckbox || !column.isSortable) {
        return;
      }
      items.push({
        name: column.label,
        key: column.id,
        onSort: this.onSort.bind(this, column.id),
        isSorted: this.state.sortField === column.id,
        isSortAscending: this.state.sortDirection === 'asc',
      });
    });
    return items.length ? items : null;
  }

  renderHeaderCells() {
    const headers = [];

    this.columns.forEach((column, columnIndex) => {
      if (column.isCheckbox) {
        headers.push(
          <EuiTableHeaderCellCheckbox key={column.id} width={column.width}>
          </EuiTableHeaderCellCheckbox>
        );
      } else {
        headers.push(
          <EuiTableHeaderCell
            key={column.id}
            align={this.columns[columnIndex].alignment}
            width={column.width}
            onSort={column.isSortable ? this.onSort.bind(this, column.id) : undefined}
            isSorted={this.state.sortField === column.id}
            isSortAscending={this.state.sortDirection === 'asc'}
            mobileOptions={column.mobileOptions}
          >
            {column.label}
          </EuiTableHeaderCell>
        );
      }
    });
    return headers.length ? headers : null;
  }

  renderRows() {
    const renderRow = item => {
      const cells = this.columns.map(column => {
        const cell = item[column.id];

        let child;

        if (column.isCheckbox) {
          return (
            <EuiTableRowCellCheckbox key={column.id}>
              <EuiCheckbox
                id={`${item.id}-checkbox`}
                checked={this.isItemSelected(item.id)}
                onChange={() => {}}
                type="inList"
              />
            </EuiTableRowCellCheckbox>
          );
        }

        if (column.render) {
          child = column.render(item[column.id]);
        } else {
          child = cell;
        }

        return (
          <EuiTableRowCell
            key={column.id}
            align={column.alignment}
            truncateText={cell && cell.truncateText}
            textOnly={cell ? cell.textOnly : true}
            mobileOptions={{
              header: column.label,
              ...column.mobileOptions,
            }}
          >
            {child}
          </EuiTableRowCell>
        );
      });

      return (
        <EuiTableRow
          key={item.id}
          isSelected={this.isItemSelected(item.id)}
          isSelectable={true}
          onClick={async () => await this.selectAgentAndApply(item.id)}
          hasActions={true}
        >
          {cells}
        </EuiTableRow>
      );
    };

    const rows = [];

    for (
      let itemIndex = (this.state.pageIndex * this.state.itemsPerPage) % this.state.itemsPerPage;
      itemIndex <
        ((this.state.pageIndex * this.state.itemsPerPage) % this.state.itemsPerPage) +
          this.state.itemsPerPage && this.state.agents[itemIndex];
      itemIndex++
    ) {
      const item = this.state.agents[itemIndex];
      rows.push(renderRow(item));
    }

    return rows;
  }

  renderFooterCells() {
    const footers = [];

    const items = this.state.agents;
    const pagination = {
      pageIndex: this.state.pageIndex,
      pageSize: this.state.itemsPerPage,
      totalItemCount: this.state.totalItems,
    };

    this.columns.forEach(column => {
      const footer = this.getColumnFooter(column, { items, pagination });
      if (column.mobileOptions && column.mobileOptions.only) {
        return; // exclude columns that only exist for mobile headers
      }

      if (footer) {
        footers.push(
          <EuiTableFooterCell key={`footer_${column.id}`} align={column.alignment}>
            {footer}
          </EuiTableFooterCell>
        );
      } else {
        footers.push(
          <EuiTableFooterCell key={`footer_empty_${footers.length - 1}`} align={column.alignment}>
            {undefined}
          </EuiTableFooterCell>
        );
      }
    });
    return footers;
  }

  getColumnFooter = (column, { items, pagination }) => {
    if (column.footer === null) {
      return null;
    }
    if (column.footer) {
      return column.footer;
    }

    return undefined;
  };

  async onQueryChange(result){
    // sessionStorage.setItem(
    //   'agents_preview_selected_options',
    //   JSON.stringify(result.selectedOptions)
    // );
    this._isMounted && this.setState({ isLoading: true, ...result}, async () => {
      try{
        await this.getItems()
      }catch(error){
        this._isMounted && this.setState({ isLoading: false});
      }
    });
  }

  getSelectedItems(){
    return Object.keys(this.state.itemIdToSelectedMap).filter(x => {
      return (this.state.itemIdToSelectedMap[x] === true)
    })
  }

  unselectAgents(){
    this._isMounted && this.setState({itemIdToSelectedMap: {}});
    this.props.removeAgentsFilter(true);      
    store.dispatch(updateCurrentAgentData({}));
  }

  getSelectedCount(){
    return this.getSelectedItems().length;
  }

  async newSearch(){
    if(this.areAnyRowsSelected()){
      const data = await WzRequest.apiReq('GET', '/agents', {"q" : "id="+this.getSelectedItems()[0]  } );
      const formattedData = data.data.data.items[0] //TODO: do it correctly
      store.dispatch(updateCurrentAgentData(formattedData));
      this.props.updateAgentSearch(this.getSelectedItems());
    }else{
      store.dispatch(updateCurrentAgentData({}));
      this.props.removeAgentsFilter(true);      
    }
  }

  async selectAgentAndApply(agentID){
    try{
      const data = await WzRequest.apiReq('GET', '/agents', {"q" : "id="+agentID } );
      const formattedData = data.data.data.items[0] //TODO: do it correctly
      store.dispatch(updateCurrentAgentData(formattedData));
      this.props.updateAgentSearch([agentID]);
    }catch(error){
      store.dispatch(updateCurrentAgentData({}));
      this.props.removeAgentsFilter(true);      
    }
  }

  showContextMenu(id){
    this._isMounted && this.setState({contextMenuId: id})
  }

  addIconPlatformRender(os) {
    if(typeof os === "string" ){ return os};
    let icon = false;

    if (((os || {}).uname || '').includes('Linux')) {
      icon = 'linux';
    } else if ((os || {}).platform === 'windows') {
      icon = 'windows';
    } else if ((os || {}).platform === 'darwin') {
      icon = 'apple';
    }
    const os_name =
      checkField((os || {}).name) +
      ' ' +
      checkField((os || {}).version);
    return (
      <span className="euiTableCellContent__text euiTableCellContent--truncateText">
        <i
          className={`fa fa-${icon} AgentsTable__soBadge AgentsTable__soBadge--${icon}`}
          aria-hidden="true"
        ></i>{' '}
        {os_name === '--' ? '-' : os_name}
      </span>
    );
  }

  renderGroups(groups){
    return Array.isArray(groups) ? (
      <AgentGroupTruncate groups={groups} length={25} label={'more'}/>
    ) : groups
  }
  
  filterBarModelStatus() {
    return {
      label: 'Status',
      options: [
        {
          label: 'Active',
          group: 'status'
        },
        {
          label: 'Disconnected',
          group: 'status'
        },
        {
          label: 'Never connected',
          group: 'status'
        }
      ]
    };
  }

  async filterBarModelGroups() {
    const rawGroups = await WzRequest.apiReq('GET', '/agents/groups', {});
    const itemsGroups = (((rawGroups || {}).data || {}).data || {}).items;
    const groups = itemsGroups
      .filter(item => {
        return item.count > 0;
      })
      .map(item => {
        return { label: item.name, group: 'group' };
      });
    return {
      label: 'Groups',
      options: groups
    };
  }

  async filterBarModelOs() {
    const rawOs = await WzRequest.apiReq(
      'GET',
      '/agents/stats/distinct?pretty',
      {
        fields: 'os.name,os.version',
        q: 'id!=000'
      }
    );
    const itemsOs = (((rawOs || {}).data || {}).data || {}).items;
    const os = itemsOs
      .filter(item => {
        return Object.keys(item).includes('os');
      })
      .map(item => {
        const { name, version } = item.os;
        return {
          label: `${name}-${version}`,
          group: 'osname',
          query: `os.name=${name};os.version=${version}`
        };
      });
    return {
      label: 'OS Name',
      options: os
    };
  }

  async filterBarModelOsPlatform() {
    const rawOsPlatform = await WzRequest.apiReq(
      'GET',
      '/agents/stats/distinct?pretty',
      {
        fields: 'os.platform',
        q: 'id!=000'
      }
    );
    const itemsOsPlatform = (((rawOsPlatform || {}).data || {}).data || {})
      .items;
    const osPlatform = itemsOsPlatform
      .filter(item => {
        return Object.keys(item).includes('os');
      })
      .map(item => {
        const { platform } = item.os;
        return {
          label: platform,
          group: 'osplatform',
          query: `os.platform=${platform}`
        };
      });
    return {
      label: 'OS Platform',
      options: osPlatform
    };
  }

  async filterBarModelNodes() {
    const rawNodes = await WzRequest.apiReq(
      'GET',
      '/agents/stats/distinct?pretty',
      {
        fields: 'node_name',
        q: 'id!=000;node_name!=unknown'
      }
    );
    const itemsNodes = (((rawNodes || {}).data || {}).data || {}).items;
    const nodes = itemsNodes
      .filter(item => {
        return Object.keys(item).includes('node_name');
      })
      .map(item => {
        const { node_name } = item;
        return {
          label: node_name,
          group: 'nodename',
          query: `node_name=${node_name}`
        };
      });
    return {
      label: 'Nodes',
      options: nodes
    };
  }

  async filterBarModelWazuhVersion() {
    const rawVersions = await WzRequest.apiReq(
      'GET',
      '/agents/stats/distinct?pretty',
      {
        fields: 'version',
        q: 'id!=000'
      }
    );
    const itemsVersions = (((rawVersions || {}).data || {}).data || {}).items;
    const versions = itemsVersions
      .filter(item => {
        return Object.keys(item).includes('version');
      })
      .map(item => {
        return {
          label: item.version,
          group: 'version'
        };
      });
    return {
      label: 'Version',
      options: versions
    };
  }

  render() {
    const pagination = {
      pageIndex: this.state.pageIndex,
      pageSize: this.state.itemsPerPage,
      totalItemCount: this.state.totalItems,
      pageCount:
        this.state.totalItems % this.state.itemsPerPage === 0
          ? this.state.totalItems / this.state.itemsPerPage
          : parseInt(this.state.totalItems / this.state.itemsPerPage) + 1,
    };
    const selectedAgent = store.getState().appStateReducers.currentAgentData;

    const {
      filterStatus,
      filterGroups,
      filterOs,
      filterVersion,
      filterOsPlatform,
      filterNodes,
      selectedOptions
    } = this.state;
    const model = [
      filterStatus || { label: 'Status', options: [] },
      filterGroups || { label: 'Groups', options: [] },
      filterOs || { label: 'OS Name', options: [] },
      filterOsPlatform || { label: 'OS Platform', options: [] },
      filterVersion || { label: 'Version', options: [] },
      filterNodes || { label: 'Nodes', options: [] }
    ];

    return (
      <div>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <WzFilterBar
              model={model}
              clickAction={(e) => this.onQueryChange(e)}
              selectedOptions={selectedOptions}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {selectedAgent && Object.keys(selectedAgent).length > 0 && (
          <Fragment>
            <EuiFlexGroup responsive={false} justifyContent="flexEnd">
              {/* agent name (agent id) Unpin button right aligned, require justifyContent="flexEnd" in the EuiFlexGroup */}
              <EuiFlexItem grow={false} style={{marginRight: 0}}>
                <EuiHealth color={this.agentStatusColor(selectedAgent.status)} style={{ whiteSpace: 'no-wrap' }}>
                  {selectedAgent.name} ({selectedAgent.id})
                </EuiHealth>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{marginTop: 10, marginLeft: 4}}>
                <EuiToolTip position='top' content='Unpin agent'>
                  <EuiButtonIcon
                    color='danger'
                    onClick={() => this.unselectAgents()}
                    iconType="pinFilled"
                    aria-label="unpin agent"
                  />
                </EuiToolTip> 
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </Fragment>
        )}

        <EuiTableHeaderMobile>
          <EuiFlexGroup responsive={false} justifyContent="spaceBetween" alignItems="baseline">
            <EuiFlexItem grow={false}></EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTableSortMobile items={this.getTableMobileSortItems()} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiTableHeaderMobile>

        <EuiTable>
          <EuiTableHeader>{this.renderHeaderCells()}</EuiTableHeader>
          {(this.state.agents.length && (
            <EuiTableBody className={this.state.isLoading ? 'agent-selection-table-loading' : ''}>
              {this.renderRows()}
            </EuiTableBody>
          )) || (
            <EuiTableBody className={this.state.isLoading ? 'agent-selection-table-loading' : ''}>
              <EuiTableRow key={0}>
                <EuiTableRowCell colSpan="10" isMobileFullWidth={true} align="center">
                  {this.state.isLoading ? 'Loading agents' : 'No results found'}
                </EuiTableRowCell>
              </EuiTableRow>
            </EuiTableBody>
          )}
        </EuiTable>

        <EuiSpacer size="m" />

        <EuiTablePagination
          activePage={pagination.pageIndex}
          itemsPerPage={pagination.pageSize}
          itemsPerPageOptions={[10]}
          pageCount={pagination.pageCount}
          onChangeItemsPerPage={this.onChangeItemsPerPage}
          onChangePage={this.onChangePage}
        />
      </div>
    );
  }
}